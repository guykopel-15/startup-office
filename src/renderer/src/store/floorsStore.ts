import { create } from 'zustand';

import { FloorSetupStep } from '@shared/floors';
import { IDLE_REPO_STATUS } from '@shared/repo';
import { getFurniture } from '../game/world/furniture';
import { createFigure } from './seating';

import type { StoreApi } from 'zustand';

import type { Figure } from '@shared/figures';
import type { Floor, FloorSetupProgress, FloorSource } from '@shared/floors';
import type { RepoStatus } from '@shared/repo';
import type { NewFigureInput } from './seating';

export interface NewFloorInput {
  name: string;
  source: FloorSource;
}

export interface FloorsState {
  floors: Floor[];
  activeFloorId: string | null;
  /** Creates an empty floor, makes it active and returns it. Setup runs separately. */
  createFloor: (input: NewFloorInput) => Floor;
  removeFloor: (floorId: string) => void;
  setActiveFloor: (floorId: string) => void;
  setRepoStatus: (floorId: string, status: RepoStatus) => void;
  setSetup: (floorId: string, setup: FloorSetupProgress) => void;
  /** Appends an already-seated figure to a floor (used while a floor is being set up). */
  appendFigure: (floorId: string, figure: Figure) => void;
  /** Seats a new figure on the active floor; null when there is no floor, the text is invalid or the room is full. */
  addFigure: (input: NewFigureInput) => Figure | null;
}

export const INITIAL_SETUP: FloorSetupProgress = { step: FloorSetupStep.PreparingRepo, fraction: 0, label: 'Preparing the repository', error: null };
const FLOOR_ID_PREFIX = 'floor-';

function nextFloorId(): string {
  return `${FLOOR_ID_PREFIX}${crypto.randomUUID()}`;
}

function patchFloor(floors: readonly Floor[], floorId: string, patch: (floor: Floor) => Floor): Floor[] {
  return floors.map((floor: Floor): Floor => (floor.id === floorId ? patch(floor) : floor));
}

/** The floor whose office is on screen, or null when there are no floors yet. */
export function selectActiveFloor(state: FloorsState): Floor | null {
  return state.floors.find((floor: Floor): boolean => floor.id === state.activeFloorId) ?? null;
}

export const EMPTY_FIGURES: readonly Figure[] = [];

export function selectActiveFigures(state: FloorsState): readonly Figure[] {
  return selectActiveFloor(state)?.figures ?? EMPTY_FIGURES;
}

export const useFloorsStore = create<FloorsState>((set: StoreApi<FloorsState>['setState'], get: StoreApi<FloorsState>['getState']): FloorsState => ({
  floors: [],
  activeFloorId: null,
  createFloor: (input: NewFloorInput): Floor => {
    const floor: Floor = { id: nextFloorId(), name: input.name, source: input.source, repoStatus: IDLE_REPO_STATUS, figures: [], setup: INITIAL_SETUP };
    set({ floors: [...get().floors, floor], activeFloorId: floor.id });
    return floor;
  },
  removeFloor: (floorId: string): void => {
    const floors = get().floors.filter((floor: Floor): boolean => floor.id !== floorId);
    const activeFloorId = get().activeFloorId === floorId ? (floors[floors.length - 1]?.id ?? null) : get().activeFloorId;
    set({ floors, activeFloorId });
  },
  setActiveFloor: (floorId: string): void => {
    if (get().floors.some((floor: Floor): boolean => floor.id === floorId)) set({ activeFloorId: floorId });
  },
  setRepoStatus: (floorId: string, status: RepoStatus): void => {
    set({ floors: patchFloor(get().floors, floorId, (floor: Floor): Floor => ({ ...floor, repoStatus: status })) });
  },
  setSetup: (floorId: string, setup: FloorSetupProgress): void => {
    set({ floors: patchFloor(get().floors, floorId, (floor: Floor): Floor => ({ ...floor, setup })) });
  },
  appendFigure: (floorId: string, figure: Figure): void => {
    set({ floors: patchFloor(get().floors, floorId, (floor: Floor): Floor => ({ ...floor, figures: [...floor.figures, figure] })) });
  },
  addFigure: (input: NewFigureInput): Figure | null => {
    const active = selectActiveFloor(get());
    if (active === null) return null;
    const figure = createFigure(input, active.figures, getFurniture());
    if (figure === null) return null;
    get().appendFigure(active.id, figure);
    return figure;
  },
}));
