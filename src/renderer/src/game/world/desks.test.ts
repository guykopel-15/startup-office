import { DEFAULT_FIGURES } from '@shared/figures';
import { getDeskForFigure, getDesks, getFixedFurniture, getSeatPoint } from './desks';
import { ROOMS } from './floorPlan';

import type { GridRect } from './floorPlan';

function isInside(inner: GridRect, outer: GridRect): boolean {
  return inner.gx0 >= outer.gx0 && inner.gy0 >= outer.gy0 && inner.gx1 <= outer.gx1 && inner.gy1 <= outer.gy1;
}

function overlaps(first: GridRect, second: GridRect): boolean {
  return first.gx0 < second.gx1 && second.gx0 < first.gx1 && first.gy0 < second.gy1 && second.gy0 < first.gy1;
}

describe('getDesks', () => {
  const desks = getDesks();

  it('keeps every desk inside its room', () => {
    desks.forEach((desk) => {
      const room = ROOMS.find((candidate) => candidate.key === desk.room);
      expect(room).toBeDefined();
      if (room === undefined) return;
      expect(isInside(desk, room)).toBe(true);
    });
  });

  it('never overlaps two pieces of furniture', () => {
    const pieces = [...desks, ...getFixedFurniture()];
    pieces.forEach((piece, index) => {
      pieces.slice(index + 1).forEach((other) => expect(overlaps(piece, other)).toBe(false));
    });
  });
});

describe('getDeskForFigure', () => {
  it('finds a desk for every default figure', () => {
    DEFAULT_FIGURES.forEach((figure) => {
      expect(getDeskForFigure(figure.room, figure.deskIndex)).toBeDefined();
    });
  });

  it('gives no two figures the same desk', () => {
    const keys = DEFAULT_FIGURES.map((figure) => `${figure.room}:${figure.deskIndex}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('getSeatPoint', () => {
  it('places the seat behind the desk so the desk draws in front', () => {
    const seat = getSeatPoint({ gx0: 4, gy0: 10, gx1: 7, gy1: 12 });
    expect(seat.gx).toBe(5.5);
    expect(seat.gy).toBeLessThan(10);
  });
});
