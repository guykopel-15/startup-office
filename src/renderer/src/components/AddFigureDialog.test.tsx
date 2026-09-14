import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { RoomKey } from '@shared/figures';
import { getFurniture } from '../game/world/furniture';
import { useFiguresStore } from '../store/figuresStore';
import { AddFigureDialog } from './AddFigureDialog';
import { EMPTY_FORM, buildRoomOptions, defaultRolePrompt, validateAddFigureForm } from './addFigureForm';

import type { Figure } from '@shared/figures';

const furniture = getFurniture();

beforeAll((): void => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('validateAddFigureForm', () => {
  it('requires a name and a job', () => {
    const errors = validateAddFigureForm(EMPTY_FORM, useFiguresStore.getState().figures, furniture);
    expect(errors.name).toBeDefined();
    expect(errors.job).toBeDefined();
    expect(errors.room).toBeUndefined();
  });

  it('rejects a room with no free desk', () => {
    const errors = validateAddFigureForm({ ...EMPTY_FORM, name: 'A', job: 'B', room: RoomKey.Lobby }, [], furniture);
    expect(errors.room).toBeDefined();
  });
});

describe('buildRoomOptions', () => {
  it('lists every department with its free seats and disables full ones', () => {
    const options = buildRoomOptions(useFiguresStore.getState().figures, furniture);
    expect(options.map((option) => option.value)).not.toContain(RoomKey.Lobby);
    expect(options.map((option) => option.value)).not.toContain(RoomKey.MeetingRoom);
    expect(options.every((option) => option.label.includes('seat') || option.label.includes('full'))).toBe(true);
  });
});

describe('defaultRolePrompt', () => {
  it('uses the job in lower case', () => {
    expect(defaultRolePrompt('Mobile Dev')).toBe('You are the mobile dev. Work on what this role owns in the repo.');
  });
});

describe('AddFigureDialog', () => {
  it('shows errors instead of adding when fields are empty', () => {
    const before = useFiguresStore.getState().figures.length;
    render(<AddFigureDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add to office' }));
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(useFiguresStore.getState().figures).toHaveLength(before);
  });

  it('adds a figure to the chosen department and closes', () => {
    const handleClose = vi.fn();
    const before = useFiguresStore.getState().figures.length;
    render(<AddFigureDialog isOpen onClose={handleClose} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ella' } });
    fireEvent.change(screen.getByLabelText('Job'), { target: { value: 'Mobile dev' } });
    fireEvent.change(screen.getByLabelText('Department'), { target: { value: RoomKey.Sales } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to office' }));
    const figures = useFiguresStore.getState().figures;
    expect(figures).toHaveLength(before + 1);
    const added = figures[figures.length - 1] as Figure;
    expect(added.room).toBe(RoomKey.Sales);
    expect(added.rolePrompt).toContain('mobile dev');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
