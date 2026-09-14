import Phaser from 'phaser';

import { GAME_FONT_FAMILY } from '@shared/theme';
import { PLAN_HEIGHT, PLAN_WIDTH, ROOMS, buildWalls, getRoomCenter, getRoomCorners, getWallEndpoints, getWallMidpoint, splitWall } from './floorPlan';
import { getDepth, projectToScreen } from './isoProjection';

import type { Room, WallSegment } from './floorPlan';
import type { GridPoint, ScreenPoint } from './isoProjection';

const SLAB_DEPTH = 16;
const SLAB_TOP_COLOR = 0x2b2547;
const SLAB_LEFT_COLOR = 0x1c1833;
const SLAB_RIGHT_COLOR = 0x241f3d;
const SLAB_EDGE_COLOR = 0x6b6398;
const SLAB_EDGE_ALPHA = 0.6;

const FLOOR_ALPHA = 0.85;
const FLOOR_GRID_COLOR = 0xffffff;
const FLOOR_GRID_ALPHA = 0.05;
const FLOOR_GRID_STEP = 2;
const FLOOR_BORDER_COLOR = 0x0e0a1a;
const FLOOR_BORDER_ALPHA = 0.35;

const WALL_HEIGHT = 20;
const WALL_FILL_COLOR = 0xb9b4dd;
const WALL_FILL_ALPHA = 0.42;
const WALL_TOP_COLOR = 0xe6e2ff;
const WALL_TOP_ALPHA = 0.95;
const WALL_BASE_COLOR = 0x0e0a1a;
const WALL_BASE_ALPHA = 0.5;
const WALL_POST_COLOR = 0xe6e2ff;
const WALL_POST_ALPHA = 0.5;
const CORNER_POST_WIDTH = 1;
const WALL_PIECE_LENGTH = 1;

const LABEL_FONT_SIZE = '7px';
const LABEL_COLOR = '#f1ecff';
const LABEL_ALPHA = 0.32;
const LABEL_RESOLUTION = 4;
const CORRIDOR_LABEL_GX = 6;
const HALF = 0.5;

/** Everything on the ground draws below anything standing on it. */
export const DEPTH_FLOOR = -1000;
export const DEPTH_LABEL = -900;

/** Floors, labels and walls, positioned at `origin` and depth-sorted with figures and furniture. */
export function drawIsoOffice(scene: Phaser.Scene, origin: ScreenPoint): void {
  const floors = scene.add.graphics({ x: origin.x, y: origin.y }).setDepth(DEPTH_FLOOR);
  drawSlab(floors);
  ROOMS.forEach((room) => drawFloor(floors, room));
  ROOMS.forEach((room) => createLabel(scene, origin, room));
  buildWalls(ROOMS).forEach((wall) => {
    const pieces = splitWall(wall, WALL_PIECE_LENGTH);
    pieces.forEach((piece, index) => drawWall(scene, origin, piece, index === 0, index === pieces.length - 1));
  });
}

function toPolygon(points: readonly GridPoint[]): ScreenPoint[] {
  return points.map(projectToScreen);
}

function fillPolygon(graphics: Phaser.GameObjects.Graphics, points: readonly ScreenPoint[], color: number, alpha: number): void {
  graphics.fillStyle(color, alpha).fillPoints(points.map((point) => new Phaser.Geom.Point(point.x, point.y)), true);
}

function strokePolygon(graphics: Phaser.GameObjects.Graphics, points: readonly ScreenPoint[], color: number, alpha: number): void {
  graphics.lineStyle(1, color, alpha).strokePoints(points.map((point) => new Phaser.Geom.Point(point.x, point.y)), true);
}

function drawSlab(graphics: Phaser.GameObjects.Graphics): void {
  const plan = { gx0: 0, gy0: 0, gx1: PLAN_WIDTH, gy1: PLAN_HEIGHT };
  const [top, right, bottom, left] = toPolygon(getRoomCorners(plan));
  if (top === undefined || right === undefined || bottom === undefined || left === undefined) return;
  const lower = (point: ScreenPoint): ScreenPoint => ({ x: point.x, y: point.y + SLAB_DEPTH });
  fillPolygon(graphics, [left, bottom, lower(bottom), lower(left)], SLAB_LEFT_COLOR, 1);
  fillPolygon(graphics, [bottom, right, lower(right), lower(bottom)], SLAB_RIGHT_COLOR, 1);
  fillPolygon(graphics, [top, right, bottom, left], SLAB_TOP_COLOR, 1);
  strokePolygon(graphics, [left, bottom, lower(bottom), lower(left)], SLAB_EDGE_COLOR, SLAB_EDGE_ALPHA);
  strokePolygon(graphics, [bottom, right, lower(right), lower(bottom)], SLAB_EDGE_COLOR, SLAB_EDGE_ALPHA);
}

function drawFloor(graphics: Phaser.GameObjects.Graphics, room: Room): void {
  const cornersOnScreen = toPolygon(getRoomCorners(room));
  fillPolygon(graphics, cornersOnScreen, room.floorColor, FLOOR_ALPHA);
  drawFloorGrid(graphics, room);
  strokePolygon(graphics, cornersOnScreen, FLOOR_BORDER_COLOR, FLOOR_BORDER_ALPHA);
}

function drawFloorGrid(graphics: Phaser.GameObjects.Graphics, room: Room): void {
  graphics.lineStyle(1, FLOOR_GRID_COLOR, FLOOR_GRID_ALPHA);
  for (let gx = room.gx0 + FLOOR_GRID_STEP; gx < room.gx1; gx += FLOOR_GRID_STEP) {
    strokeGridLine(graphics, { gx, gy: room.gy0 }, { gx, gy: room.gy1 });
  }
  for (let gy = room.gy0 + FLOOR_GRID_STEP; gy < room.gy1; gy += FLOOR_GRID_STEP) {
    strokeGridLine(graphics, { gx: room.gx0, gy }, { gx: room.gx1, gy });
  }
}

function strokeGridLine(graphics: Phaser.GameObjects.Graphics, from: GridPoint, to: GridPoint): void {
  const start = projectToScreen(from);
  const end = projectToScreen(to);
  graphics.lineBetween(start.x, start.y, end.x, end.y);
}

/** Each wall is its own Graphics so figures and desks can sit in front of or behind it. */
function drawWall(scene: Phaser.Scene, origin: ScreenPoint, wall: WallSegment, hasStartPost: boolean, hasEndPost: boolean): void {
  const graphics = scene.add.graphics({ x: origin.x, y: origin.y }).setDepth(getDepth(getWallMidpoint(wall)));
  const [fromGrid, toGrid] = getWallEndpoints(wall);
  const from = projectToScreen(fromGrid);
  const to = projectToScreen(toGrid);
  const raise = (point: ScreenPoint): ScreenPoint => ({ x: point.x, y: point.y - WALL_HEIGHT });
  fillPolygon(graphics, [from, to, raise(to), raise(from)], WALL_FILL_COLOR, WALL_FILL_ALPHA);
  graphics.lineStyle(1, WALL_BASE_COLOR, WALL_BASE_ALPHA).lineBetween(from.x, from.y, to.x, to.y);
  graphics.lineStyle(1, WALL_TOP_COLOR, WALL_TOP_ALPHA).lineBetween(raise(from).x, raise(from).y, raise(to).x, raise(to).y);
  graphics.fillStyle(WALL_POST_COLOR, WALL_POST_ALPHA);
  if (hasStartPost) graphics.fillRect(from.x - CORNER_POST_WIDTH * HALF, from.y - WALL_HEIGHT, CORNER_POST_WIDTH, WALL_HEIGHT);
  if (hasEndPost) graphics.fillRect(to.x - CORNER_POST_WIDTH * HALF, to.y - WALL_HEIGHT, CORNER_POST_WIDTH, WALL_HEIGHT);
}

function getLabelAnchor(room: Room): GridPoint {
  const center = getRoomCenter(room);
  return room.isCorridor ? { gx: CORRIDOR_LABEL_GX, gy: center.gy } : center;
}

function createLabel(scene: Phaser.Scene, origin: ScreenPoint, room: Room): void {
  const center = projectToScreen(getLabelAnchor(room));
  scene.add
    .text(origin.x + center.x, origin.y + center.y, room.name, { fontFamily: GAME_FONT_FAMILY, fontSize: LABEL_FONT_SIZE, color: LABEL_COLOR, fontStyle: 'bold', resolution: LABEL_RESOLUTION })
    .setOrigin(HALF, HALF)
    .setAlpha(LABEL_ALPHA)
    .setDepth(DEPTH_LABEL);
}
