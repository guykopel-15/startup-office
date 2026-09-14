import Phaser from 'phaser';

import { clampCenter, clampZoom, getFitZoom } from './fitCamera';

import type { Bounds } from './fitCamera';

const WHEEL_ZOOM_STEP = 0.0015;
const DRAG_THRESHOLD_PX = 3;

/** Fits the office to the window on resize, with wheel zoom and drag pan that never lose the office. */
export class OfficeCamera {
  private readonly scene: Phaser.Scene;
  private readonly bounds: Bounds;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragCameraX = 0;
  private dragCameraY = 0;

  constructor(scene: Phaser.Scene, bounds: Bounds) {
    this.scene = scene;
    this.bounds = bounds;
    this.fit();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    scene.input.on(Phaser.Input.Events.POINTER_WHEEL, this.handleWheel, this);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
  }

  /** True while the pointer has moved far enough that a release should not count as a click. */
  get hasDraggedFar(): boolean {
    return this.isDragging;
  }

  fit(): void {
    const camera = this.scene.cameras.main;
    const zoom = getFitZoom(this.viewport(), this.bounds);
    camera.setZoom(zoom);
    camera.centerOn((this.bounds.minX + this.bounds.maxX) / 2, (this.bounds.minY + this.bounds.maxY) / 2);
  }

  private viewport(): { width: number; height: number } {
    return { width: this.scene.scale.width, height: this.scene.scale.height };
  }

  private handleResize(): void {
    this.fit();
  }

  private handleWheel(_pointer: Phaser.Input.Pointer, _objects: unknown[], _deltaX: number, deltaY: number): void {
    const camera = this.scene.cameras.main;
    const fitZoom = getFitZoom(this.viewport(), this.bounds);
    camera.setZoom(clampZoom(camera.zoom * (1 - deltaY * WHEEL_ZOOM_STEP), fitZoom));
    this.recenter(camera.midPoint.x, camera.midPoint.y);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.isDragging = false;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
    this.dragCameraX = this.scene.cameras.main.midPoint.x;
    this.dragCameraY = this.scene.cameras.main.midPoint.y;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!pointer.isDown) return;
    const deltaX = pointer.x - this.dragStartX;
    const deltaY = pointer.y - this.dragStartY;
    if (!this.isDragging && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;
    this.isDragging = true;
    const zoom = this.scene.cameras.main.zoom;
    this.recenter(this.dragCameraX - deltaX / zoom, this.dragCameraY - deltaY / zoom);
  }

  private handlePointerUp(): void {
    this.isDragging = false;
  }

  private recenter(x: number, y: number): void {
    const camera = this.scene.cameras.main;
    const center = clampCenter({ x, y }, this.viewport(), camera.zoom, this.bounds);
    camera.centerOn(center.x, center.y);
  }
}
