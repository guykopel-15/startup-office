import Phaser from 'phaser';

import { TYPING_FRAME_COUNT, buildFigurePalette, composeTypingRows } from '../art/composeFigure';
import { createPixelTexture } from '../art/pixelArt';

import type { FigureLook } from '@shared/figures';

const TYPING_FRAME_MS = 160;
const TYPING_KEY_SUFFIX = '-typing-';

/** Cycles a figure's sprite through its typing frames while a run is in progress. */
export class FigureTyping {
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly keys: readonly string[];
  private readonly idleKey: string;
  private timer: Phaser.Time.TimerEvent | null = null;
  private frame = 0;

  constructor(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, idleKey: string, look: FigureLook) {
    this.scene = scene;
    this.sprite = sprite;
    this.idleKey = idleKey;
    this.keys = Array.from({ length: TYPING_FRAME_COUNT }, (_: unknown, index: number): string => `${idleKey}${TYPING_KEY_SUFFIX}${index}`);
    const palette = buildFigurePalette(look);
    this.keys.forEach((key: string, index: number): void => createPixelTexture(scene, { key, rows: composeTypingRows(look, index) }, palette));
  }

  get isActive(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.isActive) return;
    this.timer = this.scene.time.addEvent({ delay: TYPING_FRAME_MS, loop: true, callback: this.handleFrame, callbackScope: this });
    this.handleFrame();
  }

  /** Stops cycling and puts the resting pose back. */
  stop(): void {
    if (!this.isActive) return;
    this.timer?.remove();
    this.timer = null;
    this.sprite.setTexture(this.idleKey);
  }

  destroy(): void {
    this.timer?.remove();
    this.timer = null;
    this.keys.forEach((key: string): void => void this.scene.textures.remove(key));
  }

  private handleFrame(): void {
    this.frame = (this.frame + 1) % TYPING_FRAME_COUNT;
    this.sprite.setTexture(this.keys[this.frame] ?? this.idleKey);
  }
}
