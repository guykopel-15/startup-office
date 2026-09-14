import Phaser from 'phaser';

import { projectToScreen } from './isoProjection';

import type { GridRect } from './floorPlan';
import type { ScreenPoint } from './isoProjection';

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

/** A sub-rectangle on a vertical face: u runs along the face, v runs up. Both 0..1. */
export interface FacePatch {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

const OUTLINE_ALPHA = 0.55;
const OUTLINE_COLOR = 0x1a2236;

export function toPoints(points: readonly ScreenPoint[]): Phaser.Geom.Point[] {
  return points.map((point) => new Phaser.Geom.Point(point.x, point.y));
}

function raise(point: ScreenPoint, height: number): ScreenPoint {
  return { x: point.x, y: point.y - height };
}

export function rectCorners(rect: GridRect): [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint] {
  return [
    projectToScreen({ gx: rect.gx0, gy: rect.gy0 }),
    projectToScreen({ gx: rect.gx1, gy: rect.gy0 }),
    projectToScreen({ gx: rect.gx1, gy: rect.gy1 }),
    projectToScreen({ gx: rect.gx0, gy: rect.gy1 }),
  ];
}

/** Draws a box: south and east faces, then the top, with a soft outline on the top. */
export function drawPrism(graphics: Phaser.GameObjects.Graphics, rect: GridRect, height: number, colors: PrismColors, hasOutline = true): void {
  const [top, right, bottom, left] = rectCorners(rect);
  const lift = (point: ScreenPoint): ScreenPoint => raise(point, height);
  graphics.fillStyle(colors.south, 1).fillPoints(toPoints([left, bottom, lift(bottom), lift(left)]), true);
  graphics.fillStyle(colors.east, 1).fillPoints(toPoints([bottom, right, lift(right), lift(bottom)]), true);
  graphics.fillStyle(colors.top, 1).fillPoints(toPoints([lift(top), lift(right), lift(bottom), lift(left)]), true);
  if (!hasOutline) return;
  graphics.lineStyle(1, OUTLINE_COLOR, OUTLINE_ALPHA);
  graphics.strokePoints(toPoints([lift(top), lift(right), lift(bottom), lift(left)]), true);
  graphics.lineBetween(lift(left).x, lift(left).y, left.x, left.y);
  graphics.lineBetween(lift(bottom).x, lift(bottom).y, bottom.x, bottom.y);
  graphics.lineBetween(lift(right).x, lift(right).y, right.x, right.y);
}

/** Screen quad of a patch on one vertical face of a box, listed base-left, base-right, top-right, top-left. */
export function facePatchQuad(rect: GridRect, height: number, face: PrismFace, patch: FacePatch): [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint] {
  const along = (u: number): ScreenPoint =>
    face === PrismFace.South
      ? projectToScreen({ gx: rect.gx0 + u * (rect.gx1 - rect.gx0), gy: rect.gy1 })
      : projectToScreen({ gx: rect.gx1, gy: rect.gy0 + u * (rect.gy1 - rect.gy0) });
  const baseLeft = raise(along(patch.u0), height * patch.v0);
  const baseRight = raise(along(patch.u1), height * patch.v0);
  const topRight = raise(along(patch.u1), height * patch.v1);
  const topLeft = raise(along(patch.u0), height * patch.v1);
  return [baseLeft, baseRight, topRight, topLeft];
}

/** Fills a patch on a face, optionally with a frame drawn as an inset border. */
export function drawFacePatch(graphics: Phaser.GameObjects.Graphics, rect: GridRect, height: number, face: PrismFace, patch: FacePatch, color: number, frameColor?: number): void {
  const quad = facePatchQuad(rect, height, face, patch);
  if (frameColor !== undefined) graphics.fillStyle(frameColor, 1).fillPoints(toPoints(quad), true);
  const inset = frameColor === undefined ? patch : insetPatch(patch, 0.08);
  graphics.fillStyle(color, 1).fillPoints(toPoints(facePatchQuad(rect, height, face, inset)), true);
}

function insetPatch(patch: FacePatch, amount: number): FacePatch {
  const width = patch.u1 - patch.u0;
  const tall = patch.v1 - patch.v0;
  return { u0: patch.u0 + width * amount, u1: patch.u1 - width * amount, v0: patch.v0 + tall * amount, v1: patch.v1 - tall * amount };
}
