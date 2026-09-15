import { useEffect } from 'react';

import { RunMode, RunStatus } from '@shared/agents';
import { FigureState } from '@shared/figures';
import { SprintStatus, buildPlanningPrompt, findPlanner, parsePlan } from '@shared/sprints';
import { CEO_AUTHOR_ID } from '@shared/tasks';
import { isBlank } from '@shared/text';
import { useStartRun } from '../api/agentQueries';
import { GameEvent, gameEvents } from '../game/events';
import { useFloorsStore } from '../store/floorsStore';
import { useRunsStore } from '../store/runsStore';
import { isSprintFinished, sprintProgress, useSprintsStore } from '../store/sprintsStore';
import { useTasksStore } from '../store/tasksStore';

import type { AgentRun } from '@shared/agents';
import type { Figure } from '@shared/figures';
import type { Floor } from '@shared/floors';
import type { PlannedTask, Sprint } from '@shared/sprints';
import type { Task } from '@shared/tasks';
import type { FigureSaysPayload, SprintClosedPayload } from '../game/events';
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
const CLOSED_PREFIX = 'Sprint closed: ';
const DONE_SUFFIX = ' done';
const FAILED_SUFFIX = ' failed';
const COUNT_SEPARATOR = ', ';

function say(floorId: string, figureId: string, text: string): void {
  useTasksStore.getState().addMessage({ floorId, authorId: figureId, text });
  const payload: FigureSaysPayload = { floorId, figureId, text };
  gameEvents.emit(GameEvent.FigureSays, payload);
}

function setTeamState(floor: Floor, state: FigureState, except: readonly string[] = []): void {
  floor.figures.forEach((figure: Figure): void => {
    if (!except.includes(figure.id)) useFloorsStore.getState().setFigureState(floor.id, figure.id, state);
  });
}

/** The plan is in: hand every part out, let the rest go back to their desks, and open the sprint. */
function applyPlan(sprint: Sprint, floor: Floor, planned: readonly PlannedTask[], giveTask: GiveTask): void {
  const tasks = planned.map((part: PlannedTask): Task | null => {
    const task = giveTask.giveTaskOnFloor(floor.id, part.figureId, part.title);
    if (task !== null) say(floor.id, part.figureId, `${PART_PREFIX}${part.title}`);
    return task;
  });
  const taskIds = tasks.filter((task): task is Task => task !== null).map((task: Task): string => task.id);
  const planner = findPlanner(floor.figures);
  if (planner !== null) say(floor.id, planner.id, `${PLAN_READY_PREFIX}${taskIds.length}${PLAN_READY_SUFFIX}`);
  setTeamState(floor, FigureState.Idle, taskIds.length === 0 ? [] : planned.map((part: PlannedTask): string => part.figureId));
  useSprintsStore.getState().applyPlan(sprint.id, taskIds);
}

/** Reacts to the planning run ending, once per sprint. */
function handlePlanRun(sprint: Sprint, run: AgentRun, giveTask: GiveTask): void {
  const floor = useFloorsStore.getState().floors.find((candidate: Floor): boolean => candidate.id === sprint.floorId);
  if (floor === undefined) return;
  const planner = findPlanner(floor.figures);
  const planned = run.status === RunStatus.Done && run.result !== null ? parsePlan(run.result, floor.figures) : [];
  if (planned.length === 0) {
    if (planner !== null) say(floor.id, planner.id, NO_PLAN_TEXT);
    setTeamState(floor, FigureState.Idle);
    useSprintsStore.getState().closeSprint(sprint.id);
    return;
  }
  applyPlan(sprint, floor, planned, giveTask);
}

function closeFinishedSprint(sprint: Sprint, tasks: readonly Task[]): void {
  const progress = sprintProgress(sprint, tasks);
  useSprintsStore.getState().closeSprint(sprint.id);
  const floor = useFloorsStore.getState().floors.find((candidate: Floor): boolean => candidate.id === sprint.floorId);
  const planner = floor === undefined ? null : findPlanner(floor.figures);
  if (planner !== null) say(sprint.floorId, planner.id, `${CLOSED_PREFIX}${progress.done}${DONE_SUFFIX}${COUNT_SEPARATOR}${progress.failed}${FAILED_SUFFIX}.`);
  const payload: SprintClosedPayload = { floorId: sprint.floorId };
  gameEvents.emit(GameEvent.SprintClosed, payload);
}

/**
 * Sprint flow: the goal calls everyone to the meeting room, the product manager's claude session
 * splits it into a task per teammate, each part becomes a quest, and the sprint closes when they end.
 */
export function useSprints(giveTask: GiveTask, isClaudeAvailable: boolean): Sprints {
  const startRun = useStartRun();
  const { mutateAsync } = startRun;

  useEffect((): (() => void) => {
    const handled = new Set<string>();
    return useRunsStore.subscribe((runs): void => {
      useSprintsStore.getState().sprints.forEach((sprint: Sprint): void => {
        const run = runs.runs.find((candidate: AgentRun): boolean => candidate.id === sprint.planRunId);
        const hasEnded = run !== undefined && run.status !== RunStatus.Queued && run.status !== RunStatus.Running;
        if (sprint.status !== SprintStatus.Planning || !hasEnded || handled.has(sprint.id)) return;
        handled.add(sprint.id);
        handlePlanRun(sprint, run, giveTask);
      });
    });
  }, [giveTask]);

  useEffect((): (() => void) => {
    return useTasksStore.subscribe((state): void => {
      useSprintsStore.getState().sprints.forEach((sprint: Sprint): void => {
        if (isSprintFinished(sprint, state.tasks)) closeFinishedSprint(sprint, state.tasks);
      });
    });
  }, []);

  const startSprint = (goal: string): boolean => {
    const floor = useFloorsStore.getState().floors.find((candidate: Floor): boolean => candidate.id === useFloorsStore.getState().activeFloorId);
    const planner = floor === undefined ? null : findPlanner(floor.figures);
    const cwd = floor?.repoStatus.path ?? null;
    if (!isClaudeAvailable || floor === undefined || planner === null || cwd === null || isBlank(goal)) return false;
    const sprint = useSprintsStore.getState().startSprint({ floorId: floor.id, goal });
    useTasksStore.getState().addMessage({ floorId: floor.id, authorId: CEO_AUTHOR_ID, text: `${SPRINT_PREFIX}${sprint.goal}` });
    setTeamState(floor, FigureState.Meeting);
    say(floor.id, planner.id, MEETING_CALL);
    mutateAsync({ floorId: floor.id, figureId: planner.id, cwd, prompt: buildPlanningPrompt(planner, sprint.goal, floor.figures), mode: RunMode.ReadOnly, isPriority: true, sprintId: sprint.id }).catch((error: Error): void => {
      say(floor.id, planner.id, `${NO_PLAN_TEXT} (${error.message})`);
      setTeamState(floor, FigureState.Idle);
      useSprintsStore.getState().closeSprint(sprint.id);
    });
    return true;
  };

  return { startSprint };
}
