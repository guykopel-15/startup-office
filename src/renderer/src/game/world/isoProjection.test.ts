import { TILE_HEIGHT, TILE_WIDTH, getDepth, getRectCenter, getRectCorners, getScreenBounds, projectToScreen, raise } from './isoProjection';

describe('projectToScreen', () => {
  it('puts the grid origin at the screen origin', () => {
    expect(projectToScreen({ gx: 0, gy: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('moves one tile along x to the right and down by half a tile', () => {
    expect(projectToScreen({ gx: 1, gy: 0 })).toEqual({ x: TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
  });

  it('moves one tile along y to the left and down by half a tile', () => {
    expect(projectToScreen({ gx: 0, gy: 1 })).toEqual({ x: -TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
  });
});

describe('getScreenBounds', () => {
  it('wraps all projected points', () => {
    const bounds = getScreenBounds([
      { gx: 0, gy: 0 },
      { gx: 4, gy: 0 },
      { gx: 0, gy: 4 },
    ]);
    expect(bounds).toEqual({ minX: -2 * TILE_WIDTH, minY: 0, maxX: 2 * TILE_WIDTH, maxY: 2 * TILE_HEIGHT });
  });
});

describe('getDepth', () => {
  it('grows toward the viewer', () => {
    expect(getDepth({ gx: 3, gy: 4 })).toBeGreaterThan(getDepth({ gx: 1, gy: 1 }));
  });
});

describe('rect helpers', () => {
  const rect = { gx0: 2, gy0: 4, gx1: 6, gy1: 10 };

  it('lists corners clockwise from the top-left', () => {
    expect(getRectCorners(rect)).toEqual([
      { gx: 2, gy: 4 },
      { gx: 6, gy: 4 },
      { gx: 6, gy: 10 },
      { gx: 2, gy: 10 },
    ]);
  });

  it('finds the center and raises points straight up on screen', () => {
    expect(getRectCenter(rect)).toEqual({ gx: 4, gy: 7 });
    expect(raise({ x: 5, y: 9 }, 4)).toEqual({ x: 5, y: 5 });
  });
});
