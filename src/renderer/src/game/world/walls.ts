import { HALF } from '@shared/theme';
import { PLAN_HEIGHT, PLAN_WIDTH, ROOMS, WallAxis, buildWalls, splitWall } from './floorPlan';
import { TILE_HEIGHT } from './isoProjection';

import type { WallSegment } from './floorPlan';
import type { GridRect } from './isoProjection';

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
const EXTERIOR_TILES_TALL = 6;
const INTERIOR_TILES_TALL = 3.5;
const RIM_TILES_TALL = 1.2;
export const EXTERIOR_WALL_HEIGHT = EXTERIOR_TILES_TALL * TILE_HEIGHT;
export const INTERIOR_WALL_HEIGHT = INTERIOR_TILES_TALL * TILE_HEIGHT;
export const RIM_WALL_HEIGHT = RIM_TILES_TALL * TILE_HEIGHT;
const WALL_PIECE_LENGTH = 1;

export const WALL_HEIGHTS: Readonly<Record<WallKind, number>> = {
  [WallKind.Exterior]: EXTERIOR_WALL_HEIGHT,
  [WallKind.Rim]: RIM_WALL_HEIGHT,
  [WallKind.Interior]: INTERIOR_WALL_HEIGHT,
};

export function classifyWall(wall: WallSegment): WallKind {
  if (wall.line === 0) return WallKind.Exterior;
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

/** All wall boxes of the office. Interior walls come one tile long so they depth-sort against figures. */
export function buildWallBoxes(): WallBox[] {
  return buildWalls(ROOMS).flatMap((wall: WallSegment): WallBox[] => {
    const isInterior = classifyWall(wall) === WallKind.Interior;
    return isInterior ? splitWall(wall, WALL_PIECE_LENGTH).map(toWallBox) : [toWallBox(wall)];
  });
}

export function isWallAlongX(wall: GridRect): boolean {
  return wall.gx1 - wall.gx0 > wall.gy1 - wall.gy0;
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

/** True when `[start, end]` on the wall's line is fully covered by solid wall pieces (no door gap). */
export function isSpanCoveredByWalls(wall: WallBox, start: number, end: number): boolean {
  const isAlongX = isWallAlongX(wall);
  const pieces = buildWallBoxes().filter((box: WallBox): boolean => (isAlongX ? box.gy0 === wall.gy0 && box.gy1 === wall.gy1 : box.gx0 === wall.gx0 && box.gx1 === wall.gx1));
  const spans = pieces.map((box: WallBox): [number, number] => (isAlongX ? [box.gx0, box.gx1] : [box.gy0, box.gy1])).sort((first, second): number => first[0] - second[0]);
  let covered = start;
  spans.forEach(([spanStart, spanEnd]: [number, number]): void => {
    if (spanStart <= covered && spanEnd > covered) covered = spanEnd;
  });
  return covered >= end;
}
