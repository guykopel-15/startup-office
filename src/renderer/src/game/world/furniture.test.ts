import { DEFAULT_FIGURES, RoomKey } from '@shared/figures';
import { ROOMS } from './floorPlan';
import { getDeskForFigure, getFurniture, getSeatPoint } from './furniture';
import { getDepth, getRectCenter } from './isoProjection';

import type { Figure } from '@shared/figures';
import type { Room } from './floorPlan';
import type { Furniture } from './furniture';
import type { GridRect } from './isoProjection';

function isInside(inner: GridRect, outer: GridRect): boolean {
  return inner.gx0 >= outer.gx0 && inner.gy0 >= outer.gy0 && inner.gx1 <= outer.gx1 && inner.gy1 <= outer.gy1;
}

function overlaps(first: GridRect, second: GridRect): boolean {
  return first.gx0 < second.gx1 && second.gx0 < first.gx1 && first.gy0 < second.gy1 && second.gy0 < first.gy1;
}

const pieces = getFurniture();

describe('getFurniture', () => {
  it('keeps every piece inside its room', () => {
    pieces.forEach((piece: Furniture): void => {
      const room = ROOMS.find((candidate: Room): boolean => candidate.key === piece.room);
      expect(room).toBeDefined();
      if (room === undefined) return;
      expect(isInside(piece, room)).toBe(true);
    });
  });

  it('never overlaps two pieces', () => {
    pieces.forEach((piece: Furniture, index: number): void => {
      pieces.slice(index + 1).forEach((other: Furniture): void => expect(overlaps(piece, other)).toBe(false));
    });
  });
});

describe('getDeskForFigure', () => {
  it('finds a desk for every default figure', () => {
    DEFAULT_FIGURES.forEach((figure: Figure): void => expect(getDeskForFigure(pieces, figure.room, figure.deskIndex)).toBeDefined());
  });

  it('gives no two figures the same desk', () => {
    const keys = DEFAULT_FIGURES.map((figure: Figure): string => `${figure.room}:${figure.deskIndex}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('returns undefined for a desk index the room does not have', () => {
    expect(getDeskForFigure(pieces, RoomKey.Sales, 99)).toBeUndefined();
    expect(getDeskForFigure(pieces, RoomKey.Lobby, 0)).toBeUndefined();
  });
});

describe('getSeatPoint', () => {
  it('places the seat behind the desk so the desk draws in front', () => {
    const desk = { gx0: 4, gy0: 10, gx1: 7, gy1: 12 };
    const seat = getSeatPoint(desk);
    expect(seat.gx).toBe(5.5);
    expect(getDepth(seat)).toBeLessThan(getDepth(getRectCenter(desk)));
  });
});
