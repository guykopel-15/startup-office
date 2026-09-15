import Phaser from 'phaser';

import { FigureState } from '@shared/figures';
import { BADGE_FRAMES, BADGE_PALETTE, BadgeKey, WORKING_BADGE_KEYS, badgeKeyFor } from '../art/badges';
import { createPixelTexture } from '../art/pixelArt';
import { BOTTOM_CENTER_X, BOTTOM_CENTER_Y } from './anchors';

import type { PixelFrame } from '../art/pixelArt';

const WORKING_FRAME_MS = 400;

/** The small status icon above a figure: animated dots while working, tick when done, cross on error. Stays until the next state. */
export class FigureBadge {
  private readonly scene: Phaser.Scene;
  private readonly image: Phaser.GameObjects.Image;
  private frameTimer: Phaser.Time.TimerEvent | null = null;
  private workingFrame = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, depth: number) {
    this.scene = scene;
    BADGE_FRAMES.forEach((frame: PixelFrame): void => createPixelTexture(scene, frame, BADGE_PALETTE));
    this.image = scene.add.image(x, y, BadgeKey.Done).setOrigin(BOTTOM_CENTER_X, BOTTOM_CENTER_Y).setDepth(depth).setVisible(false);
  }

  /** The image, so the owner can bob it together with the figure. */
  get displayObject(): Phaser.GameObjects.Image {
    return this.image;
  }

  get isVisible(): boolean {
    return this.image.visible;
  }

  get height(): number {
    return this.image.height;
  }

  setState(state: FigureState): void {
    this.stopAnimation();
    const key = badgeKeyFor(state);
    if (key === null) {
      this.image.setVisible(false);
      return;
    }
    this.image.setTexture(key).setVisible(true);
    if (state === FigureState.Working) this.frameTimer = this.scene.time.addEvent({ delay: WORKING_FRAME_MS, loop: true, callback: this.handleWorkingFrame, callbackScope: this });
  }

  destroy(): void {
    this.stopAnimation();
    this.image.destroy();
  }

  private stopAnimation(): void {
    this.frameTimer?.remove();
    this.frameTimer = null;
  }

  private handleWorkingFrame(): void {
    this.workingFrame = (this.workingFrame + 1) % WORKING_BADGE_KEYS.length;
    this.image.setTexture(WORKING_BADGE_KEYS[this.workingFrame] ?? BadgeKey.WorkingOne);
  }
}
