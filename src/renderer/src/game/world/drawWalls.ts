import Phaser from 'phaser';

import { DecorKind, getWallDecor } from './decor';
import { PrismFace, drawFacePatch, drawPrism, facePatchQuad, toPoints } from './drawPrism';
import { getDepth } from './isoProjection';
import { getFurnitureCenter } from './furniture';
import { PALETTE } from './palette';
import { WALL_HEIGHTS, WallKind, buildWallBoxes } from './walls';

import type { WallDecor } from './decor';
import type { PrismColors } from './drawPrism';
import type { ScreenPoint } from './isoProjection';
import type { WallBox } from './walls';

const BASEBOARD_V = 0.06;
const DECOR_DEPTH_BONUS = 0.05;
const WINDOW_FRAME_INSET = 0.08;
const WINDOW_GLOW_ALPHA = 0.18;
const WINDOW_GLOW_PAD = 0.35;
const STICKY_SIZE = 0.8;
const STICKY_COLORS: readonly number[] = [PALETTE.stickyYellow, PALETTE.stickyTeal, PALETTE.stickyOrange, PALETTE.stickyPurple];
const STICKY_V_OFFSETS: readonly number[] = [0, 0.12, -0.06, 0.2];
const CHART_BAR_COUNT = 4;
const CHART_BAR_COLORS: readonly number[] = [PALETTE.screenBlue, PALETTE.ledGreen, PALETTE.lamp, PALETTE.mugRed];
const WHITEBOARD_LINE_COLOR = PALETTE.chairTop;
const HALF = 0.5;

const WALL_COLORS: Readonly<Record<WallKind, PrismColors>> = {
  [WallKind.Exterior]: { top: PALETTE.wallTop, south: PALETTE.wallSouth, east: PALETTE.wallEast },
  [WallKind.Interior]: { top: PALETTE.wallTop, south: PALETTE.wallSouth, east: PALETTE.wallEast },
  [WallKind.Rim]: { top: PALETTE.rimTop, south: PALETTE.rimSouth, east: PALETTE.rimEast },
};

/** Every wall piece as its own depth-sorted Graphics, then the decor hung on the walls. */
export function drawWalls(scene: Phaser.Scene, origin: ScreenPoint): void {
  buildWallBoxes().forEach((wallBox) => drawWallPiece(scene, origin, wallBox));
  getWallDecor().forEach((decor) => drawDecor(scene, origin, decor));
}

function drawWallPiece(scene: Phaser.Scene, origin: ScreenPoint, wallBox: WallBox): void {
  const graphics = scene.add.graphics({ x: origin.x, y: origin.y }).setDepth(getDepth(getFurnitureCenter(wallBox)));
  const height = WALL_HEIGHTS[wallBox.kind];
  drawPrism(graphics, wallBox, height, WALL_COLORS[wallBox.kind], false);
  if (wallBox.kind === WallKind.Rim) return;
  drawFacePatch(graphics, wallBox, height, PrismFace.South, { u0: 0, u1: 1, v0: 0, v1: BASEBOARD_V }, PALETTE.wallBaseboard);
  drawFacePatch(graphics, wallBox, height, PrismFace.East, { u0: 0, u1: 1, v0: 0, v1: BASEBOARD_V }, PALETTE.wallBaseboard);
}

/** Decor hangs on the face that looks into the room: south for walls along x, east for walls along y. */
function faceFor(wall: WallBox): PrismFace {
  const isAlongX = wall.gx1 - wall.gx0 > wall.gy1 - wall.gy0;
  return isAlongX ? PrismFace.South : PrismFace.East;
}

function toU(wall: WallBox, face: PrismFace, value: number): number {
  return face === PrismFace.South ? (value - wall.gx0) / (wall.gx1 - wall.gx0) : (value - wall.gy0) / (wall.gy1 - wall.gy0);
}

function decorDepth(decor: WallDecor, face: PrismFace): number {
  const mid = (decor.uStart + decor.uEnd) * HALF;
  const point = face === PrismFace.South ? { gx: mid, gy: decor.wall.gy1 } : { gx: decor.wall.gx1, gy: mid };
  return getDepth(point) + DECOR_DEPTH_BONUS;
}

function drawDecor(scene: Phaser.Scene, origin: ScreenPoint, decor: WallDecor): void {
  const face = faceFor(decor.wall);
  const graphics = scene.add.graphics({ x: origin.x, y: origin.y }).setDepth(decorDepth(decor, face));
  const height = WALL_HEIGHTS[decor.wall.kind];
  const patch = { u0: toU(decor.wall, face, decor.uStart), u1: toU(decor.wall, face, decor.uEnd), v0: decor.v0, v1: decor.v1 };
  switch (decor.kind) {
    case DecorKind.Window:
      drawWindow(graphics, decor, face, height, patch);
      return;
    case DecorKind.Whiteboard:
      drawFacePatch(graphics, decor.wall, height, face, patch, PALETTE.whiteboard, PALETTE.whiteboardFrame);
      drawWhiteboardMarks(graphics, decor, face, height, patch);
      return;
    case DecorKind.Chart:
      drawFacePatch(graphics, decor.wall, height, face, patch, PALETTE.paper, PALETTE.chartFrame);
      drawChartBars(graphics, decor, face, height, patch);
      return;
    case DecorKind.Poster:
      drawFacePatch(graphics, decor.wall, height, face, patch, PALETTE.stickyOrange, PALETTE.chartFrame);
      drawFacePatch(graphics, decor.wall, height, face, shrink(patch, 0.25), PALETTE.paper);
      return;
    case DecorKind.StickyNotes:
      drawStickyNotes(graphics, decor, face, height);
      return;
  }
}

interface Patch {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

function shrink(patch: Patch, amount: number): Patch {
  const width = patch.u1 - patch.u0;
  const tall = patch.v1 - patch.v0;
  return { u0: patch.u0 + width * amount, u1: patch.u1 - width * amount, v0: patch.v0 + tall * amount, v1: patch.v1 - tall * amount };
}

function drawWindow(graphics: Phaser.GameObjects.Graphics, decor: WallDecor, face: PrismFace, height: number, patch: Patch): void {
  const glowPatch = { u0: patch.u0 - WINDOW_GLOW_PAD / (decor.wall.gx1 - decor.wall.gx0), u1: patch.u1 + WINDOW_GLOW_PAD / (decor.wall.gx1 - decor.wall.gx0), v0: patch.v0 - 0.05, v1: patch.v1 + 0.05 };
  graphics.fillStyle(PALETTE.windowGlassBottom, WINDOW_GLOW_ALPHA).fillPoints(toPoints(facePatchQuad(decor.wall, height, face, glowPatch)), true);
  drawFacePatch(graphics, decor.wall, height, face, patch, PALETTE.windowGlassBottom, PALETTE.windowFrame);
  const glass = shrink(patch, WINDOW_FRAME_INSET);
  const upper = { ...glass, v0: glass.v0 + (glass.v1 - glass.v0) * HALF };
  graphics.fillStyle(PALETTE.windowGlassTop, 1).fillPoints(toPoints(facePatchQuad(decor.wall, height, face, upper)), true);
}

function drawWhiteboardMarks(graphics: Phaser.GameObjects.Graphics, decor: WallDecor, face: PrismFace, height: number, patch: Patch): void {
  const inner = shrink(patch, 0.16);
  const lineCount = 3;
  for (let index = 0; index < lineCount; index += 1) {
    const v = inner.v1 - ((inner.v1 - inner.v0) * (index + 1)) / (lineCount + 1);
    const line = { u0: inner.u0, u1: inner.u1 - (inner.u1 - inner.u0) * 0.2 * index, v0: v, v1: v + 0.03 };
    graphics.fillStyle(WHITEBOARD_LINE_COLOR, 1).fillPoints(toPoints(facePatchQuad(decor.wall, height, face, line)), true);
  }
}

function drawChartBars(graphics: Phaser.GameObjects.Graphics, decor: WallDecor, face: PrismFace, height: number, patch: Patch): void {
  const inner = shrink(patch, 0.2);
  const slot = (inner.u1 - inner.u0) / CHART_BAR_COUNT;
  CHART_BAR_COLORS.forEach((color, index) => {
    const barHeight = (inner.v1 - inner.v0) * (0.35 + 0.65 * ((index + 1) / CHART_BAR_COUNT));
    const bar = { u0: inner.u0 + slot * index + slot * 0.15, u1: inner.u0 + slot * (index + 1) - slot * 0.15, v0: inner.v0, v1: inner.v0 + barHeight };
    graphics.fillStyle(color, 1).fillPoints(toPoints(facePatchQuad(decor.wall, height, face, bar)), true);
  });
}

function drawStickyNotes(graphics: Phaser.GameObjects.Graphics, decor: WallDecor, face: PrismFace, height: number): void {
  const stride = (decor.uEnd - decor.uStart) / STICKY_COLORS.length;
  STICKY_COLORS.forEach((color, index) => {
    const uStart = decor.uStart + stride * index;
    const vOffset = STICKY_V_OFFSETS[index] ?? 0;
    const patch = { u0: toU(decor.wall, face, uStart), u1: toU(decor.wall, face, uStart + STICKY_SIZE), v0: decor.v0 + vOffset, v1: decor.v0 + vOffset + (decor.v1 - decor.v0) * HALF };
    graphics.fillStyle(color, 1).fillPoints(toPoints(facePatchQuad(decor.wall, height, face, patch)), true);
  });
}
