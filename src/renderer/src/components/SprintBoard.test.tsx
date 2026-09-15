import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

vi.mock('phaser', async (): Promise<object> => (await import('../test/phaserMock')).phaserMock());

import { DEFAULT_FIGURES } from '@shared/figures';
import { SprintStatus } from '@shared/sprints';
import { TaskStatus } from '@shared/tasks';
import { SprintBoard } from './SprintBoard';

import type { Figure } from '@shared/figures';
import type { Sprint } from '@shared/sprints';
import type { Task } from '@shared/tasks';

const FIGURES: readonly Figure[] = DEFAULT_FIGURES.slice(0, 6);
const SPRINT: Sprint = { id: 's1', floorId: 'f1', goal: 'Ship dark mode', status: SprintStatus.Active, planRunId: 'run-1', taskIds: ['t1', 't2'], createdAt: '', closedAt: null };
const TASKS: readonly Task[] = [
  { id: 't1', floorId: 'f1', title: 'Add the toggle', assigneeId: 'frontend', status: TaskStatus.Done, runId: 'r1', createdAt: '' },
  { id: 't2', floorId: 'f1', title: 'Test both themes', assigneeId: 'qa', status: TaskStatus.Active, runId: 'r2', createdAt: '' },
];

describe('SprintBoard', (): void => {
  it('starts a sprint from the goal form and hides the button while one runs', async (): Promise<void> => {
    const user = userEvent.setup();
    const onStart = vi.fn().mockReturnValue(true);
    const { rerender } = render(<SprintBoard sprint={null} tasks={[]} figures={FIGURES} canStart onStart={onStart} />);
    await user.click(screen.getByRole('button', { name: 'Start sprint' }));
    await user.type(screen.getByLabelText('Sprint goal'), 'Ship dark mode{Enter}');
    expect(onStart).toHaveBeenCalledWith('Ship dark mode');
    rerender(<SprintBoard sprint={SPRINT} tasks={TASKS} figures={FIGURES} canStart onStart={onStart} />);
    expect(screen.queryByRole('button', { name: 'Start sprint' })).not.toBeInTheDocument();
    expect(screen.getByText('Ship dark mode')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '1 / 2 tasks' })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('Maya')).toBeInTheDocument();
    expect(screen.getByText('Test both themes')).toBeInTheDocument();
  });

  it('keeps the form open when the start is refused and closes it on Cancel', async (): Promise<void> => {
    const user = userEvent.setup();
    const onStart = vi.fn().mockReturnValue(false);
    render(<SprintBoard sprint={null} tasks={[]} figures={FIGURES} canStart onStart={onStart} />);
    await user.click(screen.getByRole('button', { name: 'Start sprint' }));
    await user.type(screen.getByLabelText('Sprint goal'), 'Ship it{Enter}');
    expect(onStart).toHaveBeenCalledWith('Ship it');
    expect(screen.getByLabelText('Sprint goal')).toHaveValue('Ship it');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Sprint goal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start sprint' })).toBeInTheDocument();
  });

  it('offers a new sprint once the last one closed and explains when it cannot start', (): void => {
    render(<SprintBoard sprint={{ ...SPRINT, status: SprintStatus.Closed }} tasks={TASKS} figures={FIGURES} canStart={false} onStart={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'New sprint' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Needs Claude Code and a repository on this floor.');
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });
});
