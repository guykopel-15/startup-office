import { RoomKey } from '@shared/figures';

import type { GridPoint } from './isoProjection';

export { RoomKey };

/** A rectangle of floor tiles: gx0..gx1 by gy0..gy1, end exclusive. */
export interface GridRect {
  gx0: number;
  gy0: number;
  gx1: number;
  gy1: number;
}

export enum FloorKind {
  Tile = 'tile',
  Orange = 'orange',
  Checker = 'checker',
  Corridor = 'corridor',
}

export interface Room extends GridRect {
  key: RoomKey;
  name: string;
  floor: FloorKind;
  isCorridor: boolean;
}

export enum WallAxis {
  AlongX = 'alongX',
  AlongY = 'alongY',
}

/** A straight wall on a grid line. `start`..`end` run along `axis`; `line` is the fixed coordinate. */
export interface WallSegment {
  axis: WallAxis;
  line: number;
  start: number;
  end: number;
}

export const PLAN_WIDTH = 48;
export const PLAN_HEIGHT = 34;
export const DOOR_WIDTH = 3;
export const TOP_ROW_END = 14;
export const CORRIDOR_END = 19;

export const ROOMS: readonly Room[] = [
  { key: RoomKey.ResearchAndDevelopment, name: 'R&D', gx0: 0, gy0: 0, gx1: 20, gy1: TOP_ROW_END, floor: FloorKind.Tile, isCorridor: false },
  { key: RoomKey.MeetingRoom, name: 'MEETING ROOM', gx0: 20, gy0: 0, gx1: 34, gy1: TOP_ROW_END, floor: FloorKind.Orange, isCorridor: false },
  { key: RoomKey.Product, name: 'PRODUCT', gx0: 34, gy0: 0, gx1: PLAN_WIDTH, gy1: TOP_ROW_END, floor: FloorKind.Tile, isCorridor: false },
  { key: RoomKey.Lobby, name: 'LOBBY', gx0: 0, gy0: TOP_ROW_END, gx1: PLAN_WIDTH, gy1: CORRIDOR_END, floor: FloorKind.Corridor, isCorridor: true },
  { key: RoomKey.Marketing, name: 'MARKETING', gx0: 0, gy0: CORRIDOR_END, gx1: 12, gy1: PLAN_HEIGHT, floor: FloorKind.Tile, isCorridor: false },
  { key: RoomKey.Sales, name: 'SALES', gx0: 12, gy0: CORRIDOR_END, gx1: 24, gy1: PLAN_HEIGHT, floor: FloorKind.Tile, isCorridor: false },
  { key: RoomKey.Finance, name: 'FINANCE', gx0: 24, gy0: CORRIDOR_END, gx1: 36, gy1: PLAN_HEIGHT, floor: FloorKind.Tile, isCorridor: false },
  { key: RoomKey.Operations, name: 'OPS / HR', gx0: 36, gy0: CORRIDOR_END, gx1: PLAN_WIDTH, gy1: PLAN_HEIGHT, floor: FloorKind.Checker, isCorridor: false },
];

export function findRoom(key: RoomKey): Room {
  const room = ROOMS.find((candidate) => candidate.key === key);
  if (room === undefined) throw new Error(`Unknown room "${key}"`);
  return room;
}

export function getRoomCorners(rect: GridRect): GridPoint[] {
  return [
    { gx: rect.gx0, gy: rect.gy0 },
    { gx: rect.gx1, gy: rect.gy0 },
    { gx: rect.gx1, gy: rect.gy1 },
    { gx: rect.gx0, gy: rect.gy1 },
  ];
}

export function getRoomCenter(rect: GridRect): GridPoint {
  return { gx: (rect.gx0 + rect.gx1) / 2, gy: (rect.gy0 + rect.gy1) / 2 };
}

/** Turns a room-relative rect into plan coordinates. */
export function toPlanRect(room: Room, local: GridRect): GridRect {
  return { gx0: room.gx0 + local.gx0, gy0: room.gy0 + local.gy0, gx1: room.gx0 + local.gx1, gy1: room.gy0 + local.gy1 };
}

function wallId(wall: WallSegment): string {
  return `${wall.axis}:${wall.line}:${wall.start}-${wall.end}`;
}

/** The four edges of a rect as wall segments. */
export function getRectEdges(rect: GridRect): WallSegment[] {
  return [
    { axis: WallAxis.AlongX, line: rect.gy0, start: rect.gx0, end: rect.gx1 },
    { axis: WallAxis.AlongX, line: rect.gy1, start: rect.gx0, end: rect.gx1 },
    { axis: WallAxis.AlongY, line: rect.gx0, start: rect.gy0, end: rect.gy1 },
    { axis: WallAxis.AlongY, line: rect.gx1, start: rect.gy0, end: rect.gy1 },
  ];
}

/** Cuts a centered door gap out of a wall, returning the remaining pieces. */
export function cutDoor(wall: WallSegment, doorWidth: number): WallSegment[] {
  const center = (wall.start + wall.end) / 2;
  const gapStart = center - doorWidth / 2;
  const gapEnd = center + doorWidth / 2;
  return [
    { ...wall, end: gapStart },
    { ...wall, start: gapEnd },
  ].filter((piece) => piece.end > piece.start);
}

function isCorridorEdge(corridor: Room, edge: WallSegment): boolean {
  if (edge.axis !== WallAxis.AlongX) return false;
  return edge.line === corridor.gy0 || edge.line === corridor.gy1;
}

/** Every wall in the plan, deduplicated where rooms touch, with a door where a room meets the corridor. */
export function buildWalls(rooms: readonly Room[]): WallSegment[] {
  const corridor = rooms.find((room) => room.isCorridor);
  const seen = new Set<string>();
  const walls: WallSegment[] = [];
  rooms
    .filter((room) => !room.isCorridor)
    .forEach((room) => {
      getRectEdges(room).forEach((edge) => {
        if (seen.has(wallId(edge))) return;
        seen.add(wallId(edge));
        const hasDoor = corridor !== undefined && isCorridorEdge(corridor, edge);
        walls.push(...(hasDoor ? cutDoor(edge, DOOR_WIDTH) : [edge]));
      });
    });
  if (corridor !== undefined) {
    walls.push({ axis: WallAxis.AlongY, line: corridor.gx0, start: corridor.gy0, end: corridor.gy1 });
    walls.push({ axis: WallAxis.AlongY, line: corridor.gx1, start: corridor.gy0, end: corridor.gy1 });
  }
  return walls;
}

/** Splits a wall into pieces no longer than `pieceLength` so each can be depth-sorted on its own. */
export function splitWall(wall: WallSegment, pieceLength: number): WallSegment[] {
  const pieces: WallSegment[] = [];
  for (let start = wall.start; start < wall.end; start += pieceLength) {
    pieces.push({ ...wall, start, end: Math.min(start + pieceLength, wall.end) });
  }
  return pieces;
}

export function getWallEndpoints(wall: WallSegment): [GridPoint, GridPoint] {
  if (wall.axis === WallAxis.AlongX) {
    return [
      { gx: wall.start, gy: wall.line },
      { gx: wall.end, gy: wall.line },
    ];
  }
  return [
    { gx: wall.line, gy: wall.start },
    { gx: wall.line, gy: wall.end },
  ];
}

export function getWallMidpoint(wall: WallSegment): GridPoint {
  const [from, to] = getWallEndpoints(wall);
  return { gx: (from.gx + to.gx) / 2, gy: (from.gy + to.gy) / 2 };
}
