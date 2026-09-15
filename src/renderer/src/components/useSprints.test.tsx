import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('phaser', async (): Promise<object> => (await import('../test/phaserMock')).phaserMock());

import { RunMode, RunStatus } from '@shared/agents';
import { DEFAULT_FIGURES, FigureState } from '@shared/figures';
import { SprintStatus } from '@shared/sprints';
import { TaskStatus } from '@shared/tasks';
import { useAgentEventsSubscription } from '../api/agentQueries';
import { GameEvent, gameEvents } from '../game/events';
import { useFloorsStore } from '../store/floorsStore';
import { useRunsStore } from '../store/runsStore';
import { useSprintsStore } from '../store/sprintsStore';
import { useTasksStore } from '../store/tasksStore';
import { installOfficeMock, lastMessageText, messageTexts, seedReadyFloor } from '../test/officeMock';
import { QueryWrapper } from '../test/renderWithQueryClient';
import { useGiveTask } from './useGiveTask';
import { useSprints } from './useSprints';

import type { Figure } from '@shared/figures';
import type { Floor } from '@shared/floors';
import type { Task } from '@shared/tasks';
import type { OfficeMock } from '../test/officeMock';
import type { Sprints } from './useSprints';

const TEAM: readonly Figure[] = DEFAULT_FIGURES.slice(0, 6);
const PLAN = '[{"figureId":"frontend","title":"Add the toggle"},{"figureId":"qa","title":"Test both themes"}]';
const PLAN_RUN_ID = 'run-1';
let office: OfficeMock;
let floorId = '';
let runCounter = 0;

function useHarness(): Sprints {
  useAgentEventsSubscription();
  return useSprints(useGiveTask(true), true);
}

function figureStates(): Record<string, FigureState> {
  const floor = useFloorsStore.getState().floors[0];
  return Object.fromEntries((floor?.figures ?? []).map((figure: Figure): [string, FigureState] => [figure.id, figure.state]));
}

function statesExcept(excluded: string): FigureState[] {
  return Object.entries(figureStates())
    .filter(([id]: [string, FigureState]): boolean => id !== excluded)
    .map(([, state]: [string, FigureState]): FigureState => state);
}

function finishRun(runId: string, status: RunStatus, result: string | null, error: string | null = null): void {
  act((): void => office.emitAgentEvent({ type: 'done', runId, status, result, error, costUsd: null, turns: 1 }));
}

beforeEach((): void => {
  office = installOfficeMock();
  floorId = seedReadyFloor(TEAM);
  runCounter = 0;
  vi.mocked(window.office.agents.start).mockImplementation(async (): Promise<never> => {
    runCounter += 1;
    return { isOk: true, data: `run-${runCounter}` } as never;
  });
});

describe('useSprints', (): void => {
  it('calls everyone to the meeting, plans with the product manager, hands out the parts, and closes with confetti', async (): Promise<void> => {
    const { result } = renderHook(useHarness, { wrapper: QueryWrapper });
    const closed = vi.fn();
    gameEvents.on(GameEvent.SprintClosed, closed);

    let isStarted = false;
    act((): void => {
      isStarted = result.current.startSprint('Ship dark mode');
    });
    expect(isStarted).toBe(true);
    expect(Object.values(figureStates()).every((state: FigureState): boolean => state === FigureState.Meeting)).toBe(true);
    await vi.waitFor((): void => expect(useSprintsStore.getState().sprints[0]?.planRunId).toBe(PLAN_RUN_ID));
    expect(window.office.agents.start).toHaveBeenCalledWith(expect.objectContaining({ figureId: 'pm', isPriority: true, prompt: expect.stringContaining('Ship dark mode') }));
    expect(messageTexts()).toEqual(['Sprint: Ship dark mode', "Everyone to the meeting room. I'll split this up."]);
    expect(result.current.startSprint('Another one')).toBe(false);

    finishRun(PLAN_RUN_ID, RunStatus.Done, PLAN);
    await vi.waitFor((): void => expect(useSprintsStore.getState().sprints[0]?.status).toBe(SprintStatus.Active));
    expect(useSprintsStore.getState().sprints[0]?.taskIds).toHaveLength(2);
    expect(useTasksStore.getState().tasks.map((task: Task): string => task.assigneeId)).toEqual(['frontend', 'qa']);
    expect(messageTexts()).toContain("I'll take: Add the toggle");
    expect(messageTexts()).toContain("Here's the plan: 2 tasks. Back to your desks!");
    const states = figureStates();
    expect(states['backend']).toBe(FigureState.Idle);
    expect(states['pm']).toBe(FigureState.Done);
    expect(states['frontend']).toBe(FigureState.Working);
    await vi.waitFor((): void => expect(useTasksStore.getState().tasks.every((task: Task): boolean => task.runId !== null)).toBe(true));

    const [first, second] = useTasksStore.getState().tasks;
    finishRun(first?.runId ?? '', RunStatus.Done, 'Toggle added.');
    expect(useSprintsStore.getState().sprints[0]?.status).toBe(SprintStatus.Active);
    finishRun(second?.runId ?? '', RunStatus.Error, null, 'boom');
    expect(useSprintsStore.getState().sprints[0]?.status).toBe(SprintStatus.Closed);
    expect(useTasksStore.getState().tasks.map((task: Task): TaskStatus => task.status)).toEqual([TaskStatus.Done, TaskStatus.Failed]);
    expect(lastMessageText()).toBe('Sprint closed: 1 done, 1 failed.');
    expect(closed).toHaveBeenCalledTimes(1);
    gameEvents.off(GameEvent.SprintClosed, closed);
  });

  it('holds everyone at the table while planning, then settles them into what their runs left', async (): Promise<void> => {
    const { result } = renderHook(useHarness, { wrapper: QueryWrapper });
    act((): void => void result.current.startSprint('Ship it'));
    await vi.waitFor((): void => expect(useSprintsStore.getState().sprints[0]?.planRunId).toBe(PLAN_RUN_ID));
    act((): void => useRunsStore.getState().registerRun({ id: 'intake-qa', floorId, figureId: 'qa', prompt: 'p', mode: RunMode.ReadOnly }));
    finishRun('intake-qa', RunStatus.Done, 'All fine.');
    expect(figureStates()['qa']).toBe(FigureState.Meeting);
    finishRun(PLAN_RUN_ID, RunStatus.Done, '[{"figureId":"frontend","title":"Add the toggle"},{"figureId":"backend","title":"Add the endpoint"}]');
    expect(figureStates()['qa']).toBe(FigureState.Done);
    expect(figureStates()['uiux']).toBe(FigureState.Idle);
  });

  it('closes the sprint and sends everyone back when the plan is empty or the meeting is cancelled', async (): Promise<void> => {
    const { result } = renderHook(useHarness, { wrapper: QueryWrapper });
    act((): void => void result.current.startSprint('Do something vague'));
    await vi.waitFor((): void => expect(useSprintsStore.getState().sprints[0]?.planRunId).toBe(PLAN_RUN_ID));
    finishRun(PLAN_RUN_ID, RunStatus.Done, 'I have no idea.');
    expect(useSprintsStore.getState().sprints[0]?.status).toBe(SprintStatus.Closed);
    // The planner's own run ended, so it shows done; everyone else went back to idle.
    expect(figureStates()['pm']).toBe(FigureState.Done);
    expect(statesExcept('pm').every((state: FigureState): boolean => state === FigureState.Idle)).toBe(true);
    expect(lastMessageText()).toContain("couldn't split");

    act((): void => void result.current.startSprint('Second try'));
    await vi.waitFor((): void => expect(useSprintsStore.getState().sprints[1]?.planRunId).toBe('run-2'));
    finishRun('run-2', RunStatus.Cancelled, null, 'cancelled');
    expect(useSprintsStore.getState().sprints[1]?.status).toBe(SprintStatus.Closed);
    expect(lastMessageText()).toBe('Meeting cancelled. Back to your desks.');
  });

  it('frees a figure whose quest could not start', async (): Promise<void> => {
    const { result } = renderHook(useHarness, { wrapper: QueryWrapper });
    act((): void => void result.current.startSprint('Ship it'));
    await vi.waitFor((): void => expect(useSprintsStore.getState().sprints[0]?.planRunId).toBe(PLAN_RUN_ID));
    vi.mocked(window.office.agents.start).mockResolvedValue({ isOk: false, error: { code: 'x', message: 'claude is gone' } } as never);
    finishRun(PLAN_RUN_ID, RunStatus.Done, PLAN);
    await vi.waitFor((): void => expect(useTasksStore.getState().tasks.every((task: Task): boolean => task.status === TaskStatus.Failed)).toBe(true));
    expect(figureStates()['frontend']).toBe(FigureState.Idle);
    expect(useSprintsStore.getState().sprints[0]?.status).toBe(SprintStatus.Closed);
  });

  it('refuses to start without a goal or a repository', (): void => {
    const { result } = renderHook(useHarness, { wrapper: QueryWrapper });
    expect(result.current.startSprint('   ')).toBe(false);
    useFloorsStore.setState({ floors: useFloorsStore.getState().floors.map((floor: Floor): Floor => ({ ...floor, repoStatus: { ...floor.repoStatus, path: null } })) });
    expect(result.current.startSprint('Ship it')).toBe(false);
    expect(useSprintsStore.getState().sprints).toHaveLength(0);
  });
});
