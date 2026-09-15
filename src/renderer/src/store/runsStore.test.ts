import { RunMode, RunStatus } from '@shared/agents';
import { MAX_LINES_PER_RUN, isRunActive, selectLatestRun, selectRunsForFigure, useRunsStore } from './runsStore';

const REGISTER = { id: 'run-1', floorId: 'f', figureId: 'frontend', prompt: 'p', mode: RunMode.ReadOnly };

afterEach((): void => {
  useRunsStore.setState({ runs: [], intakeStartedFloorIds: [] });
});

describe('useRunsStore', () => {
  it('registers a queued run and applies status, chunk and done events', (): void => {
    useRunsStore.getState().registerRun(REGISTER);
    useRunsStore.getState().applyEvent({ type: 'status', runId: 'run-1', status: RunStatus.Running });
    useRunsStore.getState().applyEvent({ type: 'chunk', runId: 'run-1', text: 'hello' });
    expect(isRunActive(selectLatestRun(useRunsStore.getState(), 'f', 'frontend'))).toBe(true);
    useRunsStore.getState().applyEvent({ type: 'done', runId: 'run-1', status: RunStatus.Done, result: 'report', error: null, costUsd: 0.1, turns: 2 });
    const run = selectLatestRun(useRunsStore.getState(), 'f', 'frontend');
    expect(run).toMatchObject({ status: RunStatus.Done, lines: ['hello'], result: 'report', costUsd: 0.1 });
    expect(run?.endedAt).not.toBeNull();
    expect(isRunActive(run)).toBe(false);
  });

  it('caps the stored lines and ignores events for unknown runs', (): void => {
    useRunsStore.getState().registerRun(REGISTER);
    for (let index = 0; index < MAX_LINES_PER_RUN + 10; index += 1) useRunsStore.getState().applyEvent({ type: 'chunk', runId: 'run-1', text: String(index) });
    expect(selectLatestRun(useRunsStore.getState(), 'f', 'frontend')?.lines).toHaveLength(MAX_LINES_PER_RUN);
    useRunsStore.getState().applyEvent({ type: 'chunk', runId: 'run-x', text: 'lost' });
    expect(useRunsStore.getState().runs).toHaveLength(1);
  });

  it('marks intake once per floor and clears a floor', (): void => {
    useRunsStore.getState().markIntakeStarted('f');
    useRunsStore.getState().markIntakeStarted('f');
    expect(useRunsStore.getState().intakeStartedFloorIds).toEqual(['f']);
    useRunsStore.getState().registerRun(REGISTER);
    useRunsStore.getState().clearFloor('f');
    expect(selectRunsForFigure(useRunsStore.getState(), 'f', 'frontend')).toEqual([]);
    expect(useRunsStore.getState().intakeStartedFloorIds).toEqual([]);
  });
});
