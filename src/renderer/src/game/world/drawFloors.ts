import Phaser from 'phaser';

import { GAME_FONT_FAMILY, GAME_TEXT_RESOLUTION, HALF } from '@shared/theme';
import { RugColor, getRugs } from './decor';
import { fillQuad, rectCorners } from './drawPrism';
import { FloorKind, PLAN_RECT, ROOMS } from './floorPlan';
import { getRectCenter, projectToScreen } from './isoProjection';
import { PALETTE } from './palette';

import type { Rug } from './decor';
import type { Room } from './floorPlan';
import type { GridPoint, GridRect, ScreenPoint } from './isoProjection';

export const SLAB_DEPTH = 14;
const DEPTH_FLOOR = -1000;
const DEPTH_LABEL = -900;
const GRID_STEP = 2;
const GRID_ALPHA = 0.1;
const CHECKER_STEP = 2;
const CORRIDOR_INSET = 1;
const RUG_BORDER = 0.25;
const LABEL_FONT_SIZE = '6px';
const LABEL_FONT_STYLE = 'bold';
const LABEL_ALPHA = 0.5;
const CORRIDOR_LABEL_GX = 5;
const LABEL_CORNER_INSET_X = 3.2;
const LABEL_CORNER_INSET_Y = 1.4;
const LINE_WIDTH = 1;

interface RugColors {
  fill: number;
  border: number;
}

const RUG_COLORS: Readonly<Record<RugColor, RugColors>> = {
  [RugColor.Navy]: { fill: PALETTE.rugNavy, border: PALETTE.rugNavyBorder },
  [RugColor.Red]: { fill: PALETTE.rugRed, border: PALETTE.rugRedBorder },
  [RugColor.Green]: { fill: PALETTE.rugGreen, border: PALETTE.rugGreenBorder },
  [RugColor.Orange]: { fill: PALETTE.rugOrange, border: PALETTE.rugOrangeBorder },
};

/** Slab, every room floor, rugs, and faint room labels. One Graphics at floor depth. */
export function drawFloors(scene: Phaser.Scene, origin: ScreenPoint): void {
  const graphics = scene.add.graphics({ x: origin.x, y: origin.y }).setDepth(DEPTH_FLOOR);
  drawSlab(graphics);
  ROOMS.forEach((room: Room): void => drawRoomFloor(graphics, room));
  getRugs().forEach((rug: Rug): void => drawRug(graphics, rug));
  ROOMS.forEach((room: Room): void => createLabel(scene, origin, room));
}

function fillRect(graphics: Phaser.GameObjects.Graphics, rect: GridRect, color: number): void {
  fillQuad(graphics, rectCorners(rect), color);
}

function inset(rect: GridRect, amount: number): GridRect {
  return { gx0: rect.gx0 + amount, gy0: rect.gy0 + amount, gx1: rect.gx1 - amount, gy1: rect.gy1 - amount };
}

function drawSlab(graphics: Phaser.GameObjects.Graphics): void {
  const [top, right, bottom, left] = rectCorners(PLAN_RECT);
  const lower = (point: ScreenPoint): ScreenPoint => ({ x: point.x, y: point.y + SLAB_DEPTH });
  fillQuad(graphics, [left, bottom, lower(bottom), lower(left)], PALETTE.slabSide);
  fillQuad(graphics, [bottom, right, lower(right), lower(bottom)], PALETTE.slabSideDark);
  fillQuad(graphics, [top, right, bottom, left], PALETTE.floorTile);
}

function drawRoomFloor(graphics: Phaser.GameObjects.Graphics, room: Room): void {
  switch (room.floor) {
    case FloorKind.Tile:
      fillRect(graphics, room, PALETTE.floorTile);
      drawGrid(graphics, room);
      return;
    case FloorKind.Orange:
      fillRect(graphics, room, PALETTE.floorOrange);
      drawGrid(graphics, room);
      return;
    case FloorKind.Checker:
      drawChecker(graphics, room);
      return;
    case FloorKind.Corridor:
      fillRect(graphics, room, PALETTE.corridor);
      fillRect(graphics, inset(room, CORRIDOR_INSET), PALETTE.corridorRunner);
      return;
  }
}

function drawGrid(graphics: Phaser.GameObjects.Graphics, room: GridRect): void {
  graphics.lineStyle(LINE_WIDTH, PALETTE.outline, GRID_ALPHA);
  for (let gx = room.gx0 + GRID_STEP; gx < room.gx1; gx += GRID_STEP) strokeLine(graphics, { gx, gy: room.gy0 }, { gx, gy: room.gy1 });
  for (let gy = room.gy0 + GRID_STEP; gy < room.gy1; gy += GRID_STEP) strokeLine(graphics, { gx: room.gx0, gy }, { gx: room.gx1, gy });
}

function strokeLine(graphics: Phaser.GameObjects.Graphics, from: GridPoint, to: GridPoint): void {
  const start = projectToScreen(from);
  const end = projectToScreen(to);
  graphics.lineBetween(start.x, start.y, end.x, end.y);
}

function drawChecker(graphics: Phaser.GameObjects.Graphics, room: GridRect): void {
  fillRect(graphics, room, PALETTE.floorCheckerLight);
  for (let gy = room.gy0; gy < room.gy1; gy += CHECKER_STEP) {
    for (let gx = room.gx0; gx < room.gx1; gx += CHECKER_STEP) {
      const isDark = ((gx - room.gx0) / CHECKER_STEP + (gy - room.gy0) / CHECKER_STEP) % 2 === 0;
      if (!isDark) continue;
      fillRect(graphics, { gx0: gx, gy0: gy, gx1: Math.min(gx + CHECKER_STEP, room.gx1), gy1: Math.min(gy + CHECKER_STEP, room.gy1) }, PALETTE.floorCheckerDark);
    }
  }
}

function drawRug(graphics: Phaser.GameObjects.Graphics, rug: Rug): void {
  const colors = RUG_COLORS[rug.color];
  fillRect(graphics, rug, colors.border);
  fillRect(graphics, inset(rug, RUG_BORDER), colors.fill);
}

function labelAnchor(room: Room): GridPoint {
  if (room.isCorridor) return { gx: CORRIDOR_LABEL_GX, gy: getRectCenter(room).gy };
  return { gx: room.gx1 - LABEL_CORNER_INSET_X, gy: room.gy1 - LABEL_CORNER_INSET_Y };
}

function createLabel(scene: Phaser.Scene, origin: ScreenPoint, room: Room): void {
  const point = projectToScreen(labelAnchor(room));
  scene.add
    .text(origin.x + point.x, origin.y + point.y, room.name, { fontFamily: GAME_FONT_FAMILY, fontSize: LABEL_FONT_SIZE, color: PALETTE.labelText, fontStyle: LABEL_FONT_STYLE, resolution: GAME_TEXT_RESOLUTION })
    .setOrigin(HALF, HALF)
    .setAlpha(LABEL_ALPHA)
    .setDepth(DEPTH_LABEL);
}
