import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

vi.mock('phaser', async (): Promise<object> => (await import('../test/phaserMock')).phaserMock());

import { RunMode, RunStatus } from '@shared/agents';
import { DEFAULT_FIGURES } from '@shared/figures';
import { CEO_AUTHOR_ID } from '@shared/tasks';
import { useAgentEventsSubscription } from '../api/agentQueries';
import { useFloorsStore } from '../store/floorsStore';
import { useTasksStore } from '../store/tasksStore';
import { MOCK_RUN_ID, installOfficeMock, seedReadyFloor } from '../test/officeMock';
import { renderWithQueryClient } from '../test/renderWithQueryClient';
import { Hud } from './Hud';
import { useGiveTask } from './useGiveTask';
import { useSprints } from './useSprints';

import type React from 'react';
import type { Floor } from '@shared/floors';
import type { Task } from '@shared/tasks';
import type { OfficeMock } from '../test/officeMock';

const TEAM = DEFAULT_FIGURES.slice(0, 6);
let office: OfficeMock;
let floorId = '';

function HudHarness(): React.JSX.Element {
  useAgentEventsSubscription();
  const giveTask = useGiveTask(true);
  return <Hud giveTask={giveTask} sprints={useSprints(giveTask, true)} />;
}

beforeEach((): void => {
  office = installOfficeMock();
  floorId = seedReadyFloor(TEAM);
});

describe('Hud', (): void => {
  it('routes an ask to the matching figure, starts its run, and shows the reply when the run ends', async (): Promise<void> => {
    const user = userEvent.setup();
    renderWithQueryClient(<HudHarness />);
    await user.type(screen.getByLabelText('Chat'), 'write tests for the login bug{Enter}');

    expect(window.office.agents.start).toHaveBeenCalledWith(expect.objectContaining({ figureId: 'qa', mode: RunMode.ReadOnly }));
    expect(await screen.findByText('write tests for the login bug')).toBeInTheDocument();
    expect(screen.getByTitle('1 active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide chat history' })).toHaveAttribute('aria-expanded', 'true');
    await vi.waitFor((): void => expect(useTasksStore.getState().tasks[0]?.runId).toBe(MOCK_RUN_ID));

    act((): void => office.emitAgentEvent({ type: 'done', runId: MOCK_RUN_ID, status: RunStatus.Done, result: 'Three tests added.', error: null, costUsd: null, turns: 2 }));
    expect(await screen.findByText('Three tests added.')).toBeInTheDocument();
    expect(screen.getByText('Dan')).toBeInTheDocument();
    expect(screen.getByTitle('1 done')).toBeInTheDocument();
  });

  it('keeps both quests when two asks are sent back to back', async (): Promise<void> => {
    const user = userEvent.setup();
    renderWithQueryClient(<HudHarness />);
    await user.type(screen.getByLabelText('Chat'), '@Maya one{Enter}');
    await user.type(screen.getByLabelText('Chat'), '@Tom two{Enter}');
    await vi.waitFor((): void => expect(useTasksStore.getState().tasks.every((task: Task): boolean => task.runId === MOCK_RUN_ID)).toBe(true));
    expect(useTasksStore.getState().tasks).toHaveLength(2);
  });

  it('fails the quest and says so when the run cannot start', async (): Promise<void> => {
    const user = userEvent.setup();
    vi.mocked(window.office.agents.start).mockResolvedValue({ isOk: false, error: { code: 'x', message: 'claude is missing' } } as never);
    renderWithQueryClient(<HudHarness />);
    await user.type(screen.getByLabelText('Chat'), '@Maya do it{Enter}');
    expect(await screen.findByText("I couldn't start on that: claude is missing")).toBeInTheDocument();
    expect(screen.getByTitle('1 failed')).toBeInTheDocument();
  });

  it('explains when nobody can take the ask, or when only a mention was typed', async (): Promise<void> => {
    const user = userEvent.setup();
    renderWithQueryClient(<HudHarness />);
    await user.type(screen.getByLabelText('Chat'), '@Maya{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Say what to do after the @name.');
    useFloorsStore.setState({ floors: useFloorsStore.getState().floors.map((floor: Floor): Floor => ({ ...floor, figures: [] })) });
    await user.type(screen.getByLabelText('Chat'), 'hello?{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('Nobody is on this floor to ask.');
    expect(window.office.agents.start).not.toHaveBeenCalled();
  });

  it('shows only the last line collapsed and everything expanded', async (): Promise<void> => {
    const user = userEvent.setup();
    useTasksStore.getState().addMessage({ floorId, authorId: CEO_AUTHOR_ID, text: 'first' });
    useTasksStore.getState().addMessage({ floorId, authorId: 'qa', text: 'second' });
    renderWithQueryClient(<HudHarness />);
    expect(screen.queryByText('first')).not.toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show chat history' }));
    expect(screen.getByText('first')).toBeInTheDocument();
  });
});
