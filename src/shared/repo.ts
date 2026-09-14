export enum RepoState {
  Idle = 'idle',
  Cloning = 'cloning',
  Ready = 'ready',
  Error = 'error',
}

/** What the office knows about the loaded repository. Pushed from main on every change. */
export interface RepoStatus {
  state: RepoState;
  url: string | null;
  /** `owner/name`, for the navbar chip. */
  fullName: string | null;
  /** Local clone path, set once the clone is ready. */
  path: string | null;
  /** Last git output line while cloning, or the error message. */
  message: string | null;
}

export interface GitHubRepoRef {
  owner: string;
  name: string;
  /** Normalized https clone URL. */
  cloneUrl: string;
}

export enum RepoChannel {
  Load = 'repo:load',
  GetStatus = 'repo:getStatus',
  StatusChanged = 'repo:statusChanged',
}

export enum RepoErrorCode {
  InvalidUrl = 'REPO_INVALID_URL',
  GitNotFound = 'REPO_GIT_NOT_FOUND',
  CloneFailed = 'REPO_CLONE_FAILED',
  Busy = 'REPO_BUSY',
}

export const IDLE_REPO_STATUS: RepoStatus = { state: RepoState.Idle, url: null, fullName: null, path: null, message: null };

const GITHUB_HOST = 'github.com';
const GITHUB_HOST_WWW = 'www.github.com';
const GIT_SUFFIX = /\.git$/;
const SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;
const OWNER_INDEX = 0;
const NAME_INDEX = 1;
const REQUIRED_SEGMENTS = 2;

/** Accepts `https://github.com/owner/repo`, with or without `.git`, `www.` or a trailing slash. Pure. */
export function parseGitHubUrl(raw: string): GitHubRepoRef | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.hostname !== GITHUB_HOST && parsed.hostname !== GITHUB_HOST_WWW) return null;
  const segments = parsed.pathname.split('/').filter((segment: string): boolean => segment.length > 0);
  if (segments.length !== REQUIRED_SEGMENTS) return null;
  const owner = segments[OWNER_INDEX] ?? '';
  const name = (segments[NAME_INDEX] ?? '').replace(GIT_SUFFIX, '');
  if (!SEGMENT_PATTERN.test(owner) || !SEGMENT_PATTERN.test(name) || name === '.' || name === '..') return null;
  return { owner, name, cloneUrl: `https://${GITHUB_HOST}/${owner}/${name}.git` };
}
