export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const FIT_PADDING = 12;
export const MAX_ZOOM_FACTOR = 4;

/** Zoom that fits `bounds` (plus padding) inside `viewport`. Pure. */
export function getFitZoom(viewport: Size, bounds: Bounds): number {
  const width = bounds.maxX - bounds.minX + FIT_PADDING * 2;
  const height = bounds.maxY - bounds.minY + FIT_PADDING * 2;
  return Math.min(viewport.width / width, viewport.height / height);
}

/** Keeps a requested zoom between the fit zoom and a few times closer. */
export function clampZoom(requested: number, fitZoom: number): number {
  return Math.min(Math.max(requested, fitZoom), fitZoom * MAX_ZOOM_FACTOR);
}

/** Keeps the camera center inside the bounds, so panning cannot lose the office. */
export function clampCenter(center: { x: number; y: number }, viewport: Size, zoom: number, bounds: Bounds): { x: number; y: number } {
  const halfWidth = viewport.width / zoom / 2;
  const halfHeight = viewport.height / zoom / 2;
  const clampAxis = (value: number, min: number, max: number, half: number): number => {
    if (max - min <= half * 2) return (min + max) / 2;
    return Math.min(Math.max(value, min + half), max - half);
  };
  return {
    x: clampAxis(center.x, bounds.minX - FIT_PADDING, bounds.maxX + FIT_PADDING, halfWidth),
    y: clampAxis(center.y, bounds.minY - FIT_PADDING, bounds.maxY + FIT_PADDING, halfHeight),
  };
}
