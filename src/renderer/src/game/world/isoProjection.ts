import { HALF } from '@shared/theme';

/**
 * Grid coordinates are floor tiles; screen coordinates are art pixels.
 * `gx`/`gy` are the one accepted short name in this codebase (see CLAUDE.md).
 */
export interface GridPoint {
  gx: number;
  gy: number;
}

/** A rectangle of floor tiles: gx0..gx1 by gy0..gy1, end exclusive. */
export interface GridRect {
  gx0: number;
  gy0: number;
  gx1: number;
  gy1: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ScreenBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Classic 2:1 isometric tile. */
export const TILE_WIDTH = 14;
export const TILE_HEIGHT = 7;

/** Projects a grid point onto the screen, with the grid origin at screen (0, 0). */
export function projectToScreen(point: GridPoint): ScreenPoint {
  return {
    x: (point.gx - point.gy) * TILE_WIDTH * HALF,
    y: (point.gx + point.gy) * TILE_HEIGHT * HALF,
  };
}

/** Screen-space bounding box of a set of grid points. */
export function getScreenBounds(points: readonly GridPoint[]): ScreenBounds {
  const projected = points.map(projectToScreen);
  return {
    minX: Math.min(...projected.map((point: ScreenPoint): number => point.x)),
    minY: Math.min(...projected.map((point: ScreenPoint): number => point.y)),
    maxX: Math.max(...projected.map((point: ScreenPoint): number => point.x)),
    maxY: Math.max(...projected.map((point: ScreenPoint): number => point.y)),
  };
}

/** Painter's-algorithm depth: larger draws later (closer to the viewer). */
export function getDepth(point: GridPoint): number {
  return point.gx + point.gy;
}

export function getRectCorners(rect: GridRect): GridPoint[] {
  return [
    { gx: rect.gx0, gy: rect.gy0 },
    { gx: rect.gx1, gy: rect.gy0 },
    { gx: rect.gx1, gy: rect.gy1 },
    { gx: rect.gx0, gy: rect.gy1 },
  ];
}

export function getRectCenter(rect: GridRect): GridPoint {
  return { gx: (rect.gx0 + rect.gx1) * HALF, gy: (rect.gy0 + rect.gy1) * HALF };
}

/** A point `height` art pixels above a screen point. */
export function raise(point: ScreenPoint, height: number): ScreenPoint {
  return { x: point.x, y: point.y - height };
}
