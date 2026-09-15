import { RunMode, buildTaskPrompt } from '@shared/agents';
import { useStartRun } from '../api/agentQueries';
import { selectActiveFloor, useFloorsStore } from '../store/floorsStore';
import { useTasksStore } from '../store/tasksStore';

import type { Figure } from '@shared/figures';
import type { Floor } from '@shared/floors';

export interface GiveTask {
  /** Claude is installed and the active floor's repo is on disk. */
  canGiveTasks: boolean;
  /** Creates the quest, posts it to the chat and queues the figure's run. False when nothing could start. */
  giveTask: (figureId: string, text: string) => boolean;
}

const START_FAILED_PREFIX = "I couldn't start on that: ";

/** One way to hand work to a figure, shared by the dialog box and the HUD chat. */
export function useGiveTask(isClaudeAvailable: boolean): GiveTask {
  const floor = useFloorsStore(selectActiveFloor);
  const startRun = useStartRun();
  const { mutate } = startRun;
  const cwd = floor?.repoStatus.path ?? null;
  const canGiveTasks = isClaudeAvailable && floor !== null && cwd !== null;

  const giveTask = (figureId: string, text: string): boolean => {
    const title = text.trim();
    const figure = floor?.figures.find((candidate: Figure): boolean => candidate.id === figureId);
    if (!canGiveTasks || floor === null || cwd === null || figure === undefined || title === '') return false;
    const { addTask, attachRun, failTask } = useTasksStore.getState();
    const task = addTask({ floorId: floor.id, title, assigneeId: figure.id });
    mutate(
      { floorId: floor.id, figureId: figure.id, cwd, prompt: buildTaskPrompt(figure.rolePrompt, figure.job, title), mode: RunMode.ReadOnly },
      {
        onSuccess: (runId: string): void => attachRun(task.id, runId),
        onError: (error: Error): void => failTask(task.id, `${START_FAILED_PREFIX}${error.message}`),
      },
    );
    return true;
  };
  return { canGiveTasks, giveTask };
}

export function findFigure(floor: Floor | null, figureId: string | null): Figure | null {
  return floor?.figures.find((candidate: Figure): boolean => candidate.id === figureId) ?? null;
}
