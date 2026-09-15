import Phaser from 'phaser';

import { HALF } from '@shared/theme';
import { DecorKind, getWallDecor } from './decor';
import { FULL_FACE, PrismFace, drawFacePatch, drawPrism, faceLength, fillFacePatch, insetPatch } from './drawPrism';
import { getDepth, getRectCenter } from './isoProjection';
import { PALETTE } from './palette';
import { WALL_HEIGHTS, WallKind, buildWallBoxes, isWallAlongX } from './walls';

import type { WallDecor } from './decor';
import type { FacePatch, PrismColors } from './drawPrism';
import type { GridPoint, ScreenPoint } from './isoProjection';
import type { WallBox } from './walls';

/** Far walls never interleave with anything, near rims sit in front of everything. */
const DEPTH_EXTERIOR = -800;
/** Near rims sit above every world object; UI such as speech bubbles starts above this. */
export const DEPTH_RIM = 10000;
const BASEBOARD_HEIGHT = 0.06;
/** Decor must beat every wall piece it spans, so it takes the far end's depth plus a step. */
const DECOR_DEPTH_STEP = 1;
const WINDOW_GLOW_ALPHA = 0.18;
const WINDOW_GLOW_PADDING_TILES = 0.35;
const WINDOW_GLOW_PADDING_HEIGHT = 0.05;
const WINDOW_FRAME_INSET = 0.08;
const POSTER_INNER_INSET = 0.25;
const WHITEBOARD_INSET = 0.16;
const WHITEBOARD_LINE_COUNT = 3;
const WHITEBOARD_LINE_SHORTEN = 0.2;
const WHITEBOARD_LINE_THICKNESS = 0.03;
const CHART_INSET = 0.2;
const CHART_BAR_MIN_RATIO = 0.35;
const CHART_BAR_GAP = 0.15;
const STICKY_SIZE_TILES = 0.8;
const STICKY_COLORS: readonly number[] = [PALETTE.stickyYellow, PALETTE.stickyTeal, PALETTE.stickyOrange, PALETTE.stickyPurple];
const STICKY_HEIGHT_OFFSETS: readonly number[] = [0, 0.12, -0.06, 0.2];
const CHART_BAR_COLORS: readonly number[] = [PALETTE.screenBlue, PALETTE.ledGreen, PALETTE.lamp, PALETTE.mugRed];
const WHITEBOARD_LINE_COLOR = PALETTE.chairTop;
const BASEBOARD_PATCH: FacePatch = { ...FULL_FACE, heightEnd: BASEBOARD_HEIGHT };

const WALL_COLORS: Readonly<Record<WallKind, PrismColors>> = {
  [WallKind.Exterior]: { top: PALETTE.wallTop, south: PALETTE.wallSouth, east: PALETTE.wallEast },
  [WallKind.Interior]: { top: PALETTE.wallTop, south: PALETTE.wallSouth, east: PALETTE.wallEast },
  [WallKind.Rim]: { top: PALETTE.rimTop, south: PALETTE.rimSouth, east: PALETTE.rimEast },
};

/** Exterior and rim walls share one Graphics each; interior pieces are depth-sorted one by one. Then the decor. */
export function drawWalls(scene: Phaser.Scene, origin: ScreenPoint): void {
  const exterior = scene.add.graphics({ x: origin.x, y: origin.y }).setDepth(DEPTH_EXTERIOR);
  const rims = scene.add.graphics({ x: origin.x, y: origin.y }).setDepth(DEPTH_RIM);
  buildWallBoxes().forEach((wallBox: WallBox): void => {
    if (wallBox.kind === WallKind.Exterior) return drawWallPiece(exterior, wallBox);
    if (wallBox.kind === WallKind.Rim) return drawWallPiece(rims, wallBox);
    drawWallPiece(scene.add.graphics({ x: origin.x, y: origin.y }).setDepth(getDepth(getRectCenter(wallBox))), wallBox);
  });
  getWallDecor().forEach((decor: WallDecor): void => drawDecor(scene, origin, decor));
}

function drawWallPiece(graphics: Phaser.GameObjects.Graphics, wallBox: WallBox): void {
  const height = WALL_HEIGHTS[wallBox.kind];
  drawPrism(graphics, wallBox, height, WALL_COLORS[wallBox.kind], false);
  if (wallBox.kind === WallKind.Rim) return;
  fillFacePatch(graphics, wallBox, height, PrismFace.South, BASEBOARD_PATCH, PALETTE.wallBaseboard);
  fillFacePatch(graphics, wallBox, height, PrismFace.East, BASEBOARD_PATCH, PALETTE.wallBaseboard);
}

/** Decor hangs on the face that looks into the room: south for walls along x, east for walls along y. */
function faceFor(wall: WallBox): PrismFace {
  return isWallAlongX(wall) ? PrismFace.South : PrismFace.East;
}

function toAlong(wall: WallBox, face: PrismFace, planValue: number): number {
  const start = face === PrismFace.South ? wall.gx0 : wall.gy0;
  return (planValue - start) / faceLength(wall, face);
}

function decorFarEnd(decor: WallDecor, face: PrismFace): GridPoint {
  return face === PrismFace.South ? { gx: decor.alongEnd, gy: decor.wall.gy1 } : { gx: decor.wall.gx1, gy: decor.alongEnd };
}

/** Depth that beats every one-tile wall piece under the decor. */
export function decorDepth(decor: WallDecor): number {
  if (decor.wall.kind === WallKind.Exterior) return DEPTH_EXTERIOR + DECOR_DEPTH_STEP;
  return getDepth(decorFarEnd(decor, faceFor(decor.wall))) + DECOR_DEPTH_STEP;
}

function toPatch(decor: WallDecor, face: PrismFace): FacePatch {
  return { alongStart: toAlong(decor.wall, face, decor.alongStart), alongEnd: toAlong(decor.wall, face, decor.alongEnd), heightStart: decor.heightStart, heightEnd: decor.heightEnd };
}

function drawDecor(scene: Phaser.Scene, origin: ScreenPoint, decor: WallDecor): void {
  const face = faceFor(decor.wall);
  const graphics = scene.add.graphics({ x: origin.x, y: origin.y }).setDepth(decorDepth(decor));
  const height = WALL_HEIGHTS[decor.wall.kind];
  const patch = toPatch(decor, face);
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
      fillFacePatch(graphics, decor.wall, height, face, insetPatch(patch, POSTER_INNER_INSET), PALETTE.paper);
      return;
    case DecorKind.StickyNotes:
      drawStickyNotes(graphics, decor, face, height);
      return;
  }
}

function drawWindow(graphics: Phaser.GameObjects.Graphics, decor: WallDecor, face: PrismFace, height: number, patch: FacePatch): void {
  const glowPadding = WINDOW_GLOW_PADDING_TILES / faceLength(decor.wall, face);
  const glow: FacePatch = { alongStart: patch.alongStart - glowPadding, alongEnd: patch.alongEnd + glowPadding, heightStart: patch.heightStart - WINDOW_GLOW_PADDING_HEIGHT, heightEnd: patch.heightEnd + WINDOW_GLOW_PADDING_HEIGHT };
  fillFacePatch(graphics, decor.wall, height, face, glow, PALETTE.windowGlassBottom, WINDOW_GLOW_ALPHA);
  drawFacePatch(graphics, decor.wall, height, face, patch, PALETTE.windowGlassBottom, PALETTE.windowFrame);
  const glass = insetPatch(patch, WINDOW_FRAME_INSET);
  const upperHalf: FacePatch = { ...glass, heightStart: glass.heightStart + (glass.heightEnd - glass.heightStart) * HALF };
  fillFacePatch(graphics, decor.wall, height, face, upperHalf, PALETTE.windowGlassTop);
}

function drawWhiteboardMarks(graphics: Phaser.GameObjects.Graphics, decor: WallDecor, face: PrismFace, height: number, patch: FacePatch): void {
  const inner = insetPatch(patch, WHITEBOARD_INSET);
  for (let index = 0; index < WHITEBOARD_LINE_COUNT; index += 1) {
    const lineHeight = inner.heightEnd - ((inner.heightEnd - inner.heightStart) * (index + 1)) / (WHITEBOARD_LINE_COUNT + 1);
    const line: FacePatch = { alongStart: inner.alongStart, alongEnd: inner.alongEnd - (inner.alongEnd - inner.alongStart) * WHITEBOARD_LINE_SHORTEN * index, heightStart: lineHeight, heightEnd: lineHeight + WHITEBOARD_LINE_THICKNESS };
    fillFacePatch(graphics, decor.wall, height, face, line, WHITEBOARD_LINE_COLOR);
  }
}

function drawChartBars(graphics: Phaser.GameObjects.Graphics, decor: WallDecor, face: PrismFace, height: number, patch: FacePatch): void {
  const inner = insetPatch(patch, CHART_INSET);
  const slot = (inner.alongEnd - inner.alongStart) / CHART_BAR_COLORS.length;
  CHART_BAR_COLORS.forEach((color: number, index: number): void => {
    const barRatio = CHART_BAR_MIN_RATIO + (1 - CHART_BAR_MIN_RATIO) * ((index + 1) / CHART_BAR_COLORS.length);
    const bar: FacePatch = {
      alongStart: inner.alongStart + slot * (index + CHART_BAR_GAP),
      alongEnd: inner.alongStart + slot * (index + 1 - CHART_BAR_GAP),
      heightStart: inner.heightStart,
      heightEnd: inner.heightStart + (inner.heightEnd - inner.heightStart) * barRatio,
    };
    fillFacePatch(graphics, decor.wall, height, face, bar, color);
  });
}

function drawStickyNotes(graphics: Phaser.GameObjects.Graphics, decor: WallDecor, face: PrismFace, height: number): void {
  const stride = (decor.alongEnd - decor.alongStart) / STICKY_COLORS.length;
  const noteHeight = (decor.heightEnd - decor.heightStart) * HALF;
  STICKY_COLORS.forEach((color: number, index: number): void => {
    const start = decor.alongStart + stride * index;
    const offset = STICKY_HEIGHT_OFFSETS[index] ?? 0;
    const note: FacePatch = { alongStart: toAlong(decor.wall, face, start), alongEnd: toAlong(decor.wall, face, start + STICKY_SIZE_TILES), heightStart: decor.heightStart + offset, heightEnd: decor.heightStart + offset + noteHeight };
    fillFacePatch(graphics, decor.wall, height, face, note, color);
  });
}
