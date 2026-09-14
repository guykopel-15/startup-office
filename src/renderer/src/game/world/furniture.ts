import { RoomKey } from '@shared/figures';
import { HALF } from '@shared/theme';
import { ROOMS, findRoom, toPlanRect } from './floorPlan';

import type { Room } from './floorPlan';
import type { GridPoint, GridRect } from './isoProjection';

export enum FurnitureKind {
  Desk = 'desk',
  BigDesk = 'bigDesk',
  MeetingTable = 'meetingTable',
  Chair = 'chair',
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
  desk: DeskOptions | null;
}

interface LocalPiece {
  kind: FurnitureKind;
  rect: GridRect;
  desk: Partial<DeskOptions> | null;
}

export const DESK_WIDTH_TILES = 3;
export const DESK_DEPTH_TILES = 2;
const BIG_DESK_WIDTH_TILES = 6.5;
const BIG_DESK_DEPTH_TILES = 2.75;
const PLANT_SIZE_TILES = 1.1;
const CHAIR_SIZE_TILES = 1.3;
const STOOL_SIZE_TILES = 1;
/** The figure stands this far behind the desk's back edge. */
const SEAT_BACK_OFFSET = 0.6;

export const DEFAULT_DESK: DeskOptions = { screen: ScreenColor.Blue, hasMug: false, hasLamp: false, hasPaper: false };

function box(kind: FurnitureKind, gx0: number, gy0: number, width: number, depth: number): LocalPiece {
  return { kind, rect: { gx0, gy0, gx1: gx0 + width, gy1: gy0 + depth }, desk: null };
}

function desk(gx0: number, gy0: number, options: Partial<DeskOptions> = {}): LocalPiece {
  return { ...box(FurnitureKind.Desk, gx0, gy0, DESK_WIDTH_TILES, DESK_DEPTH_TILES), desk: options };
}

function bigDesk(gx0: number, gy0: number, options: Partial<DeskOptions> = {}): LocalPiece {
  return { ...box(FurnitureKind.BigDesk, gx0, gy0, BIG_DESK_WIDTH_TILES, BIG_DESK_DEPTH_TILES), desk: options };
}

function plant(gx0: number, gy0: number): LocalPiece {
  return box(FurnitureKind.Plant, gx0, gy0, PLANT_SIZE_TILES, PLANT_SIZE_TILES);
}

function chair(gx0: number, gy0: number): LocalPiece {
  return box(FurnitureKind.Chair, gx0, gy0, CHAIR_SIZE_TILES, CHAIR_SIZE_TILES);
}

function stool(gx0: number, gy0: number): LocalPiece {
  return box(FurnitureKind.Stool, gx0, gy0, STOOL_SIZE_TILES, STOOL_SIZE_TILES);
}

/** Room-relative layouts. Desk order here is the figure's `deskIndex`. Numbers are tile positions. */
const LAYOUT: Readonly<Record<RoomKey, readonly LocalPiece[]>> = {
  [RoomKey.ResearchAndDevelopment]: [
    desk(2, 3, { hasMug: true }),
    desk(7, 3),
    desk(12, 3),
    desk(4, 9, { hasPaper: true }),
    desk(9, 9),
    box(FurnitureKind.ServerRack, 16.6, 1, 2.2, 2.6),
    plant(17.5, 10.5),
  ],
  [RoomKey.MeetingRoom]: [box(FurnitureKind.MeetingTable, 3, 5, 8, 3), chair(4, 3.3), chair(7.5, 3.3), chair(4, 8.4), chair(7.5, 8.4), plant(12, 11.5)],
  [RoomKey.Product]: [bigDesk(4, 4.5, { hasPaper: true }), desk(9.5, 9.5, { screen: ScreenColor.Mint }), box(FurnitureKind.Bookshelf, 0.7, 2, 1.7, 4.5), plant(12.5, 1.3)],
  [RoomKey.Lobby]: [box(FurnitureKind.WaterCooler, 45.6, 1.9, 1.1, 1.1), plant(1.2, 1.9), box(FurnitureKind.Sofa, 20, 1.4, 5, 1.6)],
  [RoomKey.Marketing]: [desk(2, 3.5, { hasMug: true }), desk(7, 3.5), desk(4.5, 9.5, { hasPaper: true }), plant(9.8, 12.8)],
  [RoomKey.Sales]: [desk(2, 3.5, { screen: ScreenColor.Mint, hasLamp: true }), desk(7, 9.5, { hasMug: true }), plant(9.8, 2)],
  [RoomKey.Finance]: [desk(2, 3.5, { hasPaper: true }), desk(7, 9.5), box(FurnitureKind.FilingCabinet, 9.4, 1.2, 1.6, 1.4), box(FurnitureKind.Safe, 1, 12, 1.8, 1.6)],
  [RoomKey.Operations]: [
    desk(1.5, 4.5, { hasMug: true }),
    desk(7.5, 9.5),
    box(FurnitureKind.KitchenCounter, 1.2, 0.9, 5.5, 1.5),
    box(FurnitureKind.Fridge, 7.4, 0.9, 1.8, 1.6),
    box(FurnitureKind.RoundTable, 3.2, 10, 2.6, 2.6),
    stool(2.2, 12.8),
    stool(5.8, 12.8),
  ],
};

function toPlan(room: Room, piece: LocalPiece): Furniture {
  const rect = toPlanRect(room, piece.rect);
  return { kind: piece.kind, room: room.key, ...rect, desk: piece.desk === null ? null : { ...DEFAULT_DESK, ...piece.desk } };
}

/** Every piece in the office, in plan coordinates. */
export function getFurniture(): Furniture[] {
  return ROOMS.flatMap((room: Room): Furniture[] => LAYOUT[room.key].map((piece: LocalPiece): Furniture => toPlan(room, piece)));
}

export function isSeat(piece: Furniture): boolean {
  return piece.desk !== null;
}

/** Desks per room in layout order, so `deskIndex` picks one. */
export function getDeskForFigure(pieces: readonly Furniture[], room: RoomKey, deskIndex: number): Furniture | undefined {
  return pieces.filter((piece: Furniture): boolean => piece.room === room && isSeat(piece))[deskIndex];
}

/** Where the figure's feet go: centered behind the desk so the desk top hides the legs. */
export function getSeatPoint(desk: GridRect): GridPoint {
  return { gx: (desk.gx0 + desk.gx1) * HALF, gy: desk.gy0 - SEAT_BACK_OFFSET };
}

export { findRoom };
