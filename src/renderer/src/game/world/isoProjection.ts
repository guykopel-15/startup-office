/** Grid coordinates are floor tiles; screen coordinates are art pixels. */
export interface GridPoint {
  gx: number;
  gy: number;
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

/** Classic 2:1 isometric tile. */
export const TILE_WIDTH = 14;
export const TILE_HEIGHT = 7;
const HALF = 0.5;

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
    minX: Math.min(...projected.map((point) => point.x)),
    minY: Math.min(...projected.map((point) => point.y)),
    maxX: Math.max(...projected.map((point) => point.x)),
    maxY: Math.max(...projected.map((point) => point.y)),
  };
}

/** Painter's-algorithm depth: larger draws later (closer to the viewer). */
export function getDepth(point: GridPoint): number {
  return point.gx + point.gy;
}
