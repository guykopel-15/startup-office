import { RoomKey } from '@shared/figures';
import { findRoom } from './floorPlan';
import { getDeskForFigure, getFurniture, getSeatPoint } from './furniture';
import { buildWalkableGrid, findWalkPath, meetingSpots, roomAt, roomTiles, toTile } from './navigation';

import type { GridPoint } from './isoProjection';

const furniture = getFurniture();
const grid = buildWalkableGrid(furniture);

describe('navigation', (): void => {
  it('blocks desks and walls but leaves room floor and door gaps open', (): void => {
    const desk = getDeskForFigure(furniture, RoomKey.ResearchAndDevelopment, 0);
    if (desk === undefined) throw new Error('no desk');
    expect(grid[desk.gy0 + 1]?.[desk.gx0 + 1]).toBe(false);
    expect(grid[desk.gy0 - 1]?.[desk.gx0 + 1]).toBe(true);
    const rnd = findRoom(RoomKey.ResearchAndDevelopment);
    const doorCenter = Math.floor((rnd.gx0 + rnd.gx1) / 2);
    expect(grid[rnd.gy1]?.[doorCenter]).toBe(true);
    expect(grid[rnd.gy1]?.[rnd.gx0 + 1]).toBe(false);
  });

  it('finds a path from a desk seat to the meeting room through the doors', (): void => {
    const desk = getDeskForFigure(furniture, RoomKey.Sales, 0);
    if (desk === undefined) throw new Error('no desk');
    const spot = meetingSpots(furniture)[0];
    if (spot === undefined) throw new Error('no spot');
    const path = findWalkPath(grid, getSeatPoint(desk), spot);
    expect(path).not.toBeNull();
    expect(path?.[path.length - 1]).toEqual(spot);
    expect(path?.some((point: GridPoint): boolean => roomAt(point)?.key === RoomKey.Lobby)).toBe(true);
    expect(path?.every((point: GridPoint): boolean => roomAt(point) !== null)).toBe(true);
  });

  it('lists walkable tiles inside a room only and gives enough meeting spots for a team', (): void => {
    const tiles = roomTiles(grid, RoomKey.Marketing);
    expect(tiles.length).toBeGreaterThan(10);
    expect(tiles.every((tile: GridPoint): boolean => roomAt(tile)?.key === RoomKey.Marketing)).toBe(true);
    expect(meetingSpots(furniture).length).toBeGreaterThanOrEqual(12);
    expect(meetingSpots(furniture).every((spot: GridPoint): boolean => roomAt(spot)?.key === RoomKey.MeetingRoom)).toBe(true);
    expect(toTile({ gx: 3.7, gy: 9.2 })).toEqual({ gx: 3, gy: 9 });
  });
});
