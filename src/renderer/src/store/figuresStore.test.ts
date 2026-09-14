import { vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { Accessory, DEFAULT_FIGURES, HairStyle, RoomKey } from '@shared/figures';
import { getFurniture } from '../game/world/furniture';
import { countFreeDesks, createFigure, findFreeDeskIndex, makeFigureId, useFiguresStore } from './figuresStore';

import type { Figure } from '@shared/figures';
import type { NewFigureInput } from './figuresStore';

const furniture = getFurniture();

const INPUT: NewFigureInput = {
  name: 'Ella Cohen',
  job: 'Mobile dev',
  room: RoomKey.ResearchAndDevelopment,
  look: { hairStyle: HairStyle.Long, hairColor: '#5a3a22', skinColor: '#f5c9a2', topColor: '#7b5cff', pantsColor: '#26305a', accessory: Accessory.None, accessoryColor: '#000000', hatColor: '#3a7bd5' },
  rolePrompt: 'You are the mobile developer.',
};

describe('makeFigureId', () => {
  it('slugs the name and adds a suffix when taken', () => {
    expect(makeFigureId('Ella Cohen', new Set())).toBe('ella-cohen');
    expect(makeFigureId('Ella Cohen', new Set(['ella-cohen']))).toBe('ella-cohen-2');
    expect(makeFigureId('!!!', new Set())).toBe('figure');
  });
});

describe('findFreeDeskIndex', () => {
  it('leaves every default room with at least one free desk', () => {
    const rooms = [RoomKey.ResearchAndDevelopment, RoomKey.Product, RoomKey.Marketing, RoomKey.Sales, RoomKey.Finance, RoomKey.Operations];
    rooms.forEach((room: RoomKey): void => expect(countFreeDesks(room, DEFAULT_FIGURES, furniture)).toBeGreaterThan(0));
  });

  it('returns null for rooms without desks', () => {
    expect(findFreeDeskIndex(RoomKey.Lobby, DEFAULT_FIGURES, furniture)).toBeNull();
    expect(findFreeDeskIndex(RoomKey.MeetingRoom, DEFAULT_FIGURES, furniture)).toBeNull();
  });

  it('fills the lowest free index first', () => {
    const withoutFirst = DEFAULT_FIGURES.filter((figure: Figure): boolean => figure.id !== 'frontend');
    expect(findFreeDeskIndex(RoomKey.ResearchAndDevelopment, withoutFirst, furniture)).toBe(0);
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

  it('returns null when the room is full', () => {
    expect(createFigure({ ...INPUT, room: RoomKey.Lobby }, DEFAULT_FIGURES, furniture)).toBeNull();
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
