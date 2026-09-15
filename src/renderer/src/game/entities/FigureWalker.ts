import Phaser from 'phaser';

import { WALK_FRAME_COUNT, buildFigurePalette, composeWalkRows } from '../art/composeFigure';
import { createPixelTexture, frameTextureKeys } from '../art/pixelArt';
import { projectToScreen } from '../world/isoProjection';

import type { FigureLook } from '@shared/figures';
import type { GridPoint, ScreenPoint } from '../world/isoProjection';

/** Tiles per second. */
const WALK_SPEED = 4.5;
const WALK_FRAME_MS = 140;
const WALK_KEY_SUFFIX = '-walk-';
const MS_PER_SECOND = 1000;
const MIN_SEGMENT_MS = 1;

export interface WalkTarget {
  /** Called on every step with the current feet point, so the owner can move its display objects. */
  onStep: (feet: GridPoint) => void;
  onArrive: () => void;
}

/** Moves a figure's feet along a path of grid points, cycling the walk frames and facing the way it goes. */
export class FigureWalker {
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly keys: readonly string[];
  private readonly idleKey: string;
  private tween: Phaser.Tweens.Tween | null = null;
  private frameTimer: Phaser.Time.TimerEvent | null = null;
  private frame = 0;
  private feet: GridPoint;

  constructor(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, idleKey: string, look: FigureLook, feet: GridPoint) {
    this.scene = scene;
    this.sprite = sprite;
    this.idleKey = idleKey;
    this.feet = feet;
    this.keys = frameTextureKeys(idleKey, WALK_KEY_SUFFIX, WALK_FRAME_COUNT);
    const palette = buildFigurePalette(look);
    this.keys.forEach((key: string, index: number): void => createPixelTexture(scene, { key, rows: composeWalkRows(look, index) }, palette));
  }

  get isWalking(): boolean {
    return this.tween !== null;
  }

  get position(): GridPoint {
    return this.feet;
  }

  /** Walks through `path` point by point; a walk in progress is dropped first. */
  walk(path: readonly GridPoint[], target: WalkTarget): void {
    this.stop();
    if (path.length === 0) {
      target.onArrive();
      return;
    }
    this.frameTimer = this.scene.time.addEvent({ delay: WALK_FRAME_MS, loop: true, callback: this.handleFrame, callbackScope: this });
    this.walkSegment(path, 0, target);
  }

  /** Stops mid-stride and puts the resting pose back. */
  stop(): void {
    this.halt();
    this.sprite.setTexture(this.idleKey);
  }

  /** Drops the tween, timer and textures. Safe after the sprite itself was destroyed: it never touches it. */
  destroy(): void {
    this.halt();
    this.keys.forEach((key: string): void => void this.scene.textures.remove(key));
  }

  private halt(): void {
    this.tween?.remove();
    this.tween = null;
    this.frameTimer?.remove();
    this.frameTimer = null;
  }

  private walkSegment(path: readonly GridPoint[], index: number, target: WalkTarget): void {
    const to = path[index];
    if (to === undefined) {
      this.stop();
      target.onArrive();
      return;
    }
    const from = this.feet;
    this.face(projectToScreen(from), projectToScreen(to));
    const distance = Math.hypot(to.gx - from.gx, to.gy - from.gy);
    this.tween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: Math.max(MIN_SEGMENT_MS, (distance / WALK_SPEED) * MS_PER_SECOND),
      onUpdate: (tween: Phaser.Tweens.Tween): void => {
        const progress = tween.getValue() ?? 0;
        this.feet = { gx: from.gx + (to.gx - from.gx) * progress, gy: from.gy + (to.gy - from.gy) * progress };
        target.onStep(this.feet);
      },
      onComplete: (): void => this.walkSegment(path, index + 1, target),
    });
  }

  /** Figures face left or right on screen; the art faces right by default. */
  private face(from: ScreenPoint, to: ScreenPoint): void {
    if (to.x !== from.x) this.sprite.setFlipX(to.x < from.x);
  }

  private handleFrame(): void {
    this.frame = (this.frame + 1) % WALK_FRAME_COUNT;
    this.sprite.setTexture(this.keys[this.frame] ?? this.idleKey);
  }
}
