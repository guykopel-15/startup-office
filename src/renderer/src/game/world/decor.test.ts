import { getRugs, getWallDecor } from './decor';
import { ROOMS } from './floorPlan';

describe('getWallDecor', () => {
  it('keeps every piece within its wall and within the face height', () => {
    getWallDecor().forEach((decor) => {
      const isAlongX = decor.wall.gx1 - decor.wall.gx0 > decor.wall.gy1 - decor.wall.gy0;
      const start = isAlongX ? decor.wall.gx0 : decor.wall.gy0;
      const end = isAlongX ? decor.wall.gx1 : decor.wall.gy1;
      expect(decor.uStart).toBeGreaterThanOrEqual(start);
      expect(decor.uEnd).toBeLessThanOrEqual(end);
      expect(decor.uEnd).toBeGreaterThan(decor.uStart);
      expect(decor.v0).toBeGreaterThanOrEqual(0);
      expect(decor.v1).toBeLessThanOrEqual(1);
    });
  });
});

describe('getRugs', () => {
  it('keeps every rug inside some room', () => {
    getRugs().forEach((rug) => {
      const isInsideARoom = ROOMS.some((room) => rug.gx0 >= room.gx0 && rug.gy0 >= room.gy0 && rug.gx1 <= room.gx1 && rug.gy1 <= room.gy1);
      expect(isInsideARoom).toBe(true);
    });
  });
});
