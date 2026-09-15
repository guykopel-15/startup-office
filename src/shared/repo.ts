export enum RepoState {
  Idle = 'idle',
  Cloning = 'cloning',
  Ready = 'ready',
  Error = 'error',
}

/** What the office knows about a floor's repository. Pushed from main on every change. */
export interface RepoStatus {
  state: RepoState;
  url: string | null;
  /** `owner/name` for GitHub repos, the folder name for local ones; shown in tabs and chips. */
  fullName: string | null;
  /** Local path, set once the repo is ready. */
  path: string | null;
  /** Last git output line while cloning, or the error message. */
  message: string | null;
}

/** A status push from main, tagged with the floor it belongs to. */
export interface RepoStatusEvent {
  floorId: string;
  status: RepoStatus;
}

export interface GitHubRepoRef {
  owner: string;
  name: string;
  /** Normalized https clone URL. */
  cloneUrl: string;
}

export enum RepoChannel {
  Load = 'repo:load',
  UseLocal = 'repo:useLocal',
  GetStatus = 'repo:getStatus',
  PickFolder = 'repo:pickFolder',
  StatusChanged = 'repo:statusChanged',
}

export enum RepoErrorCode {
  InvalidUrl = 'REPO_INVALID_URL',
  InvalidPath = 'REPO_INVALID_PATH',
  GitNotFound = 'REPO_GIT_NOT_FOUND',
  CloneFailed = 'REPO_CLONE_FAILED',
  Busy = 'REPO_BUSY',
  Timeout = 'REPO_TIMEOUT',
}

export const IDLE_REPO_STATUS: RepoStatus = { state: RepoState.Idle, url: null, fullName: null, path: null, message: null };

const HTTPS_PROTOCOL = 'https:';
const GITHUB_HOST = 'github.com';
const GITHUB_HOST_WWW = 'www.github.com';
const CLONE_URL_PREFIX = `https://${GITHUB_HOST}/`;
const GIT_SUFFIX = /\.git$/;
const PATH_SEPARATOR = '/';
const SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;
const RESERVED_SEGMENTS: readonly string[] = ['.', '..'];
const OWNER_INDEX = 0;
const NAME_INDEX = 1;
const REQUIRED_SEGMENTS = 2;
const PROGRESS_PERCENT_PATTERN = /(\d{1,3})%/;
const PERCENT = 100;

function isValidSegment(segment: string): boolean {
  return SEGMENT_PATTERN.test(segment) && !RESERVED_SEGMENTS.includes(segment);
}

function isPlainGitHubOrigin(parsed: URL): boolean {
  const isGitHubHost = parsed.hostname === GITHUB_HOST || parsed.hostname === GITHUB_HOST_WWW;
  const hasExtras = parsed.username !== '' || parsed.password !== '' || parsed.port !== '';
  return parsed.protocol === HTTPS_PROTOCOL && isGitHubHost && !hasExtras;
}

/** Accepts `https://github.com/owner/repo`, with or without `.git`, `www.` or a trailing slash. Pure. */
export function parseGitHubUrl(raw: string): GitHubRepoRef | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!isPlainGitHubOrigin(parsed)) return null;
  const segments = parsed.pathname.split(PATH_SEPARATOR).filter((segment: string): boolean => segment.length > 0);
  if (segments.length !== REQUIRED_SEGMENTS) return null;
  const owner = segments[OWNER_INDEX] ?? '';
  const name = (segments[NAME_INDEX] ?? '').replace(GIT_SUFFIX, '');
  if (!isValidSegment(owner) || !isValidSegment(name)) return null;
  return { owner, name, cloneUrl: `${CLONE_URL_PREFIX}${owner}${PATH_SEPARATOR}${name}.git` };
}

/** Fraction 0..1 from a git progress line such as "Receiving objects: 45% (…)", or null when there is none. */
export function parseGitProgress(message: string | null): number | null {
  if (message === null) return null;
  const match = PROGRESS_PERCENT_PATTERN.exec(message);
  if (match === null) return null;
  return Math.min(Number(match[1]), PERCENT) / PERCENT;
}
