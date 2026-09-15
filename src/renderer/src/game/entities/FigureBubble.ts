import Phaser from 'phaser';

import { GAME_FONT_FAMILY, GAME_TEXT_RESOLUTION, THEME_COLORS } from '@shared/theme';
import { BOTTOM_CENTER_X, BOTTOM_CENTER_Y } from './anchors';

const FONT_SIZE = '5px';
const WRAP_WIDTH = 84;
const PADDING_X = 3;
const PADDING_Y = 2;
const SHOW_MS = 6000;
const FADE_MS = 300;
const POP_MS = 120;
const POP_SCALE = 0.85;
const FULL_SCALE = 1;
const OPAQUE = 1;
const BACKGROUND = THEME_COLORS.text;

/** A MapleStory-style speech bubble: white box above the figure. Sticky bubbles stay until replaced; others fade after a few seconds. */
export class FigureBubble {
  private readonly scene: Phaser.Scene;
  private readonly text: Phaser.GameObjects.Text;
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  private tween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, depth: number) {
    this.scene = scene;
    this.text = scene.add
      .text(x, y, '', { fontFamily: GAME_FONT_FAMILY, fontSize: FONT_SIZE, color: THEME_COLORS.background, resolution: GAME_TEXT_RESOLUTION, wordWrap: { width: WRAP_WIDTH, useAdvancedWrap: true }, align: 'center' })
      .setOrigin(BOTTOM_CENTER_X, BOTTOM_CENTER_Y)
      .setPadding(PADDING_X, PADDING_Y, PADDING_X, PADDING_Y)
      .setDepth(depth)
      .setVisible(false);
    this.text.setBackgroundColor(BACKGROUND);
  }

  /** The text object, so the owner can bob and reposition it. */
  get displayObject(): Phaser.GameObjects.Text {
    return this.text;
  }

  /** Shows `message`, replacing whatever was there. A sticky bubble stays until the next `say`; otherwise it fades after a few seconds. */
  say(message: string, isSticky: boolean): void {
    this.cancelPending();
    this.text.setText(message).setVisible(true).setAlpha(OPAQUE).setScale(POP_SCALE);
    this.tween = this.scene.tweens.add({ targets: this.text, scale: FULL_SCALE, duration: POP_MS, ease: Phaser.Math.Easing.Back.Out });
    if (!isSticky) this.scheduleHide();
  }

  /** Starts the fade timer for a bubble that was sticky. */
  release(): void {
    if (!this.text.visible || this.hideTimer !== null) return;
    this.scheduleHide();
  }

  hide(): void {
    this.cancelPending();
    this.text.setVisible(false);
  }

  destroy(): void {
    this.cancelPending();
    this.text.destroy();
  }

  private scheduleHide(): void {
    this.hideTimer = this.scene.time.delayedCall(SHOW_MS, this.handleHide, undefined, this);
  }

  private handleHide(): void {
    this.hideTimer = null;
    this.tween = this.scene.tweens.add({ targets: this.text, alpha: 0, duration: FADE_MS, onComplete: (): void => void this.text.setVisible(false) });
  }

  private cancelPending(): void {
    this.hideTimer?.remove();
    this.hideTimer = null;
    this.tween?.remove();
    this.tween = null;
  }
}
