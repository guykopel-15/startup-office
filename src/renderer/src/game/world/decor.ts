import { RoomKey } from '@shared/figures';
import { HALF } from '@shared/theme';
import { CORRIDOR_END, TOP_ROW_END, findRoom, toPlanRect } from './floorPlan';
import { getInteriorWallBoxAlongX, getInteriorWallBoxAlongY, getNorthWallBox, getWestWallBox } from './walls';

import type { GridRect } from './isoProjection';
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

/** Height band on a wall face, 0 = floor, 1 = top of the wall. */
export interface HeightBand {
  heightStart: number;
  heightEnd: number;
}

/** Something hung on a wall face. `along*` are plan tiles along the wall. */
export interface WallDecor extends HeightBand {
  kind: DecorKind;
  wall: WallBox;
  alongStart: number;
  alongEnd: number;
}

export interface Rug extends GridRect {
  color: RugColor;
}

const WINDOW_WIDTH = 6;
const WINDOW_BAND: HeightBand = { heightStart: 0.36, heightEnd: 0.82 };
const STICKY_BAND: HeightBand = { heightStart: 0.3, heightEnd: 0.62 };
const WHITEBOARD_BAND: HeightBand = { heightStart: 0.2, heightEnd: 0.75 };
const INTERIOR_WHITEBOARD_BAND: HeightBand = { heightStart: 0.25, heightEnd: 0.9 };
const CHART_BAND: HeightBand = { heightStart: 0.4, heightEnd: 0.72 };
const INTERIOR_CHART_BAND: HeightBand = { heightStart: 0.35, heightEnd: 0.85 };
const POSTER_BAND: HeightBand = { heightStart: 0.42, heightEnd: 0.78 };
const STICKY_WALL_WIDTH = 4;
const WHITEBOARD_WIDTH = 5;
const INTERIOR_WHITEBOARD_WIDTH = 3.5;
const CHART_WIDTH = 2.4;
const POSTER_WIDTH = 2.5;

const RND_STICKY_START = 2;
const MEETING_WHITEBOARD_START = 8.5;
const PRODUCT_CHART_START = 10.5;
const PRODUCT_DIVIDER_CHART_START = 7;
const MARKETING_POSTER_STARTS: readonly number[] = [21, 24.5];
const SALES_CHART_START = 8;
const FINANCE_CHART_START = 1.5;
const MARKETING_WHITEBOARD_START = 0.8;

const PRODUCT_RUG: GridRect = { gx0: 2.5, gy0: 3.5, gx1: 13, gy1: 12.5 };
const SMALL_ROOM_RUG: GridRect = { gx0: 1.2, gy0: 2.5, gx1: 10.8, gy1: 13.5 };

function onWall(kind: DecorKind, wall: WallBox, alongStart: number, width: number, band: HeightBand): WallDecor {
  return { kind, wall, alongStart, alongEnd: alongStart + width, ...band };
}

function onNorthWall(kind: DecorKind, room: RoomKey, localStart: number, width: number, band: HeightBand): WallDecor {
  return onWall(kind, getNorthWallBox(), findRoom(room).gx0 + localStart, width, band);
}

function windowCenteredOn(room: RoomKey): WallDecor {
  const bounds = findRoom(room);
  const center = (bounds.gx0 + bounds.gx1) * HALF;
  return onWall(DecorKind.Window, getNorthWallBox(), center - WINDOW_WIDTH * HALF, WINDOW_WIDTH, WINDOW_BAND);
}

function onCorridorSouthWall(kind: DecorKind, room: RoomKey, localStart: number, width: number, band: HeightBand): WallDecor {
  const bounds = findRoom(room);
  return onWall(kind, getInteriorWallBoxAlongX(CORRIDOR_END, bounds.gx0, bounds.gx1), bounds.gx0 + localStart, width, band);
}

/** All wall decor, in plan coordinates. */
export function getWallDecor(): WallDecor[] {
  const product = findRoom(RoomKey.Product);
  return [
    windowCenteredOn(RoomKey.ResearchAndDevelopment),
    windowCenteredOn(RoomKey.MeetingRoom),
    windowCenteredOn(RoomKey.Product),
    onNorthWall(DecorKind.StickyNotes, RoomKey.ResearchAndDevelopment, RND_STICKY_START, STICKY_WALL_WIDTH, STICKY_BAND),
    onNorthWall(DecorKind.Whiteboard, RoomKey.MeetingRoom, MEETING_WHITEBOARD_START, WHITEBOARD_WIDTH, WHITEBOARD_BAND),
    onNorthWall(DecorKind.Chart, RoomKey.Product, PRODUCT_CHART_START, CHART_WIDTH, CHART_BAND),
    ...MARKETING_POSTER_STARTS.map((start: number): WallDecor => onWall(DecorKind.Poster, getWestWallBox(), start, POSTER_WIDTH, POSTER_BAND)),
    onWall(DecorKind.Chart, getInteriorWallBoxAlongY(product.gx0, 0, TOP_ROW_END), PRODUCT_DIVIDER_CHART_START, CHART_WIDTH, INTERIOR_CHART_BAND),
    onCorridorSouthWall(DecorKind.Chart, RoomKey.Sales, SALES_CHART_START, CHART_WIDTH, INTERIOR_CHART_BAND),
    onCorridorSouthWall(DecorKind.Chart, RoomKey.Finance, FINANCE_CHART_START, CHART_WIDTH, INTERIOR_CHART_BAND),
    onCorridorSouthWall(DecorKind.Whiteboard, RoomKey.Marketing, MARKETING_WHITEBOARD_START, INTERIOR_WHITEBOARD_WIDTH, INTERIOR_WHITEBOARD_BAND),
  ];
}

export function getRugs(): Rug[] {
  return [
    { ...toPlanRect(findRoom(RoomKey.Product), PRODUCT_RUG), color: RugColor.Navy },
    { ...toPlanRect(findRoom(RoomKey.Marketing), SMALL_ROOM_RUG), color: RugColor.Red },
    { ...toPlanRect(findRoom(RoomKey.Sales), SMALL_ROOM_RUG), color: RugColor.Orange },
    { ...toPlanRect(findRoom(RoomKey.Finance), SMALL_ROOM_RUG), color: RugColor.Green },
  ];
}
