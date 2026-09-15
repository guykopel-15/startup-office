import { useMemo } from 'react';

import { RunMode, buildTaskPrompt } from '@shared/agents';
import { FigureState, findFigure } from '@shared/figures';
import { isBlank } from '@shared/text';
import { useStartRun } from '../api/agentQueries';
import { selectActiveFloor, selectFloor, useFloorsStore } from '../store/floorsStore';
import { useTasksStore } from '../store/tasksStore';

import type { UseMutateAsyncFunction } from '@tanstack/react-query';
import type { Task } from '@shared/tasks';
import type { StartRunRequest } from '../api/agentQueries';

export interface GiveTask {
  /** Claude is installed and the active floor's repo is on disk. */
  canGiveTasks: boolean;
  /** Creates the quest, posts it to the chat and queues the figure's run. Null when nothing could start. */
  giveTask: (figureId: string, text: string) => Task | null;
  /** Same, on a given floor (a sprint keeps working on the floor it started on). */
  giveTaskOnFloor: (floorId: string, figureId: string, text: string) => Task | null;
}

/** Shown wherever a task cannot be handed over. */
export const CANNOT_START_HINT = 'Needs Claude Code and a repository on this floor.';
const START_FAILED_PREFIX = "I couldn't start on that: ";

type StartRun = UseMutateAsyncFunction<string, Error, StartRunRequest>;

/** Creates the quest and queues its run on `floorId`; a failed start fails the quest and frees the figure. */
function giveTaskOnFloor(isClaudeAvailable: boolean, startRun: StartRun, floorId: string, figureId: string, text: string): Task | null {
  const title = text.trim();
  const floor = selectFloor(useFloorsStore.getState(), floorId);
  const cwd = floor?.repoStatus.path ?? null;
  const figure = findFigure(floor?.figures ?? [], figureId);
  if (!isClaudeAvailable || floor === null || cwd === null || figure === null || isBlank(title)) return null;
  const { addTask, failTask } = useTasksStore.getState();
  const task = addTask({ floorId: floor.id, title, assigneeId: figure.id });
  // mutateAsync keeps its own promise per call, so two quick asks both report back (mutate's callbacks would be dropped).
  startRun({ floorId: floor.id, figureId: figure.id, cwd, prompt: buildTaskPrompt(figure.rolePrompt, figure.job, title), mode: RunMode.ReadOnly, taskId: task.id }).catch((error: Error): void => {
    failTask(task.id, `${START_FAILED_PREFIX}${error.message}`);
    useFloorsStore.getState().setFigureState(floor.id, figure.id, FigureState.Idle);
  });
  return task;
}

/** One way to hand work to a figure, shared by the dialog box, the HUD chat and sprints. Stable between renders. */
export function useGiveTask(isClaudeAvailable: boolean): GiveTask {
  const activeFloor = useFloorsStore(selectActiveFloor);
  const activeFloorId = activeFloor?.id ?? null;
  const hasRepo = activeFloor !== null && activeFloor.repoStatus.path !== null;
  const { mutateAsync } = useStartRun();
  return useMemo(
    (): GiveTask => ({
      canGiveTasks: isClaudeAvailable && hasRepo,
      giveTask: (figureId: string, text: string): Task | null => (activeFloorId === null ? null : giveTaskOnFloor(isClaudeAvailable, mutateAsync, activeFloorId, figureId, text)),
      giveTaskOnFloor: (floorId: string, figureId: string, text: string): Task | null => giveTaskOnFloor(isClaudeAvailable, mutateAsync, floorId, figureId, text),
    }),
    [isClaudeAvailable, hasRepo, activeFloorId, mutateAsync],
  );
}
