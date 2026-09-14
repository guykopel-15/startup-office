import { RoomKey } from '@shared/figures';
import { ROOMS, findRoom, toPlanRect } from './floorPlan';

import type { GridRect } from './floorPlan';
import type { GridPoint } from './isoProjection';

export enum FurnitureKind {
  Desk = 'desk',
  BigDesk = 'bigDesk',
  MeetingTable = 'meetingTable',
  Chair = 'chair',
  ExecutiveChair = 'executiveChair',
  Bookshelf = 'bookshelf',
  Plant = 'plant',
  ServerRack = 'serverRack',
  WaterCooler = 'waterCooler',
  FilingCabinet = 'filingCabinet',
  Safe = 'safe',
  KitchenCounter = 'kitchenCounter',
  Fridge = 'fridge',
  RoundTable = 'roundTable',
  Stool = 'stool',
  Sofa = 'sofa',
}

export enum ScreenColor {
  Blue = 'blue',
  Mint = 'mint',
  Green = 'green',
}

export interface DeskOptions {
  screen: ScreenColor;
  hasMug: boolean;
  hasLamp: boolean;
  hasPaper: boolean;
}

/** Footprint in plan tiles. Desks carry options; everything else is just a box. */
export interface Furniture extends GridRect {
  kind: FurnitureKind;
  room: RoomKey;
  desk?: DeskOptions;
}

interface LocalPiece {
  kind: FurnitureKind;
  rect: GridRect;
  desk?: Partial<DeskOptions>;
}

export const DESK_WIDTH_TILES = 3;
export const DESK_DEPTH_TILES = 2;
/** The figure stands this far behind the desk's back edge. */
const SEAT_BACK_OFFSET = 0.6;
const HALF = 0.5;

const DEFAULT_DESK: DeskOptions = { screen: ScreenColor.Blue, hasMug: false, hasLamp: false, hasPaper: false };

function box(kind: FurnitureKind, gx0: number, gy0: number, width: number, depth: number): LocalPiece {
  return { kind, rect: { gx0, gy0, gx1: gx0 + width, gy1: gy0 + depth } };
}

function desk(gx0: number, gy0: number, options: Partial<DeskOptions> = {}): LocalPiece {
  return { ...box(FurnitureKind.Desk, gx0, gy0, DESK_WIDTH_TILES, DESK_DEPTH_TILES), desk: options };
}

/** Room-relative layouts. Desk order here is the figure's `deskIndex`. */
const LAYOUT: Readonly<Record<RoomKey, readonly LocalPiece[]>> = {
  [RoomKey.ResearchAndDevelopment]: [
    desk(2, 3, { hasMug: true }),
    desk(7, 3),
    desk(12, 3),
    desk(4, 9, { hasPaper: true }),
    desk(9, 9),
    box(FurnitureKind.ServerRack, 16.6, 1, 2.2, 2.6),
    box(FurnitureKind.Plant, 17.5, 10.5, 1.1, 1.1),
  ],
  [RoomKey.MeetingRoom]: [
    box(FurnitureKind.MeetingTable, 3, 5, 8, 3),
    box(FurnitureKind.Chair, 4, 3.3, 1.3, 1.3),
    box(FurnitureKind.Chair, 7.5, 3.3, 1.3, 1.3),
    box(FurnitureKind.Chair, 4, 8.4, 1.3, 1.3),
    box(FurnitureKind.Chair, 7.5, 8.4, 1.3, 1.3),
    box(FurnitureKind.Plant, 12, 11.5, 1.1, 1.1),
  ],
  [RoomKey.Product]: [
    { ...box(FurnitureKind.BigDesk, 4, 4.5, 6.5, 2.75), desk: { hasPaper: true } },
    desk(9.5, 9.5, { screen: ScreenColor.Mint }),
    box(FurnitureKind.Bookshelf, 0.7, 2, 1.7, 4.5),
    box(FurnitureKind.Plant, 12.5, 1.3, 1.1, 1.1),
  ],
  [RoomKey.Lobby]: [
    box(FurnitureKind.WaterCooler, 45.6, 1.9, 1.1, 1.1),
    box(FurnitureKind.Plant, 1.2, 1.9, 1.1, 1.1),
    box(FurnitureKind.Sofa, 20, 1.4, 5, 1.6),
  ],
  [RoomKey.Marketing]: [
    desk(2, 3.5, { hasMug: true }),
    desk(7, 3.5),
    desk(4.5, 9.5, { hasPaper: true }),
    box(FurnitureKind.Plant, 9.8, 12.8, 1.1, 1.1),
  ],
  [RoomKey.Sales]: [
    desk(2, 3.5, { screen: ScreenColor.Mint, hasLamp: true }),
    desk(7, 9.5, { hasMug: true }),
    box(FurnitureKind.Plant, 9.8, 2, 1.1, 1.1),
  ],
  [RoomKey.Finance]: [
    desk(2, 3.5, { hasPaper: true }),
    desk(7, 9.5),
    box(FurnitureKind.FilingCabinet, 9.4, 1.2, 1.6, 1.4),
    box(FurnitureKind.Safe, 1, 12, 1.8, 1.6),
  ],
  [RoomKey.Operations]: [
    desk(1.5, 4.5, { hasMug: true }),
    desk(7.5, 9.5),
    box(FurnitureKind.KitchenCounter, 1.2, 0.9, 5.5, 1.5),
    box(FurnitureKind.Fridge, 7.4, 0.9, 1.8, 1.6),
    box(FurnitureKind.RoundTable, 3.2, 10, 2.6, 2.6),
    box(FurnitureKind.Stool, 2.2, 12.8, 1, 1),
    box(FurnitureKind.Stool, 5.8, 12.8, 1, 1),
  ],
};

function toPlan(roomKey: RoomKey, piece: LocalPiece): Furniture {
  const room = findRoom(roomKey);
  const rect = toPlanRect(room, piece.rect);
  const isDesk = piece.kind === FurnitureKind.Desk || piece.kind === FurnitureKind.BigDesk;
  return { kind: piece.kind, room: roomKey, ...rect, ...(isDesk ? { desk: { ...DEFAULT_DESK, ...piece.desk } } : {}) };
}

/** Every piece in the office, in plan coordinates. */
export function getFurniture(): Furniture[] {
  return ROOMS.flatMap((room) => LAYOUT[room.key].map((piece) => toPlan(room.key, piece)));
}

export function isSeat(piece: Furniture): boolean {
  return piece.kind === FurnitureKind.Desk || piece.kind === FurnitureKind.BigDesk;
}

/** Desks per room in layout order, so `deskIndex` picks one. */
export function getDeskForFigure(room: RoomKey, deskIndex: number): Furniture | undefined {
  return getFurniture().filter((piece) => piece.room === room && isSeat(piece))[deskIndex];
}

/** Where the figure's feet go: centered behind the desk so the desk top hides the legs. */
export function getSeatPoint(desk: GridRect): GridPoint {
  return { gx: (desk.gx0 + desk.gx1) * HALF, gy: desk.gy0 - SEAT_BACK_OFFSET };
}

export function getFurnitureCenter(piece: GridRect): GridPoint {
  return { gx: (piece.gx0 + piece.gx1) * HALF, gy: (piece.gy0 + piece.gy1) * HALF };
}
