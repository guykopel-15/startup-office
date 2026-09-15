import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';

import { AgentErrorCode, MAX_TURNS, RUN_TIMEOUT_MS, RunMode } from '../../shared/agents';
import { createLogger } from '../../shared/logger';
import { ServiceError } from '../../shared/response';
import { parseStreamLine } from './claudeStream';
import { LineSplitter } from './gitRunner';

import type { ChildProcess } from 'node:child_process';
import type { ClaudeAvailability, StartRunInput } from '../../shared/agents';
import type { StreamItem } from './claudeStream';

/** A running `claude` session: resolves when the process exits; `cancel` kills it. */
export interface RunningClaude {
  finished: Promise<number | null>;
  cancel: () => void;
}

/** Spawns claude for a run; injected into AgentService so tests never touch the binary. */
export type ClaudeRunner = (input: StartRunInput, binary: string, onItem: (item: StreamItem) => void) => RunningClaude;

const logger = createLogger('claude');
const BINARY_NAME = 'claude';
const VERSION_ARGUMENT = '--version';
const VERSION_TIMEOUT_MS = 10000;
const KILL_SIGNAL = 'SIGTERM';
const ENOENT = 'ENOENT';
const NOT_FOUND_MESSAGE = 'Claude Code (`claude`) was not found. Install it and log in, then restart Startup Office.';
const READ_ONLY_TOOLS: readonly string[] = ['Read', 'Grep', 'Glob'];
const EDIT_TOOLS: readonly string[] = ['Read', 'Grep', 'Glob', 'Edit', 'Write', 'MultiEdit'];
export const FALLBACK_LOCATIONS: readonly string[] = [join(homedir(), '.claude', 'local', 'claude'), join(homedir(), '.local', 'bin', 'claude'), '/opt/homebrew/bin/claude', '/usr/local/bin/claude'];

const runningChildren = new Set<ChildProcess>();

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Finds the claude binary: an explicit override, then PATH, then the usual install locations. */
export async function resolveClaudeBinary(override: string | undefined, pathVariable: string | undefined, fallbackLocations: readonly string[] = FALLBACK_LOCATIONS): Promise<string | null> {
  if (override !== undefined && (await isExecutable(override))) return override;
  const pathEntries = (pathVariable ?? '').split(delimiter).filter((entry: string): boolean => entry.length > 0);
  const candidates = [...pathEntries.map((entry: string): string => join(entry, BINARY_NAME)), ...fallbackLocations];
  for (const candidate of candidates) {
    if (await isExecutable(candidate)) return candidate;
  }
  return null;
}

/** Runs `claude --version` to prove the binary works and is on this machine. */
export function checkClaude(binary: string | null): Promise<ClaudeAvailability> {
  if (binary === null) return Promise.resolve({ isAvailable: false, version: null, path: null, error: NOT_FOUND_MESSAGE });
  return new Promise<ClaudeAvailability>((resolve: (availability: ClaudeAvailability) => void): void => {
    const child = spawn(binary, [VERSION_ARGUMENT], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const timer = setTimeout((): void => {
      child.kill(KILL_SIGNAL);
    }, VERSION_TIMEOUT_MS);
    child.stdout?.on('data', (chunk: Buffer): void => {
      output = `${output}${chunk.toString()}`;
    });
    child.on('error', (error: NodeJS.ErrnoException): void => {
      clearTimeout(timer);
      resolve({ isAvailable: false, version: null, path: binary, error: error.code === ENOENT ? NOT_FOUND_MESSAGE : error.message });
    });
    child.on('close', (code: number | null): void => {
      clearTimeout(timer);
      const version = output.trim();
      resolve(code === 0 ? { isAvailable: true, version, path: binary, error: null } : { isAvailable: false, version: null, path: binary, error: `claude --version exited with ${String(code)}` });
    });
  });
}

/** Kills every claude session still running; called when the app quits. */
export function killRunningClaude(): void {
  runningChildren.forEach((child: ChildProcess): void => {
    child.kill(KILL_SIGNAL);
  });
  runningChildren.clear();
}

export function buildClaudeArguments(input: StartRunInput): string[] {
  const tools = input.mode === RunMode.Edit ? EDIT_TOOLS : READ_ONLY_TOOLS;
  const permissionMode = input.mode === RunMode.Edit ? 'acceptEdits' : 'default';
  return ['-p', input.prompt, '--output-format', 'stream-json', '--verbose', '--max-turns', String(MAX_TURNS), '--permission-mode', permissionMode, '--allowedTools', ...tools];
}

/** Spawns claude without a shell in the repo folder and streams parsed items. */
export const runClaude: ClaudeRunner = (input, binary, onItem): RunningClaude => {
  const child = spawn(binary, buildClaudeArguments(input), { cwd: input.cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  runningChildren.add(child);
  const splitter = new LineSplitter();
  const handleData = (chunk: Buffer): void => splitter.push(chunk.toString(), (line: string): void => parseStreamLine(line).forEach(onItem));
  child.stdout?.on('data', handleData);
  const timer = setTimeout((): void => {
    logger.warn('claude run timed out, killing', { figureId: input.figureId });
    child.kill(KILL_SIGNAL);
  }, RUN_TIMEOUT_MS);
  const finished = new Promise<number | null>((resolve: (code: number | null) => void, reject: (error: Error) => void): void => {
    child.on('error', (error: NodeJS.ErrnoException): void => {
      clearTimeout(timer);
      runningChildren.delete(child);
      reject(error.code === ENOENT ? new ServiceError(AgentErrorCode.ClaudeNotFound, NOT_FOUND_MESSAGE) : new ServiceError(AgentErrorCode.Failed, error.message));
    });
    child.on('close', (code: number | null): void => {
      clearTimeout(timer);
      runningChildren.delete(child);
      splitter.finish((line: string): void => parseStreamLine(line).forEach(onItem));
      resolve(code);
    });
  });
  return {
    finished,
    cancel: (): void => {
      child.kill(KILL_SIGNAL);
    },
  };
};
