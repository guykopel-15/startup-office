import Phaser from 'phaser';

import { GAME_FONT_FAMILY, THEME_COLORS } from '@shared/theme';

const FONT_SIZE = '5px';
const RESOLUTION = 4;
const WRAP_WIDTH = 84;
const PADDING_X = 3;
const PADDING_Y = 2;
const SHOW_MS = 6000;
const FADE_MS = 300;
const POP_MS = 120;
const POP_SCALE = 0.85;
const CENTER = 0.5;
const BACKGROUND = THEME_COLORS.text;

/** A MapleStory-style speech bubble: white box above the figure that fades after a few seconds. */
export class FigureBubble {
  private readonly scene: Phaser.Scene;
  private readonly text: Phaser.GameObjects.Text;
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  private tween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, depth: number) {
    this.scene = scene;
    this.text = scene.add
      .text(x, y, '', { fontFamily: GAME_FONT_FAMILY, fontSize: FONT_SIZE, color: THEME_COLORS.background, resolution: RESOLUTION, wordWrap: { width: WRAP_WIDTH }, align: 'center' })
      .setOrigin(CENTER, 1)
      .setPadding(PADDING_X, PADDING_Y, PADDING_X, PADDING_Y)
      .setDepth(depth)
      .setVisible(false);
    this.text.setBackgroundColor(BACKGROUND);
  }

  /** Shows `message`, replacing whatever was there. A sticky bubble stays until the next `say`; otherwise it fades after a few seconds. */
  say(message: string, isSticky: boolean): void {
    this.cancelPending();
    this.text.setText(message).setVisible(true).setAlpha(1).setScale(POP_SCALE);
    this.tween = this.scene.tweens.add({ targets: this.text, scale: 1, duration: POP_MS, ease: Phaser.Math.Easing.Back.Out });
    if (!isSticky) this.hideTimer = this.scene.time.delayedCall(SHOW_MS, this.handleHide, undefined, this);
  }

  /** Starts the fade timer for a bubble that was sticky. */
  release(): void {
    if (!this.text.visible || this.hideTimer !== null) return;
    this.hideTimer = this.scene.time.delayedCall(SHOW_MS, this.handleHide, undefined, this);
  }

  setPosition(x: number, y: number): void {
    this.text.setPosition(x, y);
  }

  destroy(): void {
    this.cancelPending();
    this.text.destroy();
  }

  private handleHide(): void {
    this.tween = this.scene.tweens.add({ targets: this.text, alpha: 0, duration: FADE_MS, onComplete: (): void => void this.text.setVisible(false) });
  }

  private cancelPending(): void {
    this.hideTimer?.remove();
    this.hideTimer = null;
    this.tween?.remove();
    this.tween = null;
  }
}
