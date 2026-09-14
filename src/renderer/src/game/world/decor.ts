import { RoomKey } from '@shared/figures';
import { CORRIDOR_END, TOP_ROW_END, findRoom, toPlanRect } from './floorPlan';
import { getInteriorWallBoxAlongX, getInteriorWallBoxAlongY, getNorthWallBox, getWestWallBox } from './walls';

import type { GridRect } from './floorPlan';
import type { WallBox } from './walls';

export enum DecorKind {
  Window = 'window',
  Whiteboard = 'whiteboard',
  Chart = 'chart',
  StickyNotes = 'stickyNotes',
  Poster = 'poster',
}

export enum RugColor {
  Navy = 'navy',
  Red = 'red',
  Green = 'green',
  Orange = 'orange',
}

/** Something hung on a wall face. `u` runs along the wall in plan tiles; `v` is height 0..1. */
export interface WallDecor {
  kind: DecorKind;
  wall: WallBox;
  uStart: number;
  uEnd: number;
  v0: number;
  v1: number;
}

export interface Rug extends GridRect {
  color: RugColor;
}

const WINDOW_WIDTH = 6;
const WINDOW_V0 = 0.36;
const WINDOW_V1 = 0.82;
const HALF = 0.5;

function onNorthWall(kind: DecorKind, room: RoomKey, localStart: number, width: number, v0: number, v1: number): WallDecor {
  const bounds = findRoom(room);
  return { kind, wall: getNorthWallBox(), uStart: bounds.gx0 + localStart, uEnd: bounds.gx0 + localStart + width, v0, v1 };
}

function windowCenteredOn(room: RoomKey): WallDecor {
  const bounds = findRoom(room);
  const center = (bounds.gx0 + bounds.gx1) * HALF;
  return { kind: DecorKind.Window, wall: getNorthWallBox(), uStart: center - WINDOW_WIDTH * HALF, uEnd: center + WINDOW_WIDTH * HALF, v0: WINDOW_V0, v1: WINDOW_V1 };
}

function onCorridorSouthWall(kind: DecorKind, room: RoomKey, localStart: number, width: number, v0: number, v1: number): WallDecor {
  const bounds = findRoom(room);
  const wall = getInteriorWallBoxAlongX(CORRIDOR_END, bounds.gx0, bounds.gx1);
  return { kind, wall, uStart: bounds.gx0 + localStart, uEnd: bounds.gx0 + localStart + width, v0, v1 };
}

/** All wall decor, in plan coordinates. */
export function getWallDecor(): WallDecor[] {
  const product = findRoom(RoomKey.Product);
  return [
    windowCenteredOn(RoomKey.ResearchAndDevelopment),
    windowCenteredOn(RoomKey.MeetingRoom),
    windowCenteredOn(RoomKey.Product),
    onNorthWall(DecorKind.StickyNotes, RoomKey.ResearchAndDevelopment, 2, 4, 0.3, 0.62),
    onNorthWall(DecorKind.Whiteboard, RoomKey.MeetingRoom, 8.5, 5, 0.2, 0.75),
    onNorthWall(DecorKind.Chart, RoomKey.Product, 10.5, 2.4, 0.4, 0.72),
    { kind: DecorKind.Poster, wall: getWestWallBox(), uStart: 21, uEnd: 23.5, v0: 0.42, v1: 0.78 },
    { kind: DecorKind.Poster, wall: getWestWallBox(), uStart: 24.5, uEnd: 27, v0: 0.42, v1: 0.78 },
    { kind: DecorKind.Chart, wall: getInteriorWallBoxAlongY(product.gx0, 0, TOP_ROW_END), uStart: 7, uEnd: 9.5, v0: 0.35, v1: 0.85 },
    onCorridorSouthWall(DecorKind.Chart, RoomKey.Sales, 8, 2.4, 0.35, 0.85),
    onCorridorSouthWall(DecorKind.Chart, RoomKey.Finance, 3, 2.4, 0.35, 0.85),
    onCorridorSouthWall(DecorKind.Whiteboard, RoomKey.Marketing, 1.5, 3.5, 0.25, 0.9),
  ];
}

export function getRugs(): Rug[] {
  return [
    { ...toPlanRect(findRoom(RoomKey.Product), { gx0: 2.5, gy0: 3.5, gx1: 13, gy1: 12.5 }), color: RugColor.Navy },
    { ...toPlanRect(findRoom(RoomKey.Marketing), { gx0: 1.2, gy0: 2.5, gx1: 10.8, gy1: 13.5 }), color: RugColor.Red },
    { ...toPlanRect(findRoom(RoomKey.Sales), { gx0: 1.2, gy0: 2.5, gx1: 10.8, gy1: 13.5 }), color: RugColor.Orange },
    { ...toPlanRect(findRoom(RoomKey.Finance), { gx0: 1.2, gy0: 2.5, gx1: 10.8, gy1: 13.5 }), color: RugColor.Green },
  ];
}
