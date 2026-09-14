import { vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { DEFAULT_FIGURES, DEFAULT_LOOK, RoomKey } from '@shared/figures';
import { getFurniture } from '../game/world/furniture';
import { countFreeDesks, createFigure, findFreeDeskIndex, findRoomWithFreeDesk, makeFigureId, useFiguresStore } from './figuresStore';

import type { Figure } from '@shared/figures';
import type { NewFigureInput } from './figuresStore';

const furniture = getFurniture();

const INPUT: NewFigureInput = {
  name: 'Ella Cohen',
  job: 'Mobile dev',
  room: RoomKey.ResearchAndDevelopment,
  look: DEFAULT_LOOK,
  rolePrompt: 'You are the mobile developer.',
};

function resetStore(): void {
  useFiguresStore.setState({ figures: [...DEFAULT_FIGURES] });
}

afterEach(resetStore);

describe('makeFigureId', () => {
  it('slugs the name and adds a suffix when taken', () => {
    expect(makeFigureId('Ella Cohen', new Set())).toBe('ella-cohen');
    expect(makeFigureId('Ella Cohen', new Set(['ella-cohen']))).toBe('ella-cohen-2');
    expect(makeFigureId('!!!', new Set())).toBe('figure');
  });
});

describe('findFreeDeskIndex', () => {
  it('returns null for rooms without desks', () => {
    expect(findFreeDeskIndex(RoomKey.Lobby, DEFAULT_FIGURES, furniture)).toBeNull();
    expect(findFreeDeskIndex(RoomKey.MeetingRoom, DEFAULT_FIGURES, furniture)).toBeNull();
  });

  it('fills the lowest free index first', () => {
    const withoutFirst = DEFAULT_FIGURES.filter((figure: Figure): boolean => figure.id !== 'frontend');
    expect(findFreeDeskIndex(RoomKey.ResearchAndDevelopment, withoutFirst, furniture)).toBe(0);
  });

  it('returns null once every desk in the room is taken by a figure', () => {
    const salesDesks = countFreeDesks(RoomKey.Sales, [], furniture);
    const fullSales = Array.from({ length: salesDesks }, (_, index: number): Figure => ({ ...(DEFAULT_FIGURES[0] as Figure), id: `s${index}`, room: RoomKey.Sales, deskIndex: index }));
    expect(findFreeDeskIndex(RoomKey.Sales, fullSales, furniture)).toBeNull();
  });
});

describe('countFreeDesks', () => {
  it('leaves every default department with at least one free desk', () => {
    const rooms = [RoomKey.ResearchAndDevelopment, RoomKey.Product, RoomKey.Marketing, RoomKey.Sales, RoomKey.Finance, RoomKey.Operations];
    rooms.forEach((room: RoomKey): void => expect(countFreeDesks(room, DEFAULT_FIGURES, furniture)).toBeGreaterThan(0));
  });
});

describe('findRoomWithFreeDesk', () => {
  it('skips full rooms', () => {
    expect(findRoomWithFreeDesk([RoomKey.Lobby, RoomKey.Sales], DEFAULT_FIGURES, furniture)).toBe(RoomKey.Sales);
    expect(findRoomWithFreeDesk([RoomKey.Lobby], DEFAULT_FIGURES, furniture)).toBeUndefined();
  });
});

describe('createFigure', () => {
  it('builds a figure on the next free desk with trimmed text', () => {
    const figure = createFigure({ ...INPUT, name: '  Ella  ' }, DEFAULT_FIGURES, furniture);
    expect(figure).not.toBeNull();
    expect(figure?.name).toBe('Ella');
    expect(figure?.deskIndex).toBe(5);
    expect(figure?.level).toBe(1);
  });

  it('returns null when the room is full or the text is invalid', () => {
    expect(createFigure({ ...INPUT, room: RoomKey.Lobby }, DEFAULT_FIGURES, furniture)).toBeNull();
    expect(createFigure({ ...INPUT, name: '   ' }, DEFAULT_FIGURES, furniture)).toBeNull();
    expect(createFigure({ ...INPUT, job: 'x'.repeat(40) }, DEFAULT_FIGURES, furniture)).toBeNull();
  });
});

describe('useFiguresStore', () => {
  it('appends the figure and stops when the room runs out of desks', () => {
    const before = useFiguresStore.getState().figures.length;
    const added = useFiguresStore.getState().addFigure({ ...INPUT, room: RoomKey.Product });
    expect(added).not.toBeNull();
    expect(useFiguresStore.getState().figures).toHaveLength(before + 1);
    expect(useFiguresStore.getState().addFigure({ ...INPUT, room: RoomKey.Product })).toBeNull();
  });
});
