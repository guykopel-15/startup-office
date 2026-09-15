import { FigureState } from './figures';
import { SprintStatus } from './sprints';
import { TaskStatus } from './tasks';

import type { Figure } from './figures';
import type { Floor } from './floors';
import type { Sprint } from './sprints';
import type { ChatMessage, Task } from './tasks';

/** Everything the office remembers across restarts. Runs are not kept: a session cannot be resumed. */
export interface Snapshot {
  version: number;
  savedAt: string;
  floors: Floor[];
  activeFloorId: string | null;
  tasks: Task[];
  messages: ChatMessage[];
  sprints: Sprint[];
  /** Floors whose team already read the repo, so a restart does not start eleven sessions again. */
  intakeStartedFloorIds: string[];
  settings: PersistedSettings;
}

export interface PersistedSettings {
  isMuted: boolean;
}

export interface LoadStateResult {
  snapshot: Snapshot | null;
  /** Set when a state file existed but could not be read; the file was moved aside. */
  warning: string | null;
}

export enum StateChannel {
  Load = 'state:load',
  Save = 'state:save',
}

export enum StateErrorCode {
  InvalidInput = 'STATE_INVALID_INPUT',
  WriteFailed = 'STATE_WRITE_FAILED',
}

export const SNAPSHOT_VERSION = 1;
export const STATE_FILE_NAME = 'state.json';
const ENDED_TASK_STATUSES: readonly TaskStatus[] = [TaskStatus.Done, TaskStatus.Failed];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown): boolean => typeof item === 'string');
}

/** Shape check for a snapshot from disk or IPC. Field-level trust stays with the stores that wrote it. */
export function parseSnapshot(raw: unknown): Snapshot | null {
  if (!isRecord(raw) || raw['version'] !== SNAPSHOT_VERSION || typeof raw['savedAt'] !== 'string') return null;
  const { floors, tasks, messages, sprints, intakeStartedFloorIds, settings, activeFloorId } = raw;
  const hasArrays = Array.isArray(floors) && Array.isArray(tasks) && Array.isArray(messages) && Array.isArray(sprints) && isStringArray(intakeStartedFloorIds);
  if (!hasArrays || !isRecord(settings) || typeof settings['isMuted'] !== 'boolean') return null;
  if (activeFloorId !== null && typeof activeFloorId !== 'string') return null;
  if (!floors.every((floor: unknown): boolean => isRecord(floor) && typeof floor['id'] === 'string' && Array.isArray(floor['figures']))) return null;
  return { version: SNAPSHOT_VERSION, savedAt: raw['savedAt'], floors: floors as Floor[], activeFloorId, tasks: tasks as Task[], messages: messages as ChatMessage[], sprints: sprints as Sprint[], intakeStartedFloorIds, settings: { isMuted: settings['isMuted'] } };
}

function settleFigure(figure: Figure): Figure {
  return figure.state === FigureState.Idle ? figure : { ...figure, state: FigureState.Idle };
}

function settleTask(task: Task): Task {
  return ENDED_TASK_STATUSES.includes(task.status) ? task : { ...task, status: TaskStatus.Failed };
}

function settleSprint(sprint: Sprint): Sprint {
  return sprint.status === SprintStatus.Closed ? sprint : { ...sprint, status: SprintStatus.Closed, closedAt: sprint.closedAt ?? new Date().toISOString() };
}

/**
 * A snapshot as it makes sense after a restart: the runs that drove it are gone, so every
 * figure is idle, every open quest failed, and every open sprint is closed.
 */
export function settleSnapshot(snapshot: Snapshot): Snapshot {
  return {
    ...snapshot,
    floors: snapshot.floors.map((floor: Floor): Floor => ({ ...floor, figures: floor.figures.map(settleFigure) })),
    tasks: snapshot.tasks.map(settleTask),
    sprints: snapshot.sprints.map(settleSprint),
  };
}
