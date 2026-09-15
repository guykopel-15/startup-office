import { RunMode, buildTaskPrompt } from '@shared/agents';
import { findFigure } from '@shared/figures';
import { isBlank } from '@shared/text';
import { useStartRun } from '../api/agentQueries';
import { selectActiveFloor, useFloorsStore } from '../store/floorsStore';
import { useTasksStore } from '../store/tasksStore';

export interface GiveTask {
  /** Claude is installed and the active floor's repo is on disk. */
  canGiveTasks: boolean;
  /** Creates the quest, posts it to the chat and queues the figure's run. False when nothing could start. */
  giveTask: (figureId: string, text: string) => boolean;
}

/** Shown wherever a task cannot be handed over. */
export const CANNOT_START_HINT = 'Needs Claude Code and a repository on this floor.';
const START_FAILED_PREFIX = "I couldn't start on that: ";

/** One way to hand work to a figure, shared by the dialog box and the HUD chat. */
export function useGiveTask(isClaudeAvailable: boolean): GiveTask {
  const floor = useFloorsStore(selectActiveFloor);
  const startRun = useStartRun();
  const { mutateAsync } = startRun;
  const cwd = floor?.repoStatus.path ?? null;
  const canGiveTasks = isClaudeAvailable && floor !== null && cwd !== null;

  const giveTask = (figureId: string, text: string): boolean => {
    const title = text.trim();
    const figure = findFigure(floor?.figures ?? [], figureId);
    if (!canGiveTasks || floor === null || cwd === null || figure === null || isBlank(title)) return false;
    const { addTask, failTask } = useTasksStore.getState();
    const task = addTask({ floorId: floor.id, title, assigneeId: figure.id });
    // mutateAsync keeps its own promise per call, so two quick asks both report back (mutate's callbacks would be dropped).
    mutateAsync({ floorId: floor.id, figureId: figure.id, cwd, prompt: buildTaskPrompt(figure.rolePrompt, figure.job, title), mode: RunMode.ReadOnly, taskId: task.id }).catch((error: Error): void =>
      failTask(task.id, `${START_FAILED_PREFIX}${error.message}`),
    );
    return true;
  };
  return { canGiveTasks, giveTask };
}
