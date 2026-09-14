import { RoomKey } from '@shared/figures';
import { ROOMS } from './floorPlan';

import type { GridRect, Room } from './floorPlan';
import type { GridPoint } from './isoProjection';

export enum FurnitureKind {
  Desk = 'desk',
  MeetingTable = 'meetingTable',
  ReceptionDesk = 'receptionDesk',
}

/** Footprint in tiles, anchored at its top-left grid corner. */
export interface Furniture extends GridRect {
  kind: FurnitureKind;
  room: RoomKey;
}

export const DESK_WIDTH_TILES = 3;
export const DESK_DEPTH_TILES = 2;
const MEETING_TABLE_WIDTH_TILES = 8;
const MEETING_TABLE_DEPTH_TILES = 3;
const RECEPTION_WIDTH_TILES = 4;
const RECEPTION_DEPTH_TILES = 2;
/** The figure stands this far behind the desk's back edge. */
const SEAT_BACK_OFFSET = 0.6;
const HALF = 0.5;

/** Desk top-left corners relative to each room's own top-left corner, in desk order. */
const DESK_LAYOUT: Readonly<Record<RoomKey, readonly GridPoint[]>> = {
  [RoomKey.ResearchAndDevelopment]: [
    { gx: 2, gy: 3 },
    { gx: 8, gy: 3 },
    { gx: 14, gy: 3 },
    { gx: 5, gy: 9 },
    { gx: 11, gy: 9 },
  ],
  [RoomKey.Product]: [
    { gx: 3, gy: 4 },
    { gx: 8, gy: 8 },
  ],
  [RoomKey.Marketing]: [
    { gx: 2, gy: 3 },
    { gx: 7, gy: 3 },
    { gx: 4, gy: 9 },
  ],
  [RoomKey.Sales]: [
    { gx: 2, gy: 4 },
    { gx: 7, gy: 9 },
  ],
  [RoomKey.Finance]: [
    { gx: 2, gy: 4 },
    { gx: 7, gy: 9 },
  ],
  [RoomKey.Operations]: [
    { gx: 2, gy: 4 },
    { gx: 7, gy: 9 },
  ],
  [RoomKey.MeetingRoom]: [],
  [RoomKey.Lobby]: [],
};

function findRoom(key: RoomKey): Room {
  const room = ROOMS.find((candidate) => candidate.key === key);
  if (room === undefined) throw new Error(`Unknown room "${key}"`);
  return room;
}

function place(kind: FurnitureKind, room: Room, local: GridPoint, width: number, depth: number): Furniture {
  const gx0 = room.gx0 + local.gx;
  const gy0 = room.gy0 + local.gy;
  return { kind, room: room.key, gx0, gy0, gx1: gx0 + width, gy1: gy0 + depth };
}

/** Every desk in the office, grouped per room in desk order. */
export function getDesks(): Furniture[] {
  return ROOMS.flatMap((room) => DESK_LAYOUT[room.key].map((local) => place(FurnitureKind.Desk, room, local, DESK_WIDTH_TILES, DESK_DEPTH_TILES)));
}

/** The big pieces that are not desks: the meeting table and the reception desk. */
export function getFixedFurniture(): Furniture[] {
  const meeting = findRoom(RoomKey.MeetingRoom);
  const lobby = findRoom(RoomKey.Lobby);
  const meetingLocal = { gx: (meeting.gx1 - meeting.gx0 - MEETING_TABLE_WIDTH_TILES) * HALF, gy: (meeting.gy1 - meeting.gy0 - MEETING_TABLE_DEPTH_TILES) * HALF };
  const lobbyLocal = { gx: 2, gy: (lobby.gy1 - lobby.gy0 - RECEPTION_DEPTH_TILES) * HALF };
  return [
    place(FurnitureKind.MeetingTable, meeting, meetingLocal, MEETING_TABLE_WIDTH_TILES, MEETING_TABLE_DEPTH_TILES),
    place(FurnitureKind.ReceptionDesk, lobby, lobbyLocal, RECEPTION_WIDTH_TILES, RECEPTION_DEPTH_TILES),
  ];
}

export function getDeskForFigure(room: RoomKey, deskIndex: number): Furniture | undefined {
  return getDesks().filter((desk) => desk.room === room)[deskIndex];
}

/** Where the figure's feet go: centered behind the desk so the desk top hides the legs. */
export function getSeatPoint(desk: GridRect): GridPoint {
  return { gx: (desk.gx0 + desk.gx1) * HALF, gy: desk.gy0 - SEAT_BACK_OFFSET };
}

export function getFurnitureCenter(piece: GridRect): GridPoint {
  return { gx: (piece.gx0 + piece.gx1) * HALF, gy: (piece.gy0 + piece.gy1) * HALF };
}
