import { create } from 'zustand';

import { DEFAULT_FIGURES, FigureState, STARTING_EXPERIENCE, STARTING_LEVEL, isValidFigureText } from '@shared/figures';
import { getFurniture, isSeat } from '../game/world/furniture';

import type { StoreApi } from 'zustand';

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
  /** Returns the new figure, or null when the text is invalid or the room has no free desk. */
  addFigure: (input: NewFigureInput) => Figure | null;
}

const ID_SUFFIX_START = 2;
const ID_SEPARATOR = '-';
const FALLBACK_ID = 'figure';
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
  const base = name.toLowerCase().replace(NON_SLUG_CHARACTERS, ID_SEPARATOR).replace(EDGE_DASHES, '') || FALLBACK_ID;
  if (!existingIds.has(base)) return base;
  let suffix = ID_SUFFIX_START;
  while (existingIds.has(`${base}${ID_SEPARATOR}${suffix}`)) suffix += 1;
  return `${base}${ID_SEPARATOR}${suffix}`;
}

/** Pure: builds the figure to append, or null when the text is invalid or the room is full. */
export function createFigure(input: NewFigureInput, figures: readonly Figure[], furniture: readonly Furniture[]): Figure | null {
  if (!isValidFigureText(input.name, input.job)) return null;
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

/** The first department with a free desk, so the dialog never opens on a full one. */
export function findRoomWithFreeDesk(rooms: readonly RoomKey[], figures: readonly Figure[], furniture: readonly Furniture[]): RoomKey | undefined {
  return rooms.find((room: RoomKey): boolean => countFreeDesks(room, figures, furniture) > 0);
}

export const useFiguresStore = create<FiguresState>((set: StoreApi<FiguresState>['setState'], get: StoreApi<FiguresState>['getState']): FiguresState => ({
  figures: [...DEFAULT_FIGURES],
  addFigure: (input: NewFigureInput): Figure | null => {
    const figure = createFigure(input, get().figures, getFurniture());
    if (figure === null) return null;
    set({ figures: [...get().figures, figure] });
    return figure;
  },
}));
