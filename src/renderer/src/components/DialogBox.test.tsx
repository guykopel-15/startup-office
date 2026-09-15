import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

vi.mock('phaser', async (): Promise<object> => (await import('../test/phaserMock')).phaserMock());

import { RunMode, RunStatus } from '@shared/agents';
import { DEFAULT_FIGURES } from '@shared/figures';
import { FloorSourceKind } from '@shared/floors';
import { GameEvent, gameEvents } from '../game/events';
import { useFloorsStore } from '../store/floorsStore';
import { useRunsStore } from '../store/runsStore';
import { useTasksStore } from '../store/tasksStore';
import { installOfficeMock, seedReadyFloor } from '../test/officeMock';
import { renderWithQueryClient } from '../test/renderWithQueryClient';
import { DialogBox } from './DialogBox';
import { dialogGreeting } from './dialogText';
import { useDialogBox } from './useDialogBox';
import { useGiveTask } from './useGiveTask';

import type React from 'react';
import type { AgentRun } from '@shared/agents';
import type { Figure } from '@shared/figures';
import type { FigureClickedPayload } from '../game/events';

const callbacks = { onShowWork: vi.fn(), onOpen: vi.fn() };
const MAYA = DEFAULT_FIGURES[0] as Figure;
const GREETING = "Hi boss! I'm Maya, the frontend dev. What do you need?";
const TYPEWRITER_MS = 2000;
const TEXT_SELECTOR = '.dialog-box__text';
let floorId = '';
const RUN: AgentRun = { id: 'r', floorId: 'f', figureId: 'frontend', prompt: 'p', mode: RunMode.ReadOnly, status: RunStatus.Running, lines: ['▸ Read src/app.ts'], result: null, error: null, costUsd: null, turns: null, startedAt: '', endedAt: null };

function DialogHarness(): React.JSX.Element {
  return <DialogBox dialog={useDialogBox(useGiveTask(true), callbacks)} />;
}

function clickFigure(figureId: string): void {
  const payload: FigureClickedPayload = { figureId };
  act((): void => void gameEvents.emit(GameEvent.FigureClicked, payload));
}

async function finishTyping(): Promise<void> {
  await act(async (): Promise<void> => void (await vi.advanceTimersByTimeAsync(TYPEWRITER_MS)));
}

beforeEach((): void => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  callbacks.onShowWork.mockReset();
  callbacks.onOpen.mockReset();
  installOfficeMock();
  floorId = seedReadyFloor([MAYA]);
});

afterEach((): void => {
  vi.useRealTimers();
});

describe('dialogGreeting', (): void => {
  it('greets when idle, reports progress while working, and quotes the result when done', (): void => {
    expect(dialogGreeting(MAYA, null)).toBe(GREETING);
    expect(dialogGreeting(MAYA, RUN)).toBe('On it, boss. Reading app.ts');
    expect(dialogGreeting(MAYA, { ...RUN, status: RunStatus.Queued })).toContain('queue');
    expect(dialogGreeting(MAYA, { ...RUN, status: RunStatus.Done, result: '**Done.** All good.' })).toBe('Done. All good.');
  });
});

describe('DialogBox', (): void => {
  it('opens on a figure click, types the greeting, and hands a task to the figure', async (): Promise<void> => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithQueryClient(<DialogHarness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    clickFigure('frontend');
    expect(screen.getByRole('dialog', { name: 'Talk to Maya' })).toBeInTheDocument();
    expect(callbacks.onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Give a task' })).toHaveFocus();
    await finishTyping();
    expect(screen.getByText(GREETING)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Give a task' }));
    expect(screen.getByLabelText('What should I do?')).toHaveFocus();
    await user.type(screen.getByLabelText('What should I do?'), 'Fix the header{Enter}');
    expect(window.office.agents.start).toHaveBeenCalledWith(expect.objectContaining({ figureId: 'frontend' }));
    expect(useTasksStore.getState().tasks[0]).toMatchObject({ title: 'Fix the header', assigneeId: 'frontend' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the greeting it opened with while the run streams, and reveals it all on click', async (): Promise<void> => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    useRunsStore.getState().registerRun({ id: 'run-1', floorId, figureId: 'frontend', prompt: 'p', mode: RunMode.ReadOnly });
    useRunsStore.getState().applyEvent({ type: 'status', runId: 'run-1', status: RunStatus.Running });
    useRunsStore.getState().applyEvent({ type: 'chunk', runId: 'run-1', text: 'first line' });
    renderWithQueryClient(<DialogHarness />);
    clickFigure('frontend');
    await user.click(screen.getByRole('dialog').querySelector(TEXT_SELECTOR) as HTMLElement);
    expect(screen.getByText('On it, boss. first line')).toBeInTheDocument();
    act((): void => useRunsStore.getState().applyEvent({ type: 'chunk', runId: 'run-1', text: 'second line' }));
    expect(screen.getByText('On it, boss. first line')).toBeInTheDocument();
  });

  it('opens the agent panel from Show your work, closes on Bye and on Escape', async (): Promise<void> => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithQueryClient(<DialogHarness />);
    clickFigure('frontend');
    await user.click(screen.getByRole('button', { name: 'Show your work' }));
    expect(callbacks.onShowWork).toHaveBeenCalledWith('frontend');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    clickFigure('frontend');
    await user.click(screen.getByRole('button', { name: 'Bye' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    clickFigure('frontend');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when the active floor changes', async (): Promise<void> => {
    renderWithQueryClient(<DialogHarness />);
    clickFigure('frontend');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    act((): void => void useFloorsStore.getState().createFloor({ name: 'Other', source: { kind: FloorSourceKind.Local, path: '/tmp/y' } }));
    await vi.waitFor((): void => void expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
