import { TILE_HEIGHT, TILE_WIDTH, getDepth, getScreenBounds, projectToScreen } from './isoProjection';

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
