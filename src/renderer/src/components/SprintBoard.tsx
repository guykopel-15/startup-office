import { useState } from 'react';

import { MAX_GOAL_LENGTH, SprintStatus } from '@shared/sprints';
import { TaskStatus } from '@shared/tasks';
import { isBlank } from '@shared/text';
import { DSButton, DSButtonVariant, DSInput, DSProgressBar, submitOnEnter } from '../designKit';
import { selectSprintTasks, sprintProgress } from '../store/sprintsStore';
import { CANNOT_START_HINT } from './useGiveTask';

import type React from 'react';
import type { Figure } from '@shared/figures';
import type { Sprint } from '@shared/sprints';
import type { Task } from '@shared/tasks';

interface SprintBoardProps {
  sprint: Sprint | null;
  tasks: readonly Task[];
  figures: readonly Figure[];
  canStart: boolean;
  onStart: (goal: string) => boolean;
}

interface GoalFormProps {
  onStart: (goal: string) => boolean;
  onCancel: () => void;
}

interface TaskRowProps {
  task: Task;
  figures: readonly Figure[];
}

interface SprintSummaryProps {
  sprint: Sprint;
  tasks: readonly Task[];
  figures: readonly Figure[];
}

const BOARD_LABEL = 'Sprint board';
const START_LABEL = 'Start sprint';
const START_ICON = '⚑';
const NEW_SPRINT_LABEL = 'New sprint';
const GOAL_FIELD_ID = 'sprint-goal';
const GOAL_LABEL = 'Sprint goal';
const GOAL_PLACEHOLDER = 'Sprint goal, e.g. Ship dark mode';
const GO_LABEL = 'Go';
const CANCEL_LABEL = 'Cancel';
const PROGRESS_SEPARATOR = ' / ';
const PROGRESS_SUFFIX = ' tasks';
const TASK_CLASS = 'sprint-board__task';
const STATUS_CLASS = 'sprint-board__status';
const MODIFIER_SEPARATOR = '--';
const STATUS_LABELS: Readonly<Record<SprintStatus, string>> = { [SprintStatus.Planning]: 'Planning in the meeting room…', [SprintStatus.Active]: 'In progress', [SprintStatus.Closed]: 'Closed' };
const TASK_ICONS: Readonly<Record<TaskStatus, string>> = { [TaskStatus.Backlog]: '○', [TaskStatus.Active]: '⚔', [TaskStatus.Review]: '◔', [TaskStatus.Done]: '✔', [TaskStatus.Failed]: '✖' };
const UNKNOWN_ASSIGNEE = 'Someone';

function GoalForm({ onStart, onCancel }: GoalFormProps): React.JSX.Element {
  const [goal, setGoal] = useState('');
  const handleSubmit = (): void => {
    if (!isBlank(goal) && onStart(goal)) setGoal('');
  };
  return (
    <div className="sprint-board__form">
      <DSInput id={GOAL_FIELD_ID} value={goal} onChange={setGoal} placeholder={GOAL_PLACEHOLDER} maxLength={MAX_GOAL_LENGTH} onKeyDown={submitOnEnter(handleSubmit)} aria-label={GOAL_LABEL} shouldAutoFocus />
      <DSButton onClick={handleSubmit} isDisabled={isBlank(goal)} variant={DSButtonVariant.Primary}>
        {GO_LABEL}
      </DSButton>
      <DSButton onClick={onCancel}>{CANCEL_LABEL}</DSButton>
    </div>
  );
}

function TaskRow({ task, figures }: TaskRowProps): React.JSX.Element {
  const assignee = figures.find((figure: Figure): boolean => figure.id === task.assigneeId)?.name ?? UNKNOWN_ASSIGNEE;
  return (
    <li className={`${TASK_CLASS} ${TASK_CLASS}${MODIFIER_SEPARATOR}${task.status}`} title={task.status}>
      <span aria-hidden="true">{TASK_ICONS[task.status]}</span>
      <span className="sprint-board__assignee">{assignee}</span>
      <span className="sprint-board__title">{task.title}</span>
    </li>
  );
}

function SprintSummary({ sprint, tasks, figures }: SprintSummaryProps): React.JSX.Element {
  const progress = sprintProgress(sprint, tasks);
  return (
    <div className="sprint-board__summary">
      <div className="sprint-board__goal">
        <span className="sprint-board__goal-text">{sprint.goal}</span>
        <span className={`${STATUS_CLASS} ${STATUS_CLASS}${MODIFIER_SEPARATOR}${sprint.status}`}>{STATUS_LABELS[sprint.status]}</span>
      </div>
      {progress.total > 0 && <DSProgressBar fraction={progress.fraction} label={`${progress.done + progress.failed}${PROGRESS_SEPARATOR}${progress.total}${PROGRESS_SUFFIX}`} />}
      <ol className="sprint-board__tasks">
        {selectSprintTasks(sprint, tasks).map((task: Task): React.JSX.Element => <TaskRow key={task.id} task={task} figures={figures} />)}
      </ol>
    </div>
  );
}

/** The sprint strip of the HUD: start a sprint, watch the plan come in, follow the quests to the end. */
export function SprintBoard({ sprint, tasks, figures, canStart, onStart }: SprintBoardProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const isRunning = sprint !== null && sprint.status !== SprintStatus.Closed;
  const handleStart = (goal: string): boolean => {
    const isStarted = onStart(goal);
    if (isStarted) setIsEditing(false);
    return isStarted;
  };
  const handleEdit = (): void => setIsEditing(true);
  const handleCancel = (): void => setIsEditing(false);
  return (
    <section className="sprint-board" aria-label={BOARD_LABEL}>
      {sprint !== null && <SprintSummary sprint={sprint} tasks={tasks} figures={figures} />}
      {isEditing && <GoalForm onStart={handleStart} onCancel={handleCancel} />}
      {!isEditing && !isRunning && (
        <DSButton onClick={handleEdit} isDisabled={!canStart} title={canStart ? undefined : CANNOT_START_HINT} icon={START_ICON} variant={DSButtonVariant.Primary}>
          {sprint === null ? START_LABEL : NEW_SPRINT_LABEL}
        </DSButton>
      )}
    </section>
  );
}
