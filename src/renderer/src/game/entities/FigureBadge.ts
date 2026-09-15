import Phaser from 'phaser';

import { FigureState } from '@shared/figures';
import { BADGE_FRAMES, BADGE_PALETTE, WORKING_BADGE_KEYS, badgeKeyFor } from '../art/badges';
import { createPixelTexture } from '../art/pixelArt';

import type { PixelFrame } from '../art/pixelArt';

const WORKING_FRAME_MS = 400;
const CENTER = 0.5;

/** The small status icon above a figure: animated dots while working, tick when done, cross on error. Stays until the next state. */
export class FigureBadge {
  private readonly scene: Phaser.Scene;
  private readonly image: Phaser.GameObjects.Image;
  private frameTimer: Phaser.Time.TimerEvent | null = null;
  private workingFrame = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, depth: number) {
    this.scene = scene;
    BADGE_FRAMES.forEach((frame: PixelFrame): void => createPixelTexture(scene, frame, BADGE_PALETTE));
    this.image = scene.add.image(x, y, BADGE_FRAMES[0]?.key ?? '').setOrigin(CENTER, 1).setDepth(depth).setVisible(false);
  }

  setState(state: FigureState): void {
    this.stopAnimations();
    const key = badgeKeyFor(state);
    if (key === null) {
      this.image.setVisible(false);
      return;
    }
    this.image.setTexture(key).setVisible(true).setAlpha(1);
    if (state === FigureState.Working) this.frameTimer = this.scene.time.addEvent({ delay: WORKING_FRAME_MS, loop: true, callback: this.handleWorkingFrame, callbackScope: this });
  }

  setPosition(x: number, y: number): void {
    this.image.setPosition(x, y);
  }

  destroy(): void {
    this.stopAnimations();
    this.image.destroy();
  }

  private stopAnimations(): void {
    this.frameTimer?.remove();
    this.frameTimer = null;
  }

  private handleWorkingFrame(): void {
    this.workingFrame = (this.workingFrame + 1) % WORKING_BADGE_KEYS.length;
    this.image.setTexture(WORKING_BADGE_KEYS[this.workingFrame] ?? '');
  }
}
