import Phaser from 'phaser';

import { projectToScreen, raise } from './isoProjection';

import type { GridRect, ScreenPoint } from './isoProjection';

export interface PrismColors {
  top: number;
  south: number;
  east: number;
}

export enum PrismFace {
  /** Lower-left face on screen: the edge at gy1, running along gx. */
  South = 'south',
  /** Lower-right face on screen: the edge at gx1, running along gy. */
  East = 'east',
}

/** A sub-rectangle on a vertical face. `along*` run along the face, `height*` run up. All 0..1. */
export interface FacePatch {
  alongStart: number;
  alongEnd: number;
  heightStart: number;
  heightEnd: number;
}

export type ScreenQuad = [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];

const OUTLINE_ALPHA = 0.55;
const OUTLINE_COLOR = 0x1a2236;
const FRAME_INSET = 0.08;
const FULL_ALPHA = 1;
export const FULL_FACE: FacePatch = { alongStart: 0, alongEnd: 1, heightStart: 0, heightEnd: 1 };

export function toPoints(points: readonly ScreenPoint[]): Phaser.Geom.Point[] {
  return points.map((point: ScreenPoint): Phaser.Geom.Point => new Phaser.Geom.Point(point.x, point.y));
}

export function rectCorners(rect: GridRect): ScreenQuad {
  return [
    projectToScreen({ gx: rect.gx0, gy: rect.gy0 }),
    projectToScreen({ gx: rect.gx1, gy: rect.gy0 }),
    projectToScreen({ gx: rect.gx1, gy: rect.gy1 }),
    projectToScreen({ gx: rect.gx0, gy: rect.gy1 }),
  ];
}

export function fillQuad(graphics: Phaser.GameObjects.Graphics, quad: readonly ScreenPoint[], color: number, alpha = FULL_ALPHA): void {
  graphics.fillStyle(color, alpha).fillPoints(toPoints(quad), true);
}

/** The top face of a box, lifted by `height`. */
export function topQuad(rect: GridRect, height: number): ScreenQuad {
  const [top, right, bottom, left] = rectCorners(rect);
  return [raise(top, height), raise(right, height), raise(bottom, height), raise(left, height)];
}

/** Draws a box: south and east faces, then the top, with a soft outline on the top. */
export function drawPrism(graphics: Phaser.GameObjects.Graphics, rect: GridRect, height: number, colors: PrismColors, hasOutline = true): void {
  const [top, right, bottom, left] = rectCorners(rect);
  fillQuad(graphics, [left, bottom, raise(bottom, height), raise(left, height)], colors.south);
  fillQuad(graphics, [bottom, right, raise(right, height), raise(bottom, height)], colors.east);
  fillQuad(graphics, topQuad(rect, height), colors.top);
  if (!hasOutline) return;
  graphics.lineStyle(1, OUTLINE_COLOR, OUTLINE_ALPHA);
  graphics.strokePoints(toPoints(topQuad(rect, height)), true);
  [left, bottom, right].forEach((corner: ScreenPoint): void => {
    graphics.lineBetween(raise(corner, height).x, raise(corner, height).y, corner.x, corner.y);
  });
  void top;
}

/** Length in tiles of a face along its running axis. */
export function faceLength(rect: GridRect, face: PrismFace): number {
  return face === PrismFace.South ? rect.gx1 - rect.gx0 : rect.gy1 - rect.gy0;
}

function alongFace(rect: GridRect, face: PrismFace, along: number): ScreenPoint {
  return face === PrismFace.South
    ? projectToScreen({ gx: rect.gx0 + along * (rect.gx1 - rect.gx0), gy: rect.gy1 })
    : projectToScreen({ gx: rect.gx1, gy: rect.gy0 + along * (rect.gy1 - rect.gy0) });
}

/** Screen quad of a patch on one vertical face of a box, listed base-left, base-right, top-right, top-left. */
export function facePatchQuad(rect: GridRect, height: number, face: PrismFace, patch: FacePatch): ScreenQuad {
  return [
    raise(alongFace(rect, face, patch.alongStart), height * patch.heightStart),
    raise(alongFace(rect, face, patch.alongEnd), height * patch.heightStart),
    raise(alongFace(rect, face, patch.alongEnd), height * patch.heightEnd),
    raise(alongFace(rect, face, patch.alongStart), height * patch.heightEnd),
  ];
}

export function fillFacePatch(graphics: Phaser.GameObjects.Graphics, rect: GridRect, height: number, face: PrismFace, patch: FacePatch, color: number, alpha = FULL_ALPHA): void {
  fillQuad(graphics, facePatchQuad(rect, height, face, patch), color, alpha);
}

/** Fills a patch on a face, optionally with a frame drawn as an inset border. */
export function drawFacePatch(graphics: Phaser.GameObjects.Graphics, rect: GridRect, height: number, face: PrismFace, patch: FacePatch, color: number, frameColor?: number): void {
  if (frameColor !== undefined) fillFacePatch(graphics, rect, height, face, patch, frameColor);
  const inner = frameColor === undefined ? patch : insetPatch(patch, FRAME_INSET);
  fillFacePatch(graphics, rect, height, face, inner, color);
}

/** Shrinks a patch toward its center by a fraction of its size. */
export function insetPatch(patch: FacePatch, amount: number): FacePatch {
  const width = patch.alongEnd - patch.alongStart;
  const height = patch.heightEnd - patch.heightStart;
  return {
    alongStart: patch.alongStart + width * amount,
    alongEnd: patch.alongEnd - width * amount,
    heightStart: patch.heightStart + height * amount,
    heightEnd: patch.heightEnd - height * amount,
  };
}
