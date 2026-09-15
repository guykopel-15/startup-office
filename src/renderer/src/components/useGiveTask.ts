import { RunMode, buildTaskPrompt } from '@shared/agents';
import { findFigure } from '@shared/figures';
import { isBlank } from '@shared/text';
import { useStartRun } from '../api/agentQueries';
import { selectActiveFloor, useFloorsStore } from '../store/floorsStore';
import { useTasksStore } from '../store/tasksStore';

import type { Floor } from '@shared/floors';
import type { Task } from '@shared/tasks';

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

function findFloor(floorId: string | null): Floor | null {
  return useFloorsStore.getState().floors.find((floor: Floor): boolean => floor.id === floorId) ?? null;
}

/** One way to hand work to a figure, shared by the dialog box, the HUD chat and sprints. */
export function useGiveTask(isClaudeAvailable: boolean): GiveTask {
  const activeFloor = useFloorsStore(selectActiveFloor);
  const startRun = useStartRun();
  const { mutateAsync } = startRun;
  const canGiveTasks = isClaudeAvailable && activeFloor !== null && activeFloor.repoStatus.path !== null;

  const giveTaskOnFloor = (floorId: string, figureId: string, text: string): Task | null => {
    const title = text.trim();
    const floor = findFloor(floorId);
    const cwd = floor?.repoStatus.path ?? null;
    const figure = findFigure(floor?.figures ?? [], figureId);
    if (!isClaudeAvailable || floor === null || cwd === null || figure === null || isBlank(title)) return null;
    const { addTask, failTask } = useTasksStore.getState();
    const task = addTask({ floorId: floor.id, title, assigneeId: figure.id });
    // mutateAsync keeps its own promise per call, so two quick asks both report back (mutate's callbacks would be dropped).
    mutateAsync({ floorId: floor.id, figureId: figure.id, cwd, prompt: buildTaskPrompt(figure.rolePrompt, figure.job, title), mode: RunMode.ReadOnly, taskId: task.id }).catch((error: Error): void =>
      failTask(task.id, `${START_FAILED_PREFIX}${error.message}`),
    );
    return task;
  };
  const giveTask = (figureId: string, text: string): Task | null => (activeFloor === null ? null : giveTaskOnFloor(activeFloor.id, figureId, text));
  return { canGiveTasks, giveTask, giveTaskOnFloor };
}
