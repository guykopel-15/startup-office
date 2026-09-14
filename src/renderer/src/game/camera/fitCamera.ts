import { HALF } from '@shared/theme';

import type { ScreenBounds, ScreenPoint, Size } from '../world/isoProjection';

export const FIT_PADDING = 12;
export const MAX_ZOOM_FACTOR = 4;

/** Zoom that fits `bounds` (plus padding) inside `viewport`. Pure. */
export function getFitZoom(viewport: Size, bounds: ScreenBounds): number {
  const width = bounds.maxX - bounds.minX + FIT_PADDING * 2;
  const height = bounds.maxY - bounds.minY + FIT_PADDING * 2;
  return Math.min(viewport.width / width, viewport.height / height);
}

/** Keeps a requested zoom between the fit zoom and a few times closer. */
export function clampZoom(requested: number, fitZoom: number): number {
  return Math.min(Math.max(requested, fitZoom), fitZoom * MAX_ZOOM_FACTOR);
}

function clampAxis(value: number, min: number, max: number, halfView: number): number {
  if (max - min <= halfView * 2) return (min + max) * HALF;
  return Math.min(Math.max(value, min + halfView), max - halfView);
}

/** Keeps the camera center inside the bounds, so panning cannot lose the office. */
export function clampCenter(center: ScreenPoint, viewport: Size, zoom: number, bounds: ScreenBounds): ScreenPoint {
  const halfWidth = viewport.width / zoom * HALF;
  const halfHeight = viewport.height / zoom * HALF;
  return {
    x: clampAxis(center.x, bounds.minX - FIT_PADDING, bounds.maxX + FIT_PADDING, halfWidth),
    y: clampAxis(center.y, bounds.minY - FIT_PADDING, bounds.maxY + FIT_PADDING, halfHeight),
  };
}

/** New camera center so that the world point under the pointer stays under it after a zoom change. */
export function zoomTowardPoint(center: ScreenPoint, anchor: ScreenPoint, zoomBefore: number, zoomAfter: number): ScreenPoint {
  const ratio = zoomBefore / zoomAfter;
  return { x: anchor.x - (anchor.x - center.x) * ratio, y: anchor.y - (anchor.y - center.y) * ratio };
}
