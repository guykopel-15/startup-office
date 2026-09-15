import { RoomKey } from '@shared/figures';
import { ROOMS, findRoom } from './floorPlan';
import { getDeskForFigure, getFurniture, getSeatPoint } from './furniture';
import { buildWalkableGrid, findWalkPath, meetingSpots, roomTiles, toTile } from './navigation';

import type { Room } from './floorPlan';
import type { Furniture } from './furniture';
import type { GridPoint } from './isoProjection';

const furniture = getFurniture();
const grid = buildWalkableGrid(furniture);

function roomOf(point: GridPoint): RoomKey | null {
  return ROOMS.find((room: Room): boolean => point.gx >= room.gx0 && point.gx < room.gx1 && point.gy >= room.gy0 && point.gy < room.gy1)?.key ?? null;
}

describe('navigation', (): void => {
  it('blocks desks and both halves of a door wall but leaves room floor and the door gap open', (): void => {
    const desk = getDeskForFigure(furniture, RoomKey.ResearchAndDevelopment, 0);
    if (desk === undefined) throw new Error('no desk');
    expect(grid[desk.gy0 + 1]?.[desk.gx0 + 1]).toBe(false);
    expect(grid[desk.gy0 - 1]?.[desk.gx0 + 1]).toBe(true);
    const researchRoom = findRoom(RoomKey.ResearchAndDevelopment);
    const doorCenter = Math.floor((researchRoom.gx0 + researchRoom.gx1) / 2);
    expect(grid[researchRoom.gy1]?.[doorCenter]).toBe(true);
    expect(grid[researchRoom.gy1]?.[researchRoom.gx0 + 1]).toBe(false);
    expect(grid[researchRoom.gy1]?.[researchRoom.gx1 - 2]).toBe(false);
    expect(grid[researchRoom.gy1 - 1]?.[researchRoom.gx1 - 2]).toBe(false);
  });

  it('finds a path from a desk seat to the meeting room through the doors, and null when unreachable', (): void => {
    const desk = getDeskForFigure(furniture, RoomKey.Sales, 0);
    if (desk === undefined) throw new Error('no desk');
    const spot = meetingSpots(furniture)[0];
    if (spot === undefined) throw new Error('no spot');
    const path = findWalkPath(grid, getSeatPoint(desk), spot);
    expect(path).not.toBeNull();
    expect(path?.[path.length - 1]).toEqual(spot);
    expect(path?.some((point: GridPoint): boolean => roomOf(point) === RoomKey.Lobby)).toBe(true);
    expect(path?.every((point: GridPoint): boolean => roomOf(point) !== null)).toBe(true);
    expect(findWalkPath(grid, getSeatPoint(desk), { gx: desk.gx0 + 1, gy: desk.gy0 + 1 })).toBeNull();
  });

  it('lets every seat in the office reach the meeting table', (): void => {
    const spot = meetingSpots(furniture)[0];
    if (spot === undefined) throw new Error('no spot');
    const seats = furniture.filter((piece: Furniture): boolean => piece.desk !== null).map(getSeatPoint);
    expect(seats.length).toBeGreaterThan(10);
    seats.forEach((seat: GridPoint): void => {
      expect(findWalkPath(grid, seat, spot)).not.toBeNull();
    });
  });

  it('lists walkable tiles inside a room minus excluded seats, and gives enough meeting spots for a team', (): void => {
    const tiles = roomTiles(grid, RoomKey.Marketing);
    expect(tiles.length).toBeGreaterThan(10);
    expect(tiles.every((tile: GridPoint): boolean => roomOf(tile) === RoomKey.Marketing)).toBe(true);
    const desk = getDeskForFigure(furniture, RoomKey.Marketing, 0);
    if (desk === undefined) throw new Error('no desk');
    const seat = getSeatPoint(desk);
    expect(tiles.some((tile: GridPoint): boolean => tile.gx === toTile(seat).gx && tile.gy === toTile(seat).gy)).toBe(true);
    expect(roomTiles(grid, RoomKey.Marketing, [seat]).some((tile: GridPoint): boolean => tile.gx === toTile(seat).gx && tile.gy === toTile(seat).gy)).toBe(false);
    expect(meetingSpots(furniture).length).toBeGreaterThanOrEqual(12);
    expect(meetingSpots(furniture).every((spot: GridPoint): boolean => roomOf(spot) === RoomKey.MeetingRoom)).toBe(true);
    expect(toTile({ gx: 3.7, gy: 9.2 })).toEqual({ gx: 3, gy: 9 });
  });
});
