import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('phaser', async (): Promise<object> => (await import('../test/phaserMock')).phaserMock());

import { RunStatus } from '@shared/agents';
import { DEFAULT_FIGURES, FigureState } from '@shared/figures';
import { SprintStatus } from '@shared/sprints';
import { TaskStatus } from '@shared/tasks';
import { useAgentEventsSubscription } from '../api/agentQueries';
import { GameEvent, gameEvents } from '../game/events';
import { useFloorsStore } from '../store/floorsStore';
import { useSprintsStore } from '../store/sprintsStore';
import { useTasksStore } from '../store/tasksStore';
import { installOfficeMock, seedReadyFloor } from '../test/officeMock';
import { QueryWrapper } from '../test/renderWithQueryClient';
import { useGiveTask } from './useGiveTask';
import { useSprints } from './useSprints';

import type { Figure } from '@shared/figures';
import type { OfficeMock } from '../test/officeMock';
import type { Sprints } from './useSprints';

const TEAM: readonly Figure[] = DEFAULT_FIGURES.slice(0, 6);
const PLAN = '[{"figureId":"frontend","title":"Add the toggle"},{"figureId":"qa","title":"Test both themes"}]';
let office: OfficeMock;
let runCounter = 0;

function useHarness(): Sprints {
  useAgentEventsSubscription();
  return useSprints(useGiveTask(true), true);
}

function figureStates(): Record<string, FigureState> {
  const floor = useFloorsStore.getState().floors[0];
  return Object.fromEntries((floor?.figures ?? []).map((figure: Figure): [string, FigureState] => [figure.id, figure.state]));
}

beforeEach((): void => {
  office = installOfficeMock();
  useSprintsStore.setState({ sprints: [] });
  seedReadyFloor(TEAM);
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
    await vi.waitFor((): void => expect(useSprintsStore.getState().sprints[0]?.planRunId).toBe('run-1'));
    expect(window.office.agents.start).toHaveBeenCalledWith(expect.objectContaining({ figureId: 'pm', prompt: expect.stringContaining('Ship dark mode') }));
    expect(useTasksStore.getState().messages.map((message): string => message.text)).toEqual(['Sprint: Ship dark mode', "Everyone to the meeting room. I'll split this up."]);

    act((): void => office.emitAgentEvent({ type: 'done', runId: 'run-1', status: RunStatus.Done, result: PLAN, error: null, costUsd: null, turns: 3 }));
    await vi.waitFor((): void => expect(useSprintsStore.getState().sprints[0]?.status).toBe(SprintStatus.Active));
    const sprint = useSprintsStore.getState().sprints[0];
    expect(sprint?.taskIds).toHaveLength(2);
    expect(useTasksStore.getState().tasks.map((task): string => task.assigneeId)).toEqual(['frontend', 'qa']);
    expect(useTasksStore.getState().messages.map((message): string => message.text)).toContain("I'll take: Add the toggle");
    expect(useTasksStore.getState().messages.map((message): string => message.text)).toContain("Here's the plan: 2 tasks. Back to your desks!");
    const states = figureStates();
    expect(states['backend']).toBe(FigureState.Idle);
    expect(states['pm']).toBe(FigureState.Done);
    expect(states['frontend']).toBe(FigureState.Meeting);
    await vi.waitFor((): void => expect(useTasksStore.getState().tasks.every((task): boolean => task.runId !== null)).toBe(true));

    const [first, second] = useTasksStore.getState().tasks;
    act((): void => office.emitAgentEvent({ type: 'done', runId: first?.runId ?? '', status: RunStatus.Done, result: 'Toggle added.', error: null, costUsd: null, turns: 2 }));
    expect(useSprintsStore.getState().sprints[0]?.status).toBe(SprintStatus.Active);
    act((): void => office.emitAgentEvent({ type: 'done', runId: second?.runId ?? '', status: RunStatus.Error, result: null, error: 'boom', costUsd: null, turns: 1 }));
    expect(useSprintsStore.getState().sprints[0]?.status).toBe(SprintStatus.Closed);
    expect(useTasksStore.getState().tasks.map((task): TaskStatus => task.status)).toEqual([TaskStatus.Done, TaskStatus.Failed]);
    expect(useTasksStore.getState().messages[useTasksStore.getState().messages.length - 1]?.text).toBe('Sprint closed: 1 done, 1 failed.');
    expect(closed).toHaveBeenCalledTimes(1);
    gameEvents.off(GameEvent.SprintClosed, closed);
  });

  it('closes the sprint and sends everyone back when the plan is empty', async (): Promise<void> => {
    const { result } = renderHook(useHarness, { wrapper: QueryWrapper });
    act((): void => void result.current.startSprint('Do something vague'));
    await vi.waitFor((): void => expect(useSprintsStore.getState().sprints[0]?.planRunId).toBe('run-1'));
    act((): void => office.emitAgentEvent({ type: 'done', runId: 'run-1', status: RunStatus.Done, result: 'I have no idea.', error: null, costUsd: null, turns: 1 }));
    expect(useSprintsStore.getState().sprints[0]?.status).toBe(SprintStatus.Closed);
    // The planner's own run ended, so it shows done; everyone else went back to idle.
    const states = figureStates();
    expect(states['pm']).toBe(FigureState.Done);
    expect(Object.entries(states).filter(([id]): boolean => id !== 'pm').every(([, state]): boolean => state === FigureState.Idle)).toBe(true);
    expect(useTasksStore.getState().messages[useTasksStore.getState().messages.length - 1]?.text).toContain("couldn't split");
  });

  it('refuses to start without a goal or a repository', (): void => {
    const { result } = renderHook(useHarness, { wrapper: QueryWrapper });
    expect(result.current.startSprint('   ')).toBe(false);
    useFloorsStore.setState({ floors: useFloorsStore.getState().floors.map((floor) => ({ ...floor, repoStatus: { ...floor.repoStatus, path: null } })) });
    expect(result.current.startSprint('Ship it')).toBe(false);
    expect(useSprintsStore.getState().sprints).toHaveLength(0);
  });
});
