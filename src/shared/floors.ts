import { parseGitHubUrl } from './repo';

import type { Figure } from './figures';
import type { RepoStatus } from './repo';

export enum FloorSourceKind {
  GitHub = 'github',
  Local = 'local',
}

/** Where a floor's repository comes from: a GitHub URL to clone, or a folder already on disk. */
export type FloorSource = { kind: FloorSourceKind.GitHub; url: string } | { kind: FloorSourceKind.Local; path: string };

export enum FloorSetupStep {
  PreparingRepo = 'preparingRepo',
  CreatingFigures = 'creatingFigures',
  Ready = 'ready',
  Error = 'error',
}

export interface FloorSetupProgress {
  step: FloorSetupStep;
  /** 0..1 across the whole setup. */
  fraction: number;
  label: string;
  error: string | null;
}

/** One office floor: a repository and the team that works on it. */
export interface Floor {
  id: string;
  name: string;
  source: FloorSource;
  repoStatus: RepoStatus;
  figures: Figure[];
  setup: FloorSetupProgress;
}

/** Figure template ids that every new floor starts with, in creation order. */
export const DEFAULT_TEAM_IDS: readonly string[] = ['frontend', 'backend', 'uiux', 'qa', 'devops', 'pm', 'data', 'content', 'sales', 'accountant', 'office'];

const ABSOLUTE_PATH_PATTERN = /^(\/|~\/|[A-Za-z]:[\\/])/;
const PATH_SEPARATORS = /[\\/]+$/;
const LAST_SEGMENT = /[^\\/]+$/;
const FALLBACK_NAME = 'Floor';

/** A GitHub URL becomes a clone source; an absolute path (or `~/…`) a local source; anything else is rejected. Pure. */
export function parseFloorSource(raw: string): FloorSource | null {
  const trimmed = raw.trim();
  const repoRef = parseGitHubUrl(trimmed);
  if (repoRef !== null) return { kind: FloorSourceKind.GitHub, url: repoRef.cloneUrl };
  if (ABSOLUTE_PATH_PATTERN.test(trimmed)) return { kind: FloorSourceKind.Local, path: trimmed };
  return null;
}

/** A readable default name: the repository name for GitHub, the folder name for a local path. */
export function defaultFloorName(source: FloorSource): string {
  if (source.kind === FloorSourceKind.GitHub) return parseGitHubUrl(source.url)?.name ?? FALLBACK_NAME;
  const lastSegment = LAST_SEGMENT.exec(source.path.replace(PATH_SEPARATORS, ''));
  return lastSegment?.[0] ?? FALLBACK_NAME;
}
