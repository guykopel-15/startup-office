import { PLAN_HEIGHT, PLAN_WIDTH, WallAxis } from './floorPlan';
import { EXTERIOR_WALL_HEIGHT, INTERIOR_WALL_HEIGHT, RIM_WALL_HEIGHT, WALL_THICKNESS, WallKind, buildWallBoxes, classifyWall, toWallBox } from './walls';

describe('classifyWall', () => {
  it('makes the far edges exterior, the near edges rims, and the rest interior', () => {
    expect(classifyWall({ axis: WallAxis.AlongX, line: 0, start: 0, end: 4 })).toBe(WallKind.Exterior);
    expect(classifyWall({ axis: WallAxis.AlongY, line: 0, start: 0, end: 4 })).toBe(WallKind.Exterior);
    expect(classifyWall({ axis: WallAxis.AlongX, line: PLAN_HEIGHT, start: 0, end: 4 })).toBe(WallKind.Rim);
    expect(classifyWall({ axis: WallAxis.AlongY, line: PLAN_WIDTH, start: 0, end: 4 })).toBe(WallKind.Rim);
    expect(classifyWall({ axis: WallAxis.AlongX, line: 14, start: 0, end: 4 })).toBe(WallKind.Interior);
  });
});

describe('toWallBox', () => {
  it('keeps exterior and rim boxes inside the plan and centers interior boxes on their line', () => {
    const north = toWallBox({ axis: WallAxis.AlongX, line: 0, start: 2, end: 3 });
    expect([north.gy0, north.gy1]).toEqual([0, WALL_THICKNESS]);
    const south = toWallBox({ axis: WallAxis.AlongX, line: PLAN_HEIGHT, start: 2, end: 3 });
    expect([south.gy0, south.gy1]).toEqual([PLAN_HEIGHT - WALL_THICKNESS, PLAN_HEIGHT]);
    const divider = toWallBox({ axis: WallAxis.AlongY, line: 20, start: 2, end: 3 });
    expect(divider.gx0 + divider.gx1).toBeCloseTo(40);
  });
});

describe('buildWallBoxes', () => {
  it('produces one-tile pieces that all lie inside the plan', () => {
    buildWallBoxes().forEach((box) => {
      expect(box.gx0).toBeGreaterThanOrEqual(-WALL_THICKNESS);
      expect(box.gy0).toBeGreaterThanOrEqual(-WALL_THICKNESS);
      expect(box.gx1).toBeLessThanOrEqual(PLAN_WIDTH + WALL_THICKNESS);
      expect(box.gy1).toBeLessThanOrEqual(PLAN_HEIGHT + WALL_THICKNESS);
      expect(Math.max(box.gx1 - box.gx0, box.gy1 - box.gy0)).toBeLessThanOrEqual(1);
    });
  });

  it('orders the heights tall, medium, low', () => {
    expect(EXTERIOR_WALL_HEIGHT).toBeGreaterThan(INTERIOR_WALL_HEIGHT);
    expect(INTERIOR_WALL_HEIGHT).toBeGreaterThan(RIM_WALL_HEIGHT);
  });
});
