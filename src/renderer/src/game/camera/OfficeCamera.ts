import Phaser from 'phaser';

import { clampCenter, clampZoom, getFitZoom, zoomTowardPoint } from './fitCamera';

import type { ScreenBounds, ScreenPoint, Size } from '../world/isoProjection';

const WHEEL_ZOOM_STEP = 0.0015;
/** Below this pointer travel a press still counts as a click, not a drag. */
export const DRAG_THRESHOLD_PIXELS = 3;
const ZOOM_TOLERANCE = 0.0001;

/** Fits the office to the window, with wheel zoom toward the pointer and left-drag pan that never lose the office. */
export class OfficeCamera {
  private readonly scene: Phaser.Scene;
  private readonly bounds: ScreenBounds;
  private dragStart: ScreenPoint = { x: 0, y: 0 };
  private dragCenter: ScreenPoint = { x: 0, y: 0 };
  /** The zoom of the last fit, so a resize can tell "still at fit" apart from "user zoomed". */
  private fitZoom = 0;

  constructor(scene: Phaser.Scene, bounds: ScreenBounds) {
    this.scene = scene;
    this.bounds = bounds;
    this.fit();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    scene.input.on(Phaser.Input.Events.POINTER_WHEEL, this.handleWheel, this);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
  }

  /** Removes every listener; the scene calls this on shutdown. */
  destroy(): void {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_WHEEL, this.handleWheel, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
  }

  fit(): void {
    const camera = this.scene.cameras.main;
    this.fitZoom = getFitZoom(this.viewport(), this.bounds);
    camera.setZoom(this.fitZoom);
    camera.centerOn((this.bounds.minX + this.bounds.maxX) / 2, (this.bounds.minY + this.bounds.maxY) / 2);
  }

  private viewport(): Size {
    return { width: this.scene.scale.width, height: this.scene.scale.height };
  }

  /** Compared against the fit of the previous viewport: the new one differs by definition after a resize. */
  private isAtFitZoom(): boolean {
    return Math.abs(this.scene.cameras.main.zoom - this.fitZoom) < ZOOM_TOLERANCE;
  }

  /** Refit when the user had not zoomed; otherwise keep their view and only re-clamp it. */
  private handleResize(): void {
    const camera = this.scene.cameras.main;
    const wasAtFit = this.isAtFitZoom();
    const fitZoom = getFitZoom(this.viewport(), this.bounds);
    if (wasAtFit) return this.fit();
    camera.setZoom(clampZoom(camera.zoom, fitZoom));
    this.recenter({ x: camera.midPoint.x, y: camera.midPoint.y });
  }

  private handleWheel(pointer: Phaser.Input.Pointer, _objects: unknown[], _deltaX: number, deltaY: number): void {
    const camera = this.scene.cameras.main;
    const zoomBefore = camera.zoom;
    const zoomAfter = clampZoom(zoomBefore * (1 - deltaY * WHEEL_ZOOM_STEP), getFitZoom(this.viewport(), this.bounds));
    const anchor: ScreenPoint = { x: pointer.worldX, y: pointer.worldY };
    camera.setZoom(zoomAfter);
    this.recenter(zoomTowardPoint({ x: camera.midPoint.x, y: camera.midPoint.y }, anchor, zoomBefore, zoomAfter));
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!pointer.leftButtonDown()) return;
    this.dragStart = { x: pointer.x, y: pointer.y };
    this.dragCenter = { x: this.scene.cameras.main.midPoint.x, y: this.scene.cameras.main.midPoint.y };
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!pointer.leftButtonDown()) return;
    const deltaX = pointer.x - this.dragStart.x;
    const deltaY = pointer.y - this.dragStart.y;
    if (Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PIXELS) return;
    const zoom = this.scene.cameras.main.zoom;
    this.recenter({ x: this.dragCenter.x - deltaX / zoom, y: this.dragCenter.y - deltaY / zoom });
  }

  private recenter(target: ScreenPoint): void {
    const camera = this.scene.cameras.main;
    const center = clampCenter(target, this.viewport(), camera.zoom, this.bounds);
    camera.centerOn(center.x, center.y);
  }
}
