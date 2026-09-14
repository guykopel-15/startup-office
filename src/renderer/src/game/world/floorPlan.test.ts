import { DOOR_WIDTH, PLAN_HEIGHT, PLAN_WIDTH, ROOMS, WallAxis, buildWalls, cutDoor, getRoomCenter } from './floorPlan';

import type { GridRect, Room } from './floorPlan';

function area(rect: GridRect): number {
  return (rect.gx1 - rect.gx0) * (rect.gy1 - rect.gy0);
}

function overlaps(first: GridRect, second: GridRect): boolean {
  return first.gx0 < second.gx1 && second.gx0 < first.gx1 && first.gy0 < second.gy1 && second.gy0 < first.gy1;
}

describe('ROOMS', () => {
  it('tile the whole plan with no gaps or overlaps', () => {
    const total = ROOMS.reduce((sum, room) => sum + area(room), 0);
    expect(total).toBe(PLAN_WIDTH * PLAN_HEIGHT);
    ROOMS.forEach((room, index) => {
      ROOMS.slice(index + 1).forEach((other) => expect(overlaps(room, other)).toBe(false));
    });
  });

  it('has exactly one corridor and every room touches it', () => {
    const corridors = ROOMS.filter((room) => room.isCorridor);
    expect(corridors).toHaveLength(1);
    const corridor = corridors[0] as Room;
    ROOMS.filter((room) => !room.isCorridor).forEach((room) => {
      const isTouching = room.gy1 === corridor.gy0 || room.gy0 === corridor.gy1;
      expect(isTouching).toBe(true);
    });
  });
});

describe('cutDoor', () => {
  it('leaves two pieces around a centered gap', () => {
    const pieces = cutDoor({ axis: WallAxis.AlongX, line: 0, start: 0, end: 10 }, 2);
    expect(pieces).toEqual([
      { axis: WallAxis.AlongX, line: 0, start: 0, end: 4 },
      { axis: WallAxis.AlongX, line: 0, start: 6, end: 10 },
    ]);
  });
});

describe('buildWalls', () => {
  const walls = buildWalls(ROOMS);

  it('gives every room a door onto the corridor', () => {
    const corridor = ROOMS.find((room) => room.isCorridor) as Room;
    ROOMS.filter((room) => !room.isCorridor).forEach((room) => {
      const doorLine = room.gy1 === corridor.gy0 ? corridor.gy0 : corridor.gy1;
      const center = getRoomCenter(room).gx;
      const isBlocked = walls.some((wall) => wall.axis === WallAxis.AlongX && wall.line === doorLine && wall.start < center && wall.end > center);
      expect(isBlocked).toBe(false);
      const hasJamb = walls.some((wall) => wall.axis === WallAxis.AlongX && wall.line === doorLine && wall.end === center - DOOR_WIDTH / 2);
      expect(hasJamb).toBe(true);
    });
  });

  it('does not duplicate shared walls', () => {
    const ids = walls.map((wall) => `${wall.axis}:${wall.line}:${wall.start}-${wall.end}`);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
