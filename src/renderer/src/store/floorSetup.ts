import { DEFAULT_FIGURES } from '@shared/figures';
import { DEFAULT_TEAM_IDS, FloorSetupStep, FloorSourceKind } from '@shared/floors';
import { parseGitProgress } from '@shared/repo';
import { getFurniture } from '../game/world/furniture';
import { seatTemplateFigure } from './seating';

import type { Figure } from '@shared/figures';
import type { FloorSetupProgress, FloorSource } from '@shared/floors';
import type { RepoStatus } from '@shared/repo';
import type { Furniture } from '../game/world/furniture';
import type { FloorsState } from './floorsStore';

/** Resolves the repo for a floor; the renderer passes the TanStack mutation here. */
export type PrepareRepo = (floorId: string, source: FloorSource) => Promise<RepoStatus>;
export type Sleep = (milliseconds: number) => Promise<void>;

/** Half of the bar is the repository, the other half is the team. */
export const REPO_SHARE = 0.5;
export const FIGURE_STEP_MS = 160;
const PREPARING_LABEL = 'Preparing the repository';
const CLONING_LABEL = 'Cloning';
const HIRING_LABEL = 'Hiring';
const READY_LABEL = 'Floor ready';
const UNKNOWN_ERROR = 'Setup failed';

export function defaultTeam(): Figure[] {
  return DEFAULT_TEAM_IDS.flatMap((id: string): Figure[] => {
    const template = DEFAULT_FIGURES.find((figure: Figure): boolean => figure.id === id);
    return template === undefined ? [] : [template];
  });
}

/** Progress while cloning: git's own percentage, scaled into the repo half of the bar. */
export function repoProgress(status: RepoStatus): FloorSetupProgress {
  const gitFraction = parseGitProgress(status.message) ?? 0;
  const label = status.message === null ? PREPARING_LABEL : `${CLONING_LABEL}: ${status.message}`;
  return { step: FloorSetupStep.PreparingRepo, fraction: gitFraction * REPO_SHARE, label, error: null };
}

function hiringProgress(created: number, total: number, figure: Figure): FloorSetupProgress {
  return { step: FloorSetupStep.CreatingFigures, fraction: REPO_SHARE + (created / total) * (1 - REPO_SHARE), label: `${HIRING_LABEL} ${figure.name}, ${figure.job.toLowerCase()}`, error: null };
}

const defaultSleep: Sleep = (milliseconds: number): Promise<void> =>
  new Promise<void>((resolve: () => void): void => {
    setTimeout(resolve, milliseconds);
  });

/** Runs the whole setup for a floor: repository first, then the default team one figure at a time. */
export async function runFloorSetup(store: FloorsState, floorId: string, source: FloorSource, prepareRepo: PrepareRepo, sleep: Sleep = defaultSleep): Promise<void> {
  try {
    const status = await prepareRepo(floorId, source);
    store.setRepoStatus(floorId, status);
    await hireTeam(store, floorId, sleep);
    store.setSetup(floorId, { step: FloorSetupStep.Ready, fraction: 1, label: READY_LABEL, error: null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;
    store.setSetup(floorId, { step: FloorSetupStep.Error, fraction: 0, label: message, error: message });
  }
}

async function hireTeam(store: FloorsState, floorId: string, sleep: Sleep): Promise<void> {
  const furniture: Furniture[] = getFurniture();
  const team = defaultTeam();
  const seated: Figure[] = [];
  for (const [index, template] of team.entries()) {
    const figure = seatTemplateFigure(template, seated, furniture);
    if (figure === null) continue;
    seated.push(figure);
    store.setSetup(floorId, hiringProgress(index + 1, team.length, figure));
    store.appendFigure(floorId, figure);
    await sleep(FIGURE_STEP_MS);
  }
}

export function isLocalSource(source: FloorSource): boolean {
  return source.kind === FloorSourceKind.Local;
}
