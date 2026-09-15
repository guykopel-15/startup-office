import { create } from 'zustand';

import { SprintStatus } from '@shared/sprints';
import { TaskStatus } from '@shared/tasks';

import type { StoreApi } from 'zustand';

import type { Sprint } from '@shared/sprints';
import type { Task } from '@shared/tasks';

export interface NewSprintInput {
  floorId: string;
  goal: string;
}

export interface SprintProgress {
  total: number;
  done: number;
  failed: number;
  /** 0..1 of tasks that have ended. */
  fraction: number;
}

export interface SprintsState {
  /** Oldest first. */
  sprints: Sprint[];
  startSprint: (input: NewSprintInput) => Sprint;
  attachPlanRun: (sprintId: string, runId: string) => void;
  /** The plan is in: the sprint becomes active with these quests. */
  applyPlan: (sprintId: string, taskIds: readonly string[]) => void;
  closeSprint: (sprintId: string) => void;
  clearFloor: (floorId: string) => void;
}

const SPRINT_ID_PREFIX = 'sprint-';
const ENDED_STATUSES: readonly TaskStatus[] = [TaskStatus.Done, TaskStatus.Failed];

function patchSprint(sprints: readonly Sprint[], sprintId: string, patch: (sprint: Sprint) => Sprint): Sprint[] {
  return sprints.map((sprint: Sprint): Sprint => (sprint.id === sprintId ? patch(sprint) : sprint));
}

/** The latest sprint on a floor, whatever its status. */
export function selectSprintForFloor(state: { sprints: readonly Sprint[] }, floorId: string | null): Sprint | null {
  const sprints = state.sprints.filter((sprint: Sprint): boolean => sprint.floorId === floorId);
  return sprints[sprints.length - 1] ?? null;
}

export function selectSprintTasks(sprint: Sprint, tasks: readonly Task[]): Task[] {
  return sprint.taskIds.map((taskId: string): Task | undefined => tasks.find((task: Task): boolean => task.id === taskId)).filter((task): task is Task => task !== undefined);
}

export function sprintProgress(sprint: Sprint, tasks: readonly Task[]): SprintProgress {
  const own = selectSprintTasks(sprint, tasks);
  const done = own.filter((task: Task): boolean => task.status === TaskStatus.Done).length;
  const failed = own.filter((task: Task): boolean => task.status === TaskStatus.Failed).length;
  return { total: own.length, done, failed, fraction: own.length === 0 ? 0 : (done + failed) / own.length };
}

/** True when every quest of an active sprint has ended. */
export function isSprintFinished(sprint: Sprint, tasks: readonly Task[]): boolean {
  const own = selectSprintTasks(sprint, tasks);
  return sprint.status === SprintStatus.Active && own.length > 0 && own.every((task: Task): boolean => ENDED_STATUSES.includes(task.status));
}

export const useSprintsStore = create<SprintsState>((set: StoreApi<SprintsState>['setState'], get: StoreApi<SprintsState>['getState']): SprintsState => ({
  sprints: [],
  startSprint: (input: NewSprintInput): Sprint => {
    const sprint: Sprint = { id: `${SPRINT_ID_PREFIX}${crypto.randomUUID()}`, floorId: input.floorId, goal: input.goal.trim(), status: SprintStatus.Planning, planRunId: null, taskIds: [], createdAt: new Date().toISOString(), closedAt: null };
    set({ sprints: [...get().sprints, sprint] });
    return sprint;
  },
  attachPlanRun: (sprintId: string, runId: string): void => {
    set({ sprints: patchSprint(get().sprints, sprintId, (sprint: Sprint): Sprint => ({ ...sprint, planRunId: runId })) });
  },
  applyPlan: (sprintId: string, taskIds: readonly string[]): void => {
    set({ sprints: patchSprint(get().sprints, sprintId, (sprint: Sprint): Sprint => ({ ...sprint, status: SprintStatus.Active, taskIds: [...taskIds] })) });
  },
  closeSprint: (sprintId: string): void => {
    set({ sprints: patchSprint(get().sprints, sprintId, (sprint: Sprint): Sprint => ({ ...sprint, status: SprintStatus.Closed, closedAt: new Date().toISOString() })) });
  },
  clearFloor: (floorId: string): void => {
    set({ sprints: get().sprints.filter((sprint: Sprint): boolean => sprint.floorId !== floorId) });
  },
}));
