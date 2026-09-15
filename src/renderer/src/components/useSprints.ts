import { useEffect } from 'react';

import { RunMode, RunStatus } from '@shared/agents';
import { FigureState } from '@shared/figures';
import { SprintStatus, buildPlanningPrompt, findPlanner, parsePlan } from '@shared/sprints';
import { CEO_AUTHOR_ID } from '@shared/tasks';
import { isBlank } from '@shared/text';
import { useStartRun } from '../api/agentQueries';
import { GameEvent, gameEvents } from '../game/events';
import { selectActiveFloor, selectFloor, useFloorsStore } from '../store/floorsStore';
import { selectLatestRun, useRunsStore } from '../store/runsStore';
import { isSprintFinished, selectSprintForFloor, sprintProgress, useSprintsStore } from '../store/sprintsStore';
import { useTasksStore } from '../store/tasksStore';

import type { AgentRun } from '@shared/agents';
import type { Figure } from '@shared/figures';
import type { Floor } from '@shared/floors';
import type { PlannedTask, Sprint } from '@shared/sprints';
import type { Task } from '@shared/tasks';
import type { FigureSaysPayload, SprintClosedPayload } from '../game/events';
import type { RunsState } from '../store/runsStore';
import type { TasksState } from '../store/tasksStore';
import type { GiveTask } from './useGiveTask';

export interface Sprints {
  /** Opens the planning meeting on the active floor. False when it cannot start. */
  startSprint: (goal: string) => boolean;
}

const SPRINT_PREFIX = 'Sprint: ';
const MEETING_CALL = "Everyone to the meeting room. I'll split this up.";
const PART_PREFIX = "I'll take: ";
const PLAN_READY_PREFIX = "Here's the plan: ";
const PLAN_READY_SUFFIX = ' tasks. Back to your desks!';
const NO_PLAN_TEXT = "I couldn't split that goal into tasks. Try a more concrete one.";
const MEETING_CANCELLED_TEXT = 'Meeting cancelled. Back to your desks.';
const REASON_PREFIX = ' (';
const REASON_SUFFIX = ')';
const CLOSED_PREFIX = 'Sprint closed: ';
const DONE_SUFFIX = ' done';
const FAILED_SUFFIX = ' failed';
const COUNT_SEPARATOR = ', ';
const SENTENCE_END = '.';

/** What a figure settles into after the meeting: what its latest run left it with, or idle. */
const RESTING_STATE_BY_RUN_STATUS: Readonly<Partial<Record<RunStatus, FigureState>>> = {
  [RunStatus.Done]: FigureState.Done,
  [RunStatus.Error]: FigureState.Error,
};

function say(floorId: string, figureId: string, text: string): void {
  useTasksStore.getState().addMessage({ floorId, authorId: figureId, text });
  const payload: FigureSaysPayload = { floorId, figureId, text };
  gameEvents.emit(GameEvent.FigureSays, payload);
}

function sayAsPlanner(floor: Floor, text: string): void {
  const planner = findPlanner(floor.figures);
  if (planner !== null) say(floor.id, planner.id, text);
}

function restingState(floorId: string, figureId: string): FigureState {
  const run = selectLatestRun(useRunsStore.getState(), floorId, figureId);
  return (run === null ? undefined : RESTING_STATE_BY_RUN_STATUS[run.status]) ?? FigureState.Idle;
}

/** Everyone not in `working` goes back to what their runs left them with; run events were held during the meeting. */
function dismissMeeting(floor: Floor, working: readonly string[]): void {
  floor.figures.forEach((figure: Figure): void => {
    const state = working.includes(figure.id) ? FigureState.Working : restingState(floor.id, figure.id);
    useFloorsStore.getState().setFigureState(floor.id, figure.id, state);
  });
}

/** The plan is in: hand every part out, let the rest go back to their desks, and open the sprint. */
function applyPlan(sprint: Sprint, floor: Floor, planned: readonly PlannedTask[], giveTask: GiveTask): void {
  const tasks = planned
    .map((part: PlannedTask): Task | null => {
      const task = giveTask.giveTaskOnFloor(floor.id, part.figureId, part.title);
      if (task !== null) say(floor.id, part.figureId, `${PART_PREFIX}${part.title}`);
      return task;
    })
    .filter((task: Task | null): task is Task => task !== null);
  sayAsPlanner(floor, `${PLAN_READY_PREFIX}${tasks.length}${PLAN_READY_SUFFIX}`);
  dismissMeeting(floor, tasks.map((task: Task): string => task.assigneeId));
  useSprintsStore.getState().applyPlan(sprint.id, tasks.map((task: Task): string => task.id));
}

/** Reacts to the planning run ending, once per sprint. */
function handlePlanRun(sprint: Sprint, run: AgentRun, giveTask: GiveTask): void {
  const floor = selectFloor(useFloorsStore.getState(), sprint.floorId);
  if (floor === null) return;
  const planned = run.status === RunStatus.Done && run.result !== null ? parsePlan(run.result, floor.figures) : [];
  if (planned.length > 0) {
    applyPlan(sprint, floor, planned, giveTask);
    return;
  }
  sayAsPlanner(floor, run.status === RunStatus.Cancelled ? MEETING_CANCELLED_TEXT : NO_PLAN_TEXT);
  dismissMeeting(floor, []);
  useSprintsStore.getState().closeSprint(sprint.id);
}

function closeFinishedSprint(sprint: Sprint, tasks: readonly Task[]): void {
  const progress = sprintProgress(sprint, tasks);
  useSprintsStore.getState().closeSprint(sprint.id);
  const floor = selectFloor(useFloorsStore.getState(), sprint.floorId);
  if (floor !== null) sayAsPlanner(floor, `${CLOSED_PREFIX}${progress.done}${DONE_SUFFIX}${COUNT_SEPARATOR}${progress.failed}${FAILED_SUFFIX}${SENTENCE_END}`);
  const payload: SprintClosedPayload = { floorId: sprint.floorId };
  gameEvents.emit(GameEvent.SprintClosed, payload);
}

function hasEnded(run: AgentRun | undefined): run is AgentRun {
  return run !== undefined && run.status !== RunStatus.Queued && run.status !== RunStatus.Running;
}

/** Watches every planning run; when one ends its sprint gets its plan (or closes). */
function usePlanRunWatcher(giveTask: GiveTask): void {
  useEffect((): (() => void) => {
    return useRunsStore.subscribe((runs: RunsState): void => {
      useSprintsStore.getState().sprints.forEach((sprint: Sprint): void => {
        const run = runs.runs.find((candidate: AgentRun): boolean => candidate.id === sprint.planRunId);
        // Handling flips the status away from Planning, so a sprint is handled exactly once.
        if (sprint.status === SprintStatus.Planning && hasEnded(run)) handlePlanRun(sprint, run, giveTask);
      });
    });
  }, [giveTask]);
}

/** Closes an active sprint once every quest of it ended. */
function useSprintCloser(): void {
  useEffect((): (() => void) => {
    return useTasksStore.subscribe((state: TasksState): void => {
      useSprintsStore.getState().sprints.forEach((sprint: Sprint): void => {
        if (isSprintFinished(sprint, state.tasks)) closeFinishedSprint(sprint, state.tasks);
      });
    });
  }, []);
}

/**
 * Sprint flow: the goal calls everyone to the meeting room, the product manager's claude session
 * splits it into a task per teammate, each part becomes a quest, and the sprint closes when they end.
 */
export function useSprints(giveTask: GiveTask, isClaudeAvailable: boolean): Sprints {
  const startRun = useStartRun();
  const { mutateAsync } = startRun;
  usePlanRunWatcher(giveTask);
  useSprintCloser();

  const startSprint = (goal: string): boolean => {
    const floor = selectActiveFloor(useFloorsStore.getState());
    const planner = floor === null ? null : findPlanner(floor.figures);
    const cwd = floor?.repoStatus.path ?? null;
    const current = floor === null ? null : selectSprintForFloor(useSprintsStore.getState(), floor.id);
    const isBusy = current !== null && current.status !== SprintStatus.Closed;
    if (!isClaudeAvailable || floor === null || planner === null || cwd === null || isBlank(goal) || isBusy) return false;
    const sprint = useSprintsStore.getState().startSprint({ floorId: floor.id, goal });
    useTasksStore.getState().addMessage({ floorId: floor.id, authorId: CEO_AUTHOR_ID, text: `${SPRINT_PREFIX}${sprint.goal}` });
    floor.figures.forEach((figure: Figure): void => useFloorsStore.getState().setFigureState(floor.id, figure.id, FigureState.Meeting));
    say(floor.id, planner.id, MEETING_CALL);
    mutateAsync({ floorId: floor.id, figureId: planner.id, cwd, prompt: buildPlanningPrompt(planner, sprint.goal, floor.figures), mode: RunMode.ReadOnly, isPriority: true, sprintId: sprint.id }).catch((error: Error): void => {
      sayAsPlanner(floor, `${NO_PLAN_TEXT}${REASON_PREFIX}${error.message}${REASON_SUFFIX}`);
      dismissMeeting(floor, []);
      useSprintsStore.getState().closeSprint(sprint.id);
    });
    return true;
  };

  return { startSprint };
}
