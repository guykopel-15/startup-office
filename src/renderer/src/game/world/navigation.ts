import { HALF } from '@shared/theme';
import { PLAN_HEIGHT, PLAN_WIDTH, ROOMS, buildWalls, findRoom } from './floorPlan';
import { FurnitureKind } from './furniture';
import { toWallBox } from './walls';

import type { RoomKey } from '@shared/figures';
import type { Room, WallSegment } from './floorPlan';
import type { Furniture } from './furniture';
import type { GridPoint, GridRect } from './isoProjection';

/** One boolean per plan tile: true when a figure can stand there. Indexed `[gy][gx]`. */
export type WalkableGrid = readonly (readonly boolean[])[];

const NEIGHBOR_STEPS: readonly GridPoint[] = [
  { gx: 1, gy: 0 },
  { gx: -1, gy: 0 },
  { gx: 0, gy: 1 },
  { gx: 0, gy: -1 },
];
/**
 * A wall or piece must cover at least this much of a tile to block it. Interior walls straddle
 * their grid line by 0.3 each side, so they block the tile row on both sides; a door gap's half-tile
 * stubs cover less than this and stay open.
 */
const BLOCKING_OVERLAP = 0.25;
/** Standing spots around the meeting table: a near row between and beside the chairs, a far row behind them, one at each end. */
const TABLE_STANDING_GAP = 0.9;
const TABLE_BACK_ROW_GAP = 2.3;
const NEAR_ROW_FRACTIONS: readonly number[] = [0.44, 0.9];
const BACK_ROW_FRACTIONS: readonly number[] = [0.2, 0.5, 0.8];
/** Seats are stood on, not walked around: a figure sits by walking onto the chair. */
const SEAT_KINDS: readonly FurnitureKind[] = [FurnitureKind.Chair, FurnitureKind.Stool];
/** Where a figure's feet go on a chair tile: a little below the chair's center so the seat hides the legs. */
const CHAIR_FEET_OFFSET = 0.35;
const TILE_KEY_SEPARATOR = ',';

function overlapArea(first: GridRect, second: GridRect): number {
  const width = Math.min(first.gx1, second.gx1) - Math.max(first.gx0, second.gx0);
  const depth = Math.min(first.gy1, second.gy1) - Math.max(first.gy0, second.gy0);
  return width <= 0 || depth <= 0 ? 0 : width * depth;
}

function tileRect(gx: number, gy: number): GridRect {
  return { gx0: gx, gy0: gy, gx1: gx + 1, gy1: gy + 1 };
}

/** Walls and furniture block tiles; everything else inside the plan is open floor. Whole wall segments are used, not the drawing pieces, so a wall never slips through between two short pieces. */
export function buildWalkableGrid(furniture: readonly Furniture[]): WalkableGrid {
  const walls = buildWalls(ROOMS).map((wall: WallSegment): GridRect => toWallBox(wall));
  const blockers: GridRect[] = [...walls, ...furniture.filter((piece: Furniture): boolean => !SEAT_KINDS.includes(piece.kind))];
  const rows: boolean[][] = [];
  for (let gy = 0; gy < PLAN_HEIGHT; gy += 1) {
    const row: boolean[] = [];
    for (let gx = 0; gx < PLAN_WIDTH; gx += 1) {
      const tile = tileRect(gx, gy);
      row.push(!blockers.some((blocker: GridRect): boolean => overlapArea(blocker, tile) >= BLOCKING_OVERLAP));
    }
    rows.push(row);
  }
  return rows;
}

export function toTile(point: GridPoint): GridPoint {
  return { gx: Math.floor(point.gx), gy: Math.floor(point.gy) };
}

export function tileCenter(tile: GridPoint): GridPoint {
  return { gx: tile.gx + HALF, gy: tile.gy + HALF };
}

function isWalkable(grid: WalkableGrid, tile: GridPoint): boolean {
  return grid[tile.gy]?.[tile.gx] === true;
}

function tileKey(tile: GridPoint): string {
  return `${tile.gx}${TILE_KEY_SEPARATOR}${tile.gy}`;
}

function isSameTile(first: GridPoint, second: GridPoint): boolean {
  return first.gx === second.gx && first.gy === second.gy;
}

/** Breadth-first search over walkable tiles. The start tile may be blocked (a seat behind a desk); the end must be walkable. */
function findTilePath(grid: WalkableGrid, from: GridPoint, to: GridPoint): GridPoint[] | null {
  if (!isWalkable(grid, to)) return null;
  const cameFrom = new Map<string, GridPoint | null>([[tileKey(from), null]]);
  const queue: GridPoint[] = [from];
  while (queue.length > 0) {
    const current = queue.shift() as GridPoint;
    if (isSameTile(current, to)) return unwindPath(cameFrom, current);
    NEIGHBOR_STEPS.forEach((step: GridPoint): void => {
      const next = { gx: current.gx + step.gx, gy: current.gy + step.gy };
      if (cameFrom.has(tileKey(next)) || !isWalkable(grid, next)) return;
      cameFrom.set(tileKey(next), current);
      queue.push(next);
    });
  }
  return null;
}

function unwindPath(cameFrom: ReadonlyMap<string, GridPoint | null>, end: GridPoint): GridPoint[] {
  const path: GridPoint[] = [];
  let current: GridPoint | null = end;
  while (current !== null) {
    path.unshift(current);
    current = cameFrom.get(tileKey(current)) ?? null;
  }
  return path;
}

/** Exact feet points to walk through: tile centers between `from` and `to`, ending on `to` itself. Null when unreachable. */
export function findWalkPath(grid: WalkableGrid, from: GridPoint, to: GridPoint): GridPoint[] | null {
  const tiles = findTilePath(grid, toTile(from), toTile(to));
  if (tiles === null) return null;
  const middle = tiles.slice(1, -1).map(tileCenter);
  return [...middle, to];
}

/** Walkable tiles inside a room, one tile in from its walls, minus `excluded` tiles (colleagues' seats). */
export function roomTiles(grid: WalkableGrid, roomKey: RoomKey, excluded: readonly GridPoint[] = []): GridPoint[] {
  const room: Room = findRoom(roomKey);
  const excludedKeys = new Set(excluded.map((point: GridPoint): string => tileKey(toTile(point))));
  const tiles: GridPoint[] = [];
  for (let gy = room.gy0 + 1; gy < room.gy1 - 1; gy += 1) {
    for (let gx = room.gx0 + 1; gx < room.gx1 - 1; gx += 1) {
      if (isWalkable(grid, { gx, gy }) && !excludedKeys.has(tileKey({ gx, gy }))) tiles.push({ gx, gy });
    }
  }
  return tiles;
}

function spotsAlong(table: GridRect, fractions: readonly number[], gy: number): GridPoint[] {
  return fractions.map((fraction: number): GridPoint => ({ gx: table.gx0 + (table.gx1 - table.gx0) * fraction, gy }));
}

/**
 * Where figures gather for a meeting: the chairs first, then standing spots along the table's
 * long sides and one at each end, then a back row. More figures than spots share the last one.
 */
export function meetingSpots(furniture: readonly Furniture[]): GridPoint[] {
  const table = furniture.find((piece: Furniture): boolean => piece.kind === FurnitureKind.MeetingTable);
  if (table === undefined) return [];
  const chairs = furniture
    .filter((piece: Furniture): boolean => piece.kind === FurnitureKind.Chair && piece.room === table.room)
    .map((chair: Furniture): GridPoint => ({ gx: (chair.gx0 + chair.gx1) * HALF, gy: (chair.gy0 + chair.gy1) * HALF + CHAIR_FEET_OFFSET }));
  const near = [...spotsAlong(table, NEAR_ROW_FRACTIONS, table.gy0 - TABLE_STANDING_GAP), ...spotsAlong(table, NEAR_ROW_FRACTIONS, table.gy1 + TABLE_STANDING_GAP)];
  const back = [...spotsAlong(table, BACK_ROW_FRACTIONS, table.gy0 - TABLE_BACK_ROW_GAP), ...spotsAlong(table, BACK_ROW_FRACTIONS, table.gy1 + TABLE_BACK_ROW_GAP)];
  const middleY = (table.gy0 + table.gy1) * HALF;
  const ends: GridPoint[] = [
    { gx: table.gx0 - TABLE_STANDING_GAP, gy: middleY },
    { gx: table.gx1 + TABLE_STANDING_GAP, gy: middleY },
  ];
  return [...chairs, ...near, ...ends, ...back];
}
