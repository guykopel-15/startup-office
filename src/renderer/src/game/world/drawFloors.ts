import Phaser from 'phaser';

import { GAME_FONT_FAMILY } from '@shared/theme';
import { RugColor, getRugs } from './decor';
import { FloorKind, PLAN_HEIGHT, PLAN_WIDTH, ROOMS, getRoomCenter, getRoomCorners } from './floorPlan';
import { projectToScreen } from './isoProjection';
import { PALETTE } from './palette';
import { rectCorners, toPoints } from './drawPrism';

import type { Rug } from './decor';
import type { GridRect, Room } from './floorPlan';
import type { GridPoint, ScreenPoint } from './isoProjection';

export const DEPTH_FLOOR = -1000;
export const DEPTH_LABEL = -900;
const SLAB_DEPTH = 14;
const GRID_STEP = 2;
const GRID_ALPHA = 0.1;
const CHECKER_STEP = 2;
const CORRIDOR_INSET = 1;
const RUG_BORDER = 0.25;
const LABEL_FONT_SIZE = '6px';
const LABEL_ALPHA = 0.5;
const LABEL_RESOLUTION = 4;
const CORRIDOR_LABEL_GX = 5;
const LABEL_CORNER_INSET_X = 3.2;
const LABEL_CORNER_INSET_Y = 1.4;
const HALF = 0.5;

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
  ROOMS.forEach((room) => drawRoomFloor(graphics, room));
  getRugs().forEach((rug) => drawRug(graphics, rug));
  ROOMS.forEach((room) => createLabel(scene, origin, room));
}

function fillRect(graphics: Phaser.GameObjects.Graphics, rect: GridRect, color: number, alpha = 1): void {
  graphics.fillStyle(color, alpha).fillPoints(toPoints(rectCorners(rect)), true);
}

function drawSlab(graphics: Phaser.GameObjects.Graphics): void {
  const [top, right, bottom, left] = rectCorners({ gx0: 0, gy0: 0, gx1: PLAN_WIDTH, gy1: PLAN_HEIGHT });
  const lower = (point: ScreenPoint): ScreenPoint => ({ x: point.x, y: point.y + SLAB_DEPTH });
  graphics.fillStyle(PALETTE.slabSide, 1).fillPoints(toPoints([left, bottom, lower(bottom), lower(left)]), true);
  graphics.fillStyle(PALETTE.slabSideDark, 1).fillPoints(toPoints([bottom, right, lower(right), lower(bottom)]), true);
  graphics.fillStyle(PALETTE.floorTile, 1).fillPoints(toPoints([top, right, bottom, left]), true);
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
      fillRect(graphics, { gx0: room.gx0 + CORRIDOR_INSET, gy0: room.gy0 + CORRIDOR_INSET, gx1: room.gx1 - CORRIDOR_INSET, gy1: room.gy1 - CORRIDOR_INSET }, PALETTE.corridorRunner);
      return;
  }
}

function drawGrid(graphics: Phaser.GameObjects.Graphics, room: GridRect): void {
  graphics.lineStyle(1, PALETTE.outline, GRID_ALPHA);
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
  fillRect(graphics, { gx0: rug.gx0 + RUG_BORDER, gy0: rug.gy0 + RUG_BORDER, gx1: rug.gx1 - RUG_BORDER, gy1: rug.gy1 - RUG_BORDER }, colors.fill);
}

function createLabel(scene: Phaser.Scene, origin: ScreenPoint, room: Room): void {
  const center = getRoomCenter(room);
  const anchor = room.isCorridor ? { gx: CORRIDOR_LABEL_GX, gy: center.gy } : { gx: room.gx1 - LABEL_CORNER_INSET_X, gy: room.gy1 - LABEL_CORNER_INSET_Y };
  const point = projectToScreen(anchor);
  scene.add
    .text(origin.x + point.x, origin.y + point.y, room.name, { fontFamily: GAME_FONT_FAMILY, fontSize: LABEL_FONT_SIZE, color: PALETTE.labelText, fontStyle: 'bold', resolution: LABEL_RESOLUTION })
    .setOrigin(HALF, HALF)
    .setAlpha(LABEL_ALPHA)
    .setDepth(DEPTH_LABEL);
}

export { getRoomCorners };
