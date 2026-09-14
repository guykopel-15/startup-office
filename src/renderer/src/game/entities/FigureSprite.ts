import Phaser from 'phaser';

import { GAME_FONT_FAMILY, THEME_COLORS } from '@shared/theme';
import { buildFigurePalette, composeBlinkRows, composeFigureRows } from '../art/composeFigure';
import { createPixelTexture } from '../art/pixelArt';
import { DRAG_THRESHOLD_PIXELS } from '../camera/OfficeCamera';
import { GameEvent, gameEvents } from '../events';
import { getDepth } from '../world/isoProjection';

import type { Figure } from '@shared/figures';
import type { FigureClickedPayload } from '../events';
import type { GridPoint, ScreenPoint } from '../world/isoProjection';

const BOTTOM_CENTER_X = 0.5;
const BOTTOM_CENTER_Y = 1;
const BOB_DISTANCE = 1;
const BOB_DURATION_MS = 900;
const BOB_MAX_START_DELAY_MS = 800;
const TWEEN_REPEAT_FOREVER = -1;
const BLINK_MIN_INTERVAL_MS = 2500;
const BLINK_MAX_INTERVAL_MS = 6000;
const BLINK_DURATION_MS = 120;
const HOVER_SCALE = 1.08;
const TEXTURE_KEY_PREFIX = 'figure-';
const BLINK_KEY_SUFFIX = '-blink';
const TAG_FONT_SIZE = '5px';
const TAG_RESOLUTION = 4;
const TAG_BACKGROUND = 'rgba(14, 10, 26, 0.8)';
const TAG_PADDING_X = 2;
const TAG_PADDING_Y = 1;
const TAG_GAP = 3;
const TAG_DEPTH_BONUS = 0.5;
const TAG_SEPARATOR = ' · ';

/** A seated figure: sprite, name tag, idle bob, blink, hover, click. Call `destroy()` to remove it. */
export class FigureSprite {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly tag: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;
  private readonly figure: Figure;
  private readonly idleKey: string;
  private readonly blinkKey: string;
  private bobTween: Phaser.Tweens.Tween | null = null;
  private blinkTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, figure: Figure, origin: ScreenPoint, feet: GridPoint, feetScreen: ScreenPoint) {
    this.scene = scene;
    this.figure = figure;
    this.idleKey = `${TEXTURE_KEY_PREFIX}${figure.id}`;
    this.blinkKey = `${this.idleKey}${BLINK_KEY_SUFFIX}`;
    this.ensureTextures();
    const x = origin.x + feetScreen.x;
    const y = origin.y + feetScreen.y;
    this.sprite = scene.add.sprite(x, y, this.idleKey).setOrigin(BOTTOM_CENTER_X, BOTTOM_CENTER_Y).setDepth(getDepth(feet));
    this.tag = this.createTag(x, y - this.sprite.height - TAG_GAP, getDepth(feet) + TAG_DEPTH_BONUS);
    this.startIdle();
    this.wireInput();
  }

  /** Stops the tween and blink chain and removes both display objects. */
  destroy(): void {
    this.bobTween?.remove();
    this.bobTween = null;
    this.blinkTimer?.remove();
    this.blinkTimer = null;
    this.sprite.removeAllListeners();
    this.sprite.destroy();
    this.tag.destroy();
  }

  private ensureTextures(): void {
    const palette = buildFigurePalette(this.figure.look);
    createPixelTexture(this.scene, { key: this.idleKey, rows: composeFigureRows(this.figure.look) }, palette);
    createPixelTexture(this.scene, { key: this.blinkKey, rows: composeBlinkRows(this.figure.look) }, palette);
  }

  private createTag(x: number, y: number, depth: number): Phaser.GameObjects.Text {
    const text = this.scene.add
      .text(x, y, this.figure.name, { fontFamily: GAME_FONT_FAMILY, fontSize: TAG_FONT_SIZE, color: THEME_COLORS.text, resolution: TAG_RESOLUTION })
      .setOrigin(BOTTOM_CENTER_X, BOTTOM_CENTER_Y)
      .setPadding(TAG_PADDING_X, TAG_PADDING_Y, TAG_PADDING_X, TAG_PADDING_Y)
      .setDepth(depth);
    text.setBackgroundColor(TAG_BACKGROUND);
    return text;
  }

  private startIdle(): void {
    this.bobTween = this.scene.tweens.add({
      targets: [this.sprite, this.tag],
      y: `-=${BOB_DISTANCE}`,
      duration: BOB_DURATION_MS,
      yoyo: true,
      repeat: TWEEN_REPEAT_FOREVER,
      ease: Phaser.Math.Easing.Sine.InOut,
      delay: Phaser.Math.Between(0, BOB_MAX_START_DELAY_MS),
    });
    this.scheduleBlink();
  }

  private scheduleBlink(): void {
    this.blinkTimer = this.scene.time.delayedCall(Phaser.Math.Between(BLINK_MIN_INTERVAL_MS, BLINK_MAX_INTERVAL_MS), this.handleBlinkStart, undefined, this);
  }

  private handleBlinkStart(): void {
    this.sprite.setTexture(this.blinkKey);
    this.blinkTimer = this.scene.time.delayedCall(BLINK_DURATION_MS, this.handleBlinkEnd, undefined, this);
  }

  private handleBlinkEnd(): void {
    this.sprite.setTexture(this.idleKey);
    this.scheduleBlink();
  }

  private wireInput(): void {
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, this.handlePointerOver, this);
    this.sprite.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, this.handlePointerOut, this);
    this.sprite.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, this.handlePointerUp, this);
  }

  private handlePointerOver(): void {
    this.sprite.setScale(HOVER_SCALE);
    this.tag.setText(`${this.figure.name}${TAG_SEPARATOR}${this.figure.job}`);
  }

  private handlePointerOut(): void {
    this.sprite.setScale(1);
    this.tag.setText(this.figure.name);
  }

  /** A release counts as a click only when the pointer did not travel far since it went down. */
  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.getDistance() >= DRAG_THRESHOLD_PIXELS) return;
    const payload: FigureClickedPayload = { figureId: this.figure.id };
    gameEvents.emit(GameEvent.FigureClicked, payload);
  }
}
