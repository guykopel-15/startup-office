import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

vi.mock('phaser', async (): Promise<{ default: object }> => {
  const { EventEmitter } = await import('node:events');
  return { default: { Events: { EventEmitter } } };
});

import { RunMode, RunStatus } from '@shared/agents';
import { DEFAULT_FIGURES } from '@shared/figures';
import { FloorSourceKind } from '@shared/floors';
import { GameEvent, gameEvents } from '../game/events';
import { useFloorsStore } from '../store/floorsStore';
import { useRunsStore } from '../store/runsStore';
import { useTasksStore } from '../store/tasksStore';
import { DialogBox } from './DialogBox';
import { dialogGreeting } from './dialogText';
import { useDialogBox } from './useDialogBox';
import { useGiveTask } from './useGiveTask';

import type React from 'react';
import type { AgentRun } from '@shared/agents';
import type { Figure } from '@shared/figures';

const onShowWork = vi.fn();
const MAYA = DEFAULT_FIGURES[0] as Figure;
const RUN: AgentRun = { id: 'r', floorId: 'f', figureId: 'frontend', prompt: 'p', mode: RunMode.ReadOnly, status: RunStatus.Running, lines: ['▸ Read src/app.ts'], result: null, error: null, costUsd: null, turns: null, startedAt: '', endedAt: null };

function DialogHarness(): React.JSX.Element {
  return <DialogBox dialog={useDialogBox(useGiveTask(true), onShowWork)} />;
}

function renderDialog(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DialogHarness />
    </QueryClientProvider>,
  );
}

beforeEach((): void => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  onShowWork.mockReset();
  window.office = { version: 'test', platform: 'darwin', repo: { load: vi.fn(), useLocal: vi.fn(), getStatus: vi.fn(), pickFolder: vi.fn(), onStatus: vi.fn().mockReturnValue((): void => undefined) }, agents: { check: vi.fn(), start: vi.fn().mockResolvedValue({ isOk: true, data: 'run-1' }), cancel: vi.fn().mockResolvedValue({ isOk: true, data: null }), onEvent: vi.fn().mockReturnValue((): void => undefined) } };
  useFloorsStore.setState({ floors: [], activeFloorId: null });
  useRunsStore.setState({ runs: [], intakeStartedFloorIds: [] });
  useTasksStore.setState({ tasks: [], messages: [] });
  const floor = useFloorsStore.getState().createFloor({ name: 'Test', source: { kind: FloorSourceKind.Local, path: '/tmp/x' } });
  useFloorsStore.getState().setRepoStatus(floor.id, { state: 'ready', url: null, fullName: 'x', path: '/tmp/x', message: null } as never);
  useFloorsStore.getState().appendFigure(floor.id, MAYA);
});

afterEach((): void => {
  vi.useRealTimers();
});

describe('dialogGreeting', () => {
  it('greets when idle, reports progress while working, and quotes the result when done', (): void => {
    expect(dialogGreeting(MAYA, null)).toBe("Hi boss! I'm Maya, the frontend dev. What do you need?");
    expect(dialogGreeting(MAYA, RUN)).toBe('On it, boss. Reading app.ts');
    expect(dialogGreeting(MAYA, { ...RUN, status: RunStatus.Queued })).toContain('queue');
    expect(dialogGreeting(MAYA, { ...RUN, status: RunStatus.Done, result: '**Done.** All good.' })).toBe('Done. All good.');
  });
});

describe('DialogBox', () => {
  it('opens on a figure click, types the greeting, and hands a task to the figure', async (): Promise<void> => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderDialog();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act((): void => void gameEvents.emit(GameEvent.FigureClicked, { figureId: 'frontend' }));
    expect(screen.getByRole('dialog', { name: 'Talk to Maya' })).toBeInTheDocument();
    await act(async (): Promise<void> => void (await vi.advanceTimersByTimeAsync(2000)));
    expect(screen.getByText("Hi boss! I'm Maya, the frontend dev. What do you need?")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Give a task' }));
    await user.type(screen.getByLabelText('What should I do?'), 'Fix the header{Enter}');
    expect(window.office.agents.start).toHaveBeenCalledWith(expect.objectContaining({ figureId: 'frontend' }));
    expect(useTasksStore.getState().tasks[0]).toMatchObject({ title: 'Fix the header', assigneeId: 'frontend' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the agent panel from Show your work and closes on Bye', async (): Promise<void> => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderDialog();
    act((): void => void gameEvents.emit(GameEvent.FigureClicked, { figureId: 'frontend' }));
    await user.click(screen.getByRole('button', { name: 'Show your work' }));
    expect(onShowWork).toHaveBeenCalledWith('frontend');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act((): void => void gameEvents.emit(GameEvent.FigureClicked, { figureId: 'frontend' }));
    await user.click(screen.getByRole('button', { name: 'Bye' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
