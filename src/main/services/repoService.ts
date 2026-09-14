import { access, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { createLogger } from '../../shared/logger';
import { IDLE_REPO_STATUS, RepoErrorCode, RepoState, parseGitHubUrl } from '../../shared/repo';
import { ServiceError } from '../../shared/response';
import { runGit } from './gitRunner';

import type { GitHubRepoRef, RepoStatus } from '../../shared/repo';
import type { GitRunner } from './gitRunner';

export type StatusListener = (status: RepoStatus) => void;

const logger = createLogger('repo');
const REPOS_DIRECTORY = 'repos';
const GIT_DIRECTORY = '.git';
const OWNER_NAME_SEPARATOR = '__';
const CLONE_DEPTH = '1';
const GIT_PULL_ARGUMENTS: readonly string[] = ['pull', '--ff-only'];
const GIT_CLONE_ARGUMENTS: readonly string[] = ['clone', '--depth', CLONE_DEPTH, '--progress'];
const MAX_MESSAGE_LENGTH = 200;
const INVALID_URL_MESSAGE = 'Paste a GitHub repository URL like https://github.com/owner/repo';
const BUSY_MESSAGE = 'A repository is already being cloned';

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
    const repoRef = parseGitHubUrl(url);
    if (repoRef === null) throw new ServiceError(RepoErrorCode.InvalidUrl, INVALID_URL_MESSAGE);
    if (this.status.state === RepoState.Cloning) throw new ServiceError(RepoErrorCode.Busy, BUSY_MESSAGE);
    const path = this.clonePathFor(repoRef);
    this.publish({ state: RepoState.Cloning, url: repoRef.cloneUrl, fullName: `${repoRef.owner}/${repoRef.name}`, path: null, message: null });
    try {
      await this.cloneOrRefresh(repoRef, path);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('repo load failed', { url: repoRef.cloneUrl, message });
      this.publish({ ...this.status, state: RepoState.Error, message });
      throw error;
    }
    this.publish({ ...this.status, state: RepoState.Ready, path, message: null });
    return this.status;
  }

  private clonePathFor(repoRef: GitHubRepoRef): string {
    return join(this.reposRoot, `${repoRef.owner}${OWNER_NAME_SEPARATOR}${repoRef.name}`);
  }

  /** Pulls an existing clone; when the pull fails or nothing is there, clones fresh. */
  private async cloneOrRefresh(repoRef: GitHubRepoRef, path: string): Promise<void> {
    await mkdir(this.reposRoot, { recursive: true });
    if (await directoryExists(join(path, GIT_DIRECTORY))) {
      try {
        await this.git(GIT_PULL_ARGUMENTS, path, this.handleOutputLine);
        return;
      } catch (error: unknown) {
        logger.warn('pull failed, cloning fresh', { path, error });
      }
    }
    await rm(path, { recursive: true, force: true });
    try {
      await this.git([...GIT_CLONE_ARGUMENTS, repoRef.cloneUrl, path], undefined, this.handleOutputLine);
    } catch (error: unknown) {
      await rm(path, { recursive: true, force: true });
      throw error;
    }
  }

  private readonly handleOutputLine = (line: string): void => {
    const message = line.slice(0, MAX_MESSAGE_LENGTH);
    if (message === this.status.message) return;
    this.publish({ ...this.status, message });
  };

  private publish(status: RepoStatus): void {
    this.status = status;
    this.listeners.forEach((listener: StatusListener): void => {
      try {
        listener(status);
      } catch (error: unknown) {
        logger.error('status listener failed', error);
      }
    });
  }
}
