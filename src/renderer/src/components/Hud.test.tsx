import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

vi.mock('phaser', (): { default: object } => ({ default: { Events: { EventEmitter: class { on(): void {} off(): void {} emit(): void {} } } } }));

import { RunMode, RunStatus } from '@shared/agents';
import { DEFAULT_FIGURES } from '@shared/figures';
import { FloorSourceKind } from '@shared/floors';
import { useFloorsStore } from '../store/floorsStore';
import { useRunsStore } from '../store/runsStore';
import { useTasksStore } from '../store/tasksStore';
import { Hud } from './Hud';
import { useGiveTask } from './useGiveTask';

import type React from 'react';
import type { Figure } from '@shared/figures';

function HudHarness(): React.JSX.Element {
  return <Hud giveTask={useGiveTask(true)} />;
}

function renderHud(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HudHarness />
    </QueryClientProvider>,
  );
}

beforeEach((): void => {
  window.office = { version: 'test', platform: 'darwin', repo: { load: vi.fn(), useLocal: vi.fn(), getStatus: vi.fn(), pickFolder: vi.fn(), onStatus: vi.fn().mockReturnValue((): void => undefined) }, agents: { check: vi.fn(), start: vi.fn().mockResolvedValue({ isOk: true, data: 'run-1' }), cancel: vi.fn().mockResolvedValue({ isOk: true, data: null }), onEvent: vi.fn().mockReturnValue((): void => undefined) } };
  useFloorsStore.setState({ floors: [], activeFloorId: null });
  useRunsStore.setState({ runs: [], intakeStartedFloorIds: [] });
  useTasksStore.setState({ tasks: [], messages: [] });
  const floor = useFloorsStore.getState().createFloor({ name: 'Test', source: { kind: FloorSourceKind.Local, path: '/tmp/x' } });
  useFloorsStore.getState().setRepoStatus(floor.id, { state: 'ready', url: null, fullName: 'x', path: '/tmp/x', message: null } as never);
  DEFAULT_FIGURES.slice(0, 6).forEach((figure: Figure): void => useFloorsStore.getState().appendFigure(floor.id, figure));
});

describe('Hud', () => {
  it('routes an ask to the matching figure, starts its run, and shows the reply when it ends', async (): Promise<void> => {
    const user = userEvent.setup();
    renderHud();
    await user.type(screen.getByLabelText('Chat'), 'write tests for the login bug{Enter}');

    expect(window.office.agents.start).toHaveBeenCalledWith(expect.objectContaining({ figureId: 'qa', mode: RunMode.ReadOnly }));
    expect(await screen.findByText('write tests for the login bug')).toBeInTheDocument();
    expect(screen.getByTitle('1 active')).toBeInTheDocument();
    expect(useTasksStore.getState().tasks[0]?.runId).toBe('run-1');

    const floorId = useFloorsStore.getState().activeFloorId as string;
    useRunsStore.getState().registerRun({ id: 'run-1', floorId, figureId: 'qa', prompt: 'p', mode: RunMode.ReadOnly });
    useRunsStore.getState().applyEvent({ type: 'done', runId: 'run-1', status: RunStatus.Done, result: 'Three tests added.', error: null, costUsd: null, turns: 2 });
    const run = useRunsStore.getState().runs[0];
    if (run !== undefined) useTasksStore.getState().finishRun(run);
    expect(await screen.findByText('Three tests added.')).toBeInTheDocument();
    expect(screen.getByText('Dan')).toBeInTheDocument();
    expect(screen.getByTitle('1 done')).toBeInTheDocument();
  });

  it('explains when nobody can take the ask', async (): Promise<void> => {
    const user = userEvent.setup();
    useFloorsStore.setState({ floors: useFloorsStore.getState().floors.map((floor) => ({ ...floor, figures: [] })) });
    renderHud();
    await user.type(screen.getByLabelText('Chat'), 'hello?{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Nobody is on this floor to ask.');
    expect(window.office.agents.start).not.toHaveBeenCalled();
  });
});
