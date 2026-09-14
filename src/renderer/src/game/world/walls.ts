import { PLAN_HEIGHT, PLAN_WIDTH, ROOMS, WallAxis, buildWalls, splitWall } from './floorPlan';
import { TILE_HEIGHT } from './isoProjection';

import type { GridRect, WallSegment } from './floorPlan';

export enum WallKind {
  /** Far walls (north and west): full height, opaque, carry windows and posters. */
  Exterior = 'exterior',
  /** Near edges (south and east): cut low so the interior reads as a dollhouse. */
  Rim = 'rim',
  Interior = 'interior',
}

/** A solid wall piece: a plan rectangle extruded to `height` screen pixels. */
export interface WallBox extends GridRect {
  kind: WallKind;
}

export const WALL_THICKNESS = 0.6;
const HEIGHT_PER_TILE = TILE_HEIGHT;
export const EXTERIOR_WALL_HEIGHT = 6 * HEIGHT_PER_TILE;
export const INTERIOR_WALL_HEIGHT = 3.5 * HEIGHT_PER_TILE;
export const RIM_WALL_HEIGHT = 1.2 * HEIGHT_PER_TILE;
const WALL_PIECE_LENGTH = 1;
const HALF = 0.5;

export const WALL_HEIGHTS: Readonly<Record<WallKind, number>> = {
  [WallKind.Exterior]: EXTERIOR_WALL_HEIGHT,
  [WallKind.Rim]: RIM_WALL_HEIGHT,
  [WallKind.Interior]: INTERIOR_WALL_HEIGHT,
};

export function classifyWall(wall: WallSegment): WallKind {
  if (wall.axis === WallAxis.AlongX && wall.line === 0) return WallKind.Exterior;
  if (wall.axis === WallAxis.AlongY && wall.line === 0) return WallKind.Exterior;
  if (wall.axis === WallAxis.AlongX && wall.line === PLAN_HEIGHT) return WallKind.Rim;
  if (wall.axis === WallAxis.AlongY && wall.line === PLAN_WIDTH) return WallKind.Rim;
  return WallKind.Interior;
}

/** Exterior walls sit inside the plan edge; interior walls straddle their grid line. */
function thicknessRange(wall: WallSegment, kind: WallKind): [number, number] {
  const isPlanStart = wall.line === 0;
  if (kind === WallKind.Interior) return [wall.line - WALL_THICKNESS * HALF, wall.line + WALL_THICKNESS * HALF];
  return isPlanStart ? [0, WALL_THICKNESS] : [wall.line - WALL_THICKNESS, wall.line];
}

export function toWallBox(wall: WallSegment): WallBox {
  const kind = classifyWall(wall);
  const [near, far] = thicknessRange(wall, kind);
  if (wall.axis === WallAxis.AlongX) return { kind, gx0: wall.start, gx1: wall.end, gy0: near, gy1: far };
  return { kind, gy0: wall.start, gy1: wall.end, gx0: near, gx1: far };
}

/** All wall boxes of the office, one tile long each, ready to depth-sort. */
export function buildWallBoxes(): WallBox[] {
  return buildWalls(ROOMS).flatMap((wall) => splitWall(wall, WALL_PIECE_LENGTH).map(toWallBox));
}

/** The full exterior north wall as one box, for hanging windows and decor. */
export function getNorthWallBox(): WallBox {
  return { kind: WallKind.Exterior, gx0: 0, gx1: PLAN_WIDTH, gy0: 0, gy1: WALL_THICKNESS };
}

export function getWestWallBox(): WallBox {
  return { kind: WallKind.Exterior, gx0: 0, gx1: WALL_THICKNESS, gy0: 0, gy1: PLAN_HEIGHT };
}

/** An interior wall running along x at `line`, as one box, for hanging decor on its south face. */
export function getInteriorWallBoxAlongX(line: number, start: number, end: number): WallBox {
  return { kind: WallKind.Interior, gx0: start, gx1: end, gy0: line - WALL_THICKNESS * HALF, gy1: line + WALL_THICKNESS * HALF };
}

export function getInteriorWallBoxAlongY(line: number, start: number, end: number): WallBox {
  return { kind: WallKind.Interior, gy0: start, gy1: end, gx0: line - WALL_THICKNESS * HALF, gx1: line + WALL_THICKNESS * HALF };
}
