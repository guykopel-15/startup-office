import { mkdir, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, isAbsolute, join, resolve } from 'node:path';

import { createLogger } from '../../shared/logger';
import { IDLE_REPO_STATUS, RepoErrorCode, RepoState, parseGitHubUrl } from '../../shared/repo';
import { ServiceError } from '../../shared/response';
import { runGit } from './gitRunner';

import type { GitHubRepoRef, RepoStatus, RepoStatusEvent } from '../../shared/repo';
import type { GitRunner } from './gitRunner';

export type StatusListener = (event: RepoStatusEvent) => void;

const logger = createLogger('repo');
const REPOS_DIRECTORY = 'repos';
const GIT_DIRECTORY = '.git';
const OWNER_NAME_SEPARATOR = '__';
const CLONE_DEPTH = '1';
const GIT_PULL_ARGUMENTS: readonly string[] = ['pull', '--ff-only'];
const GIT_CLONE_ARGUMENTS: readonly string[] = ['clone', '--depth', CLONE_DEPTH, '--progress'];
const MAX_MESSAGE_LENGTH = 200;
const HOME_PREFIX = '~/';
const INVALID_URL_MESSAGE = 'Paste a GitHub repository URL like https://github.com/owner/repo';
const INVALID_PATH_MESSAGE = 'That folder does not exist';
const BUSY_MESSAGE = 'A repository is already being cloned';

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/** `~/code` becomes `/Users/me/code`; everything else is resolved to an absolute path. */
export function expandPath(raw: string): string {
  const trimmed = raw.trim();
  const expanded = trimmed.startsWith(HOME_PREFIX) ? join(homedir(), trimmed.slice(HOME_PREFIX.length)) : trimmed;
  return isAbsolute(expanded) ? expanded : resolve(expanded);
}

/** One repository per floor: GitHub clones live in `<userData>/repos`, local folders are used in place. */
export class RepoService {
  private readonly statuses = new Map<string, RepoStatus>();
  private readonly listeners = new Set<StatusListener>();
  private readonly reposRoot: string;
  private readonly git: GitRunner;

  constructor(userDataPath: string, git: GitRunner = runGit) {
    this.reposRoot = join(userDataPath, REPOS_DIRECTORY);
    this.git = git;
  }

  getStatus(floorId: string): RepoStatus {
    return this.statuses.get(floorId) ?? IDLE_REPO_STATUS;
  }

  onStatus(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return (): void => {
      this.listeners.delete(listener);
    };
  }

  /** Points the floor at a folder already on disk. Throws when it is not a directory. */
  async useLocal(floorId: string, rawPath: string): Promise<RepoStatus> {
    const path = expandPath(rawPath);
    if (!(await isDirectory(path))) throw new ServiceError(RepoErrorCode.InvalidPath, INVALID_PATH_MESSAGE);
    this.publish(floorId, { state: RepoState.Ready, url: null, fullName: basename(path), path, message: null });
    return this.getStatus(floorId);
  }

  /** Clones `url` for the floor, or refreshes it when the clone already exists. Throws a ServiceError on failure. */
  async load(floorId: string, url: string): Promise<RepoStatus> {
    const repoRef = parseGitHubUrl(url);
    if (repoRef === null) throw new ServiceError(RepoErrorCode.InvalidUrl, INVALID_URL_MESSAGE);
    if (this.isAnyCloning()) throw new ServiceError(RepoErrorCode.Busy, BUSY_MESSAGE);
    const path = this.clonePathFor(repoRef);
    this.publish(floorId, { state: RepoState.Cloning, url: repoRef.cloneUrl, fullName: `${repoRef.owner}/${repoRef.name}`, path: null, message: null });
    try {
      await this.cloneOrRefresh(floorId, repoRef, path);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('repo load failed', { floorId, url: repoRef.cloneUrl, message });
      this.publish(floorId, { ...this.getStatus(floorId), state: RepoState.Error, message });
      throw error;
    }
    this.publish(floorId, { ...this.getStatus(floorId), state: RepoState.Ready, path, message: null });
    return this.getStatus(floorId);
  }

  private isAnyCloning(): boolean {
    return Array.from(this.statuses.values()).some((status: RepoStatus): boolean => status.state === RepoState.Cloning);
  }

  private clonePathFor(repoRef: GitHubRepoRef): string {
    return join(this.reposRoot, `${repoRef.owner}${OWNER_NAME_SEPARATOR}${repoRef.name}`);
  }

  /** Pulls an existing clone; when the pull fails or nothing is there, clones fresh. */
  private async cloneOrRefresh(floorId: string, repoRef: GitHubRepoRef, path: string): Promise<void> {
    await mkdir(this.reposRoot, { recursive: true });
    const handleLine = (line: string): void => this.handleOutputLine(floorId, line);
    if (await isDirectory(join(path, GIT_DIRECTORY))) {
      try {
        await this.git(GIT_PULL_ARGUMENTS, path, handleLine);
        return;
      } catch (error: unknown) {
        logger.warn('pull failed, cloning fresh', { path, error });
      }
    }
    await rm(path, { recursive: true, force: true });
    try {
      await this.git([...GIT_CLONE_ARGUMENTS, repoRef.cloneUrl, path], undefined, handleLine);
    } catch (error: unknown) {
      await rm(path, { recursive: true, force: true });
      throw error;
    }
  }

  private handleOutputLine(floorId: string, line: string): void {
    const message = line.slice(0, MAX_MESSAGE_LENGTH);
    const current = this.getStatus(floorId);
    if (message === current.message) return;
    this.publish(floorId, { ...current, message });
  }

  private publish(floorId: string, status: RepoStatus): void {
    this.statuses.set(floorId, status);
    this.listeners.forEach((listener: StatusListener): void => {
      try {
        listener({ floorId, status });
      } catch (error: unknown) {
        logger.error('status listener failed', error);
      }
    });
  }
}
