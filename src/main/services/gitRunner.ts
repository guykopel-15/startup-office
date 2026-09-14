import { spawn } from 'node:child_process';

import { RepoErrorCode } from '../../shared/repo';
import { ServiceError } from '../../shared/response';

import type { ChildProcess } from 'node:child_process';

/** Runs a git command; injected into RepoService so tests never touch the real binary. */
export type GitRunner = (gitArguments: readonly string[], workingDirectory: string | undefined, onOutputLine: (line: string) => void) => Promise<void>;

const GIT_BINARY = 'git';
const ENOENT = 'ENOENT';
const LINE_SEPARATOR = /\r?\n|\r/;
const SUCCESS_EXIT_CODE = 0;
const KILL_SIGNAL = 'SIGKILL';
const GIT_NOT_FOUND_MESSAGE = 'git is not installed or not on PATH';
const TIMEOUT_MESSAGE = 'git took too long and was stopped';
export const GIT_TIMEOUT_MS = 5 * 60 * 1000;
/** Never let git prompt for credentials on a terminal the user cannot see. */
const GIT_ENVIRONMENT: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: '' };

const runningChildren = new Set<ChildProcess>();

/** Kills every git process still running; called when the app quits. */
export function killRunningGit(): void {
  runningChildren.forEach((child: ChildProcess): void => {
    child.kill(KILL_SIGNAL);
  });
  runningChildren.clear();
}

/** Splits streamed chunks into whole lines, keeping a partial line until its separator arrives. */
export class LineSplitter {
  private partial = '';
  private lastLine = '';

  push(chunk: string, onLine: (line: string) => void): void {
    const pieces = `${this.partial}${chunk}`.split(LINE_SEPARATOR);
    this.partial = pieces.pop() ?? '';
    pieces.filter((line: string): boolean => line.trim().length > 0).forEach((line: string): void => {
      this.lastLine = line;
      onLine(line);
    });
  }

  /** Flushes the trailing partial line and returns the last non-empty line seen. */
  finish(onLine: (line: string) => void): string {
    if (this.partial.trim().length > 0) {
      this.lastLine = this.partial;
      onLine(this.partial);
    }
    this.partial = '';
    return this.lastLine;
  }
}

function exitError(code: number | null, lastLine: string): ServiceError {
  return new ServiceError(RepoErrorCode.CloneFailed, lastLine.trim() || `git exited with code ${String(code)}`);
}

/** Spawns git without a shell and with prompts disabled; every complete output line is forwarded. */
export const runGit: GitRunner = (gitArguments, workingDirectory, onOutputLine): Promise<void> =>
  new Promise<void>((resolve: () => void, reject: (error: Error) => void): void => {
    const child = spawn(GIT_BINARY, [...gitArguments], { cwd: workingDirectory, env: GIT_ENVIRONMENT, stdio: ['ignore', 'pipe', 'pipe'] });
    runningChildren.add(child);
    const splitter = new LineSplitter();
    const timer = setTimeout((): void => {
      child.kill(KILL_SIGNAL);
      settle(new ServiceError(RepoErrorCode.Timeout, TIMEOUT_MESSAGE));
    }, GIT_TIMEOUT_MS);
    const settle = (error: Error | null): void => {
      clearTimeout(timer);
      runningChildren.delete(child);
      if (error === null) return resolve();
      reject(error);
    };
    const handleData = (chunk: Buffer): void => splitter.push(chunk.toString(), onOutputLine);
    child.stdout?.on('data', handleData);
    child.stderr?.on('data', handleData);
    child.on('error', (error: NodeJS.ErrnoException): void => {
      settle(error.code === ENOENT ? new ServiceError(RepoErrorCode.GitNotFound, GIT_NOT_FOUND_MESSAGE) : new ServiceError(RepoErrorCode.CloneFailed, error.message));
    });
    child.on('close', (code: number | null): void => {
      const lastLine = splitter.finish(onOutputLine);
      settle(code === SUCCESS_EXIT_CODE ? null : exitError(code, lastLine));
    });
  });
