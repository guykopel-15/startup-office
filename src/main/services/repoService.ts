import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { createLogger } from '../../shared/logger';
import { IDLE_REPO_STATUS, RepoErrorCode, RepoState, parseGitHubUrl } from '../../shared/repo';
import { ServiceError } from '../../shared/response';

import type { GitHubRepoRef, RepoStatus } from '../../shared/repo';

export type StatusListener = (status: RepoStatus) => void;

/** Runs a git command; injected so tests never touch the real binary. */
export type GitRunner = (args: readonly string[], cwd: string | undefined, onOutputLine: (line: string) => void) => Promise<void>;

const logger = createLogger('repo');
const GIT_BINARY = 'git';
const CLONE_DEPTH = '1';
const REPOS_DIRECTORY = 'repos';
const OWNER_NAME_SEPARATOR = '__';
const ENOENT = 'ENOENT';
const LINE_SPLIT = /\r?\n|\r/;
const MAX_MESSAGE_LENGTH = 200;
const INVALID_URL_MESSAGE = 'Paste a GitHub repository URL like https://github.com/owner/repo';
const GIT_NOT_FOUND_MESSAGE = 'git is not installed or not on PATH';
const BUSY_MESSAGE = 'A repository is already being cloned';

/** Spawns git without a shell; every output line is forwarded as progress. */
export const runGit: GitRunner = (args, cwd, onOutputLine): Promise<void> =>
  new Promise<void>((resolve: () => void, reject: (error: Error) => void): void => {
    const child = spawn(GIT_BINARY, [...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let lastLines = '';
    const handleData = (chunk: Buffer): void => {
      const text = chunk.toString();
      lastLines = `${lastLines}${text}`.slice(-MAX_MESSAGE_LENGTH * 2);
      text
        .split(LINE_SPLIT)
        .filter((line: string): boolean => line.trim().length > 0)
        .forEach(onOutputLine);
    };
    child.stdout?.on('data', handleData);
    child.stderr?.on('data', handleData);
    child.on('error', (error: NodeJS.ErrnoException): void => {
      if (error.code === ENOENT) return reject(new ServiceError(RepoErrorCode.GitNotFound, GIT_NOT_FOUND_MESSAGE));
      reject(new ServiceError(RepoErrorCode.CloneFailed, error.message));
    });
    child.on('close', (code: number | null): void => {
      if (code === 0) return resolve();
      reject(new ServiceError(RepoErrorCode.CloneFailed, lastLines.trim().slice(-MAX_MESSAGE_LENGTH) || `git exited with code ${String(code)}`));
    });
  });

async function directoryExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Clones GitHub repositories into `<userData>/repos` and reports status changes. */
export class RepoService {
  private status: RepoStatus = IDLE_REPO_STATUS;
  private readonly listeners = new Set<StatusListener>();
  private readonly reposRoot: string;
  private readonly git: GitRunner;

  constructor(userDataPath: string, git: GitRunner = runGit) {
    this.reposRoot = join(userDataPath, REPOS_DIRECTORY);
    this.git = git;
  }

  getStatus(): RepoStatus {
    return this.status;
  }

  onStatus(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return (): void => {
      this.listeners.delete(listener);
    };
  }

  /** Clones `url`, or refreshes it when the clone already exists. Throws a ServiceError on failure. */
  async load(url: string): Promise<RepoStatus> {
    const ref = parseGitHubUrl(url);
    if (ref === null) throw new ServiceError(RepoErrorCode.InvalidUrl, INVALID_URL_MESSAGE);
    if (this.status.state === RepoState.Cloning) throw new ServiceError(RepoErrorCode.Busy, BUSY_MESSAGE);
    const path = this.clonePathFor(ref);
    this.publish({ state: RepoState.Cloning, url: ref.cloneUrl, fullName: `${ref.owner}/${ref.name}`, path: null, message: null });
    try {
      await this.cloneOrRefresh(ref, path);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('repo load failed', { url: ref.cloneUrl, message });
      this.publish({ ...this.status, state: RepoState.Error, message });
      throw error;
    }
    this.publish({ ...this.status, state: RepoState.Ready, path, message: null });
    return this.status;
  }

  private clonePathFor(ref: GitHubRepoRef): string {
    return join(this.reposRoot, `${ref.owner}${OWNER_NAME_SEPARATOR}${ref.name}`);
  }

  private async cloneOrRefresh(ref: GitHubRepoRef, path: string): Promise<void> {
    await mkdir(this.reposRoot, { recursive: true });
    const handleLine = (line: string): void => this.publish({ ...this.status, message: line.slice(0, MAX_MESSAGE_LENGTH) });
    if (await directoryExists(join(path, '.git'))) {
      await this.git(['pull', '--ff-only'], path, handleLine);
      return;
    }
    await this.git(['clone', '--depth', CLONE_DEPTH, '--progress', ref.cloneUrl, path], undefined, handleLine);
  }

  private publish(status: RepoStatus): void {
    this.status = status;
    this.listeners.forEach((listener: StatusListener): void => listener(status));
  }
}
