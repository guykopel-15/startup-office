import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { DEFAULT_FIGURES, RoomKey } from '@shared/figures';
import { getFurniture } from '../game/world/furniture';
import { useFloorsStore } from '../store/floorsStore';
import { FloorSourceKind } from '@shared/floors';
import { AddFigureDialog } from './AddFigureDialog';
import { buildRoomOptions, defaultRolePrompt, emptyForm, validateAddFigureForm } from './addFigureForm';

import type { Figure } from '@shared/figures';
import type { DSSelectOption } from '../designKit';

const furniture = getFurniture();

function fullSales(): Figure[] {
  const salesDesks = furniture.filter((piece): boolean => piece.room === RoomKey.Sales && piece.desk !== null).length;
  return Array.from({ length: salesDesks }, (_, index: number): Figure => ({ ...(DEFAULT_FIGURES[0] as Figure), id: `s${index}`, room: RoomKey.Sales, deskIndex: index }));
}

beforeAll((): void => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

function activeFigures(): Figure[] {
  return useFloorsStore.getState().floors[0]?.figures ?? [];
}

beforeEach((): void => {
  useFloorsStore.setState({ floors: [], activeFloorId: null });
  const floor = useFloorsStore.getState().createFloor({ name: 'Test', source: { kind: FloorSourceKind.Local, path: '/tmp/x' } });
  DEFAULT_FIGURES.forEach((figure: Figure): void => useFloorsStore.getState().appendFigure(floor.id, figure));
});

describe('validateAddFigureForm', () => {
  it('requires a name and a job', () => {
    const errors = validateAddFigureForm(emptyForm(DEFAULT_FIGURES, furniture), DEFAULT_FIGURES, furniture);
    expect(errors.name).toBeDefined();
    expect(errors.job).toBeDefined();
    expect(errors.room).toBeUndefined();
  });

  it('rejects a room whose desks are all taken', () => {
    const errors = validateAddFigureForm({ ...emptyForm(DEFAULT_FIGURES, furniture), name: 'A', job: 'B', room: RoomKey.Sales }, fullSales(), furniture);
    expect(errors.room).toBeDefined();
  });
});

describe('buildRoomOptions', () => {
  it('lists only seatable departments and disables full ones', () => {
    const options = buildRoomOptions(fullSales(), furniture);
    const values = options.map((option: DSSelectOption<RoomKey>): RoomKey => option.value);
    expect(values).not.toContain(RoomKey.Lobby);
    expect(values).not.toContain(RoomKey.MeetingRoom);
    const sales = options.find((option: DSSelectOption<RoomKey>): boolean => option.value === RoomKey.Sales);
    expect(sales?.isDisabled).toBe(true);
    expect(sales?.label).toContain('full');
  });
});

describe('emptyForm', () => {
  it('preselects the first department with a free desk', () => {
    expect(emptyForm(DEFAULT_FIGURES, furniture).room).toBe(RoomKey.ResearchAndDevelopment);
    const rndFull = DEFAULT_FIGURES.concat({ ...(DEFAULT_FIGURES[0] as Figure), id: 'extra', deskIndex: 5 });
    expect(emptyForm(rndFull, furniture).room).toBe(RoomKey.Product);
  });
});

describe('defaultRolePrompt', () => {
  it('uses the job in lower case', () => {
    expect(defaultRolePrompt('Mobile Dev')).toBe('You are the mobile dev. Work on what this role owns in the repo.');
  });
});

describe('AddFigureDialog', () => {
  it('keeps focus in the name field while typing', async () => {
    const user = userEvent.setup();
    render(<AddFigureDialog isOpen onClose={vi.fn()} />);
    const name = screen.getByLabelText('Name');
    expect(document.activeElement).toBe(name);
    await user.keyboard('Ella');
    expect(document.activeElement).toBe(name);
    expect(name).toHaveValue('Ella');
  });

  it('shows errors instead of adding when fields are empty', () => {
    const before = activeFigures().length;
    render(<AddFigureDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add to office' }));
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(activeFigures()).toHaveLength(before);
  });

  it('adds a figure to the chosen department and closes', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const before = activeFigures().length;
    render(<AddFigureDialog isOpen onClose={handleClose} />);
    await user.type(screen.getByLabelText('Name'), 'Ella');
    await user.type(screen.getByLabelText('Job'), 'Mobile dev');
    await user.selectOptions(screen.getByLabelText('Department'), RoomKey.Sales);
    await user.click(screen.getByRole('button', { name: 'Add to office' }));
    const figures = activeFigures();
    expect(figures).toHaveLength(before + 1);
    const added = figures[figures.length - 1] as Figure;
    expect(added.room).toBe(RoomKey.Sales);
    expect(added.rolePrompt).toContain('mobile dev');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
