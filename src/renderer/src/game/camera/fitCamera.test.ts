import { FIT_PADDING, MAX_ZOOM_FACTOR, clampCenter, clampZoom, getFitZoom, zoomTowardPoint } from './fitCamera';

const bounds = { minX: 0, minY: 0, maxX: 400, maxY: 200 };

describe('getFitZoom', () => {
  it('fits a wide office into a narrow portrait window by width', () => {
    const zoom = getFitZoom({ width: 300, height: 600 }, bounds);
    expect(zoom).toBeCloseTo(300 / (400 + FIT_PADDING * 2));
  });

  it('fits by height when the window is short', () => {
    const zoom = getFitZoom({ width: 2000, height: 224 }, bounds);
    expect(zoom).toBeCloseTo(224 / (200 + FIT_PADDING * 2));
  });
});

describe('clampZoom', () => {
  it('never zooms out past fit or in past the max factor', () => {
    expect(clampZoom(0.1, 0.5)).toBe(0.5);
    expect(clampZoom(10, 0.5)).toBe(0.5 * MAX_ZOOM_FACTOR);
    expect(clampZoom(1, 0.5)).toBe(1);
  });
});

describe('clampCenter', () => {
  it('centers when the view is larger than the office', () => {
    const center = clampCenter({ x: -500, y: -500 }, { width: 1000, height: 1000 }, 1, bounds);
    expect(center).toEqual({ x: 200, y: 100 });
  });

  it('stops the edge of the view at the edge of the office when zoomed in', () => {
    const center = clampCenter({ x: -500, y: 100 }, { width: 200, height: 100 }, 1, bounds);
    expect(center.x).toBe(-FIT_PADDING + 100);
  });
});

describe('zoomTowardPoint', () => {
  it('keeps the anchor fixed when zooming in twice as far', () => {
    const center = zoomTowardPoint({ x: 100, y: 100 }, { x: 150, y: 120 }, 1, 2);
    expect(center).toEqual({ x: 125, y: 110 });
  });

  it('is the identity when the zoom does not change', () => {
    expect(zoomTowardPoint({ x: 10, y: 20 }, { x: 99, y: 99 }, 1.5, 1.5)).toEqual({ x: 10, y: 20 });
  });
});
