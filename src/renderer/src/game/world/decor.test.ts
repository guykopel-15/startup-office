import { vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { getRugs, getWallDecor } from './decor';
import { decorDepth } from './drawWalls';
import { ROOMS } from './floorPlan';
import { getDepth, getRectCenter } from './isoProjection';
import { WallKind, buildWallBoxes, isSpanCoveredByWalls, isWallAlongX } from './walls';

import type { Rug, WallDecor } from './decor';
import type { Room } from './floorPlan';
import type { WallBox } from './walls';

describe('getWallDecor', () => {
  const decorList = getWallDecor();

  it('keeps every piece within its wall and within the face height', () => {
    decorList.forEach((decor: WallDecor): void => {
      const start = isWallAlongX(decor.wall) ? decor.wall.gx0 : decor.wall.gy0;
      const end = isWallAlongX(decor.wall) ? decor.wall.gx1 : decor.wall.gy1;
      expect(decor.alongStart).toBeGreaterThanOrEqual(start);
      expect(decor.alongEnd).toBeLessThanOrEqual(end);
      expect(decor.alongEnd).toBeGreaterThan(decor.alongStart);
      expect(decor.heightStart).toBeGreaterThanOrEqual(0);
      expect(decor.heightEnd).toBeLessThanOrEqual(1);
    });
  });

  it('never hangs over a door gap', () => {
    decorList.forEach((decor: WallDecor): void => {
      expect(isSpanCoveredByWalls(decor.wall, decor.alongStart, decor.alongEnd)).toBe(true);
    });
  });

  it('draws above every interior wall piece it spans', () => {
    const interiorPieces = buildWallBoxes().filter((box: WallBox): boolean => box.kind === WallKind.Interior);
    decorList
      .filter((decor: WallDecor): boolean => decor.wall.kind === WallKind.Interior)
      .forEach((decor: WallDecor): void => {
        const isAlongX = isWallAlongX(decor.wall);
        const covered = interiorPieces.filter((box: WallBox): boolean => {
          const isSameLine = isAlongX ? box.gy0 === decor.wall.gy0 : box.gx0 === decor.wall.gx0;
          const pieceStart = isAlongX ? box.gx0 : box.gy0;
          const pieceEnd = isAlongX ? box.gx1 : box.gy1;
          return isSameLine && pieceStart < decor.alongEnd && pieceEnd > decor.alongStart;
        });
        expect(covered.length).toBeGreaterThan(0);
        covered.forEach((box: WallBox): void => expect(decorDepth(decor)).toBeGreaterThan(getDepth(getRectCenter(box))));
      });
  });
});

describe('getRugs', () => {
  it('keeps every rug inside some room', () => {
    getRugs().forEach((rug: Rug): void => {
      const isInsideARoom = ROOMS.some((room: Room): boolean => rug.gx0 >= room.gx0 && rug.gy0 >= room.gy0 && rug.gx1 <= room.gx1 && rug.gy1 <= room.gy1);
      expect(isInsideARoom).toBe(true);
    });
  });
});
