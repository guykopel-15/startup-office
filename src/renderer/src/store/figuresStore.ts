import { create } from 'zustand';

import { DEFAULT_FIGURES, FigureState } from '@shared/figures';
import { getFurniture, isSeat } from '../game/world/furniture';

import type { Figure, FigureLook, RoomKey } from '@shared/figures';
import type { Furniture } from '../game/world/furniture';

/** What the Add figure dialog collects. The store fills in id, desk, state, level and experience. */
export interface NewFigureInput {
  name: string;
  job: string;
  room: RoomKey;
  look: FigureLook;
  rolePrompt: string;
}

export interface FiguresState {
  figures: Figure[];
  /** Returns the new figure, or null when the room has no free desk. */
  addFigure: (input: NewFigureInput) => Figure | null;
}

const STARTING_LEVEL = 1;
const STARTING_EXPERIENCE = 0;
const ID_SUFFIX_START = 2;
const NON_SLUG_CHARACTERS = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-|-$/g;

export function countDesks(room: RoomKey, furniture: readonly Furniture[]): number {
  return furniture.filter((piece: Furniture): boolean => piece.room === room && isSeat(piece)).length;
}

/** First desk index in the room not taken by any figure, or null when the room is full. */
export function findFreeDeskIndex(room: RoomKey, figures: readonly Figure[], furniture: readonly Furniture[]): number | null {
  const taken = new Set(figures.filter((figure: Figure): boolean => figure.room === room).map((figure: Figure): number => figure.deskIndex));
  const deskCount = countDesks(room, furniture);
  for (let index = 0; index < deskCount; index += 1) {
    if (!taken.has(index)) return index;
  }
  return null;
}

export function countFreeDesks(room: RoomKey, figures: readonly Figure[], furniture: readonly Furniture[]): number {
  const taken = figures.filter((figure: Figure): boolean => figure.room === room).length;
  return Math.max(0, countDesks(room, furniture) - taken);
}

/** URL-safe id from the name, with a numeric suffix when the name is already in use. */
export function makeFigureId(name: string, existingIds: ReadonlySet<string>): string {
  const base = name.toLowerCase().replace(NON_SLUG_CHARACTERS, '-').replace(EDGE_DASHES, '') || 'figure';
  if (!existingIds.has(base)) return base;
  let suffix = ID_SUFFIX_START;
  while (existingIds.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Pure: builds the figure to append, or null when the room is full. */
export function createFigure(input: NewFigureInput, figures: readonly Figure[], furniture: readonly Furniture[]): Figure | null {
  const deskIndex = findFreeDeskIndex(input.room, figures, furniture);
  if (deskIndex === null) return null;
  const id = makeFigureId(input.name, new Set(figures.map((figure: Figure): string => figure.id)));
  return {
    id,
    name: input.name.trim(),
    job: input.job.trim(),
    room: input.room,
    deskIndex,
    look: { ...input.look },
    rolePrompt: input.rolePrompt.trim(),
    state: FigureState.Idle,
    level: STARTING_LEVEL,
    experiencePoints: STARTING_EXPERIENCE,
  };
}

export const useFiguresStore = create<FiguresState>((set, get) => ({
  figures: [...DEFAULT_FIGURES],
  addFigure: (input: NewFigureInput): Figure | null => {
    const figure = createFigure(input, get().figures, getFurniture());
    if (figure === null) return null;
    set({ figures: [...get().figures, figure] });
    return figure;
  },
}));
