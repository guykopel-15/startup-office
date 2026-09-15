import Phaser from 'phaser';

import { FigureState } from '@shared/figures';
import { GAME_FONT_FAMILY, THEME_COLORS } from '@shared/theme';
import { TYPING_FRAME_COUNT, buildFigurePalette, composeBlinkRows, composeFigureRows, composeTypingRows } from '../art/composeFigure';
import { createPixelTexture } from '../art/pixelArt';
import { DRAG_THRESHOLD_PIXELS } from '../camera/OfficeCamera';
import { GameEvent, gameEvents } from '../events';
import { getDepth } from '../world/isoProjection';
import { FigureBadge } from './FigureBadge';
import { FigureBubble } from './FigureBubble';

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
const TYPING_FRAME_MS = 160;
const HOVER_SCALE = 1.08;
const TEXTURE_KEY_PREFIX = 'figure-';
const BLINK_KEY_SUFFIX = '-blink';
const TYPING_KEY_SUFFIX = '-typing-';
const TAG_FONT_SIZE = '5px';
const TAG_RESOLUTION = 4;
const TAG_BACKGROUND = 'rgba(14, 10, 26, 0.8)';
const TAG_PADDING_X = 2;
const TAG_PADDING_Y = 1;
const TAG_GAP = 3;
const BADGE_GAP = 2;
const BUBBLE_GAP = 3;
const TAG_DEPTH_BONUS = 0.5;
const BADGE_DEPTH_BONUS = 0.6;
const BUBBLE_DEPTH_BONUS = 0.7;
const TAG_SEPARATOR = ' · ';

/** A seated figure: sprite, name tag, status badge, speech bubble, idle bob, blink, typing, hover, click. */
export class FigureSprite {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly tag: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;
  private readonly figure: Figure;
  private readonly idleKey: string;
  private readonly blinkKey: string;
  private readonly typingKeys: string[];
  private readonly badge: FigureBadge;
  private readonly bubble: FigureBubble;
  private state: FigureState = FigureState.Idle;
  private typingFrame = 0;
  private bobTween: Phaser.Tweens.Tween | null = null;
  private blinkTimer: Phaser.Time.TimerEvent | null = null;
  private typingTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, figure: Figure, origin: ScreenPoint, feet: GridPoint, feetScreen: ScreenPoint) {
    this.scene = scene;
    this.figure = figure;
    this.idleKey = `${TEXTURE_KEY_PREFIX}${figure.id}`;
    this.blinkKey = `${this.idleKey}${BLINK_KEY_SUFFIX}`;
    this.typingKeys = Array.from({ length: TYPING_FRAME_COUNT }, (_, index: number): string => `${this.idleKey}${TYPING_KEY_SUFFIX}${index}`);
    this.ensureTextures();
    const x = origin.x + feetScreen.x;
    const y = origin.y + feetScreen.y;
    const depth = getDepth(feet);
    this.sprite = scene.add.sprite(x, y, this.idleKey).setOrigin(BOTTOM_CENTER_X, BOTTOM_CENTER_Y).setDepth(depth);
    this.tag = this.createTag(x, y - this.sprite.height - TAG_GAP, depth + TAG_DEPTH_BONUS);
    const tagTop = this.tag.y - this.tag.height;
    this.badge = new FigureBadge(scene, x, tagTop - BADGE_GAP, depth + BADGE_DEPTH_BONUS);
    this.bubble = new FigureBubble(scene, x, tagTop - BUBBLE_GAP, depth + BUBBLE_DEPTH_BONUS);
    this.setState(figure.state);
    this.startIdle();
    this.wireInput();
  }

  /** Switches badge and pose; the typing frames cycle only while working. */
  setState(state: FigureState): void {
    this.state = state;
    this.badge.setState(state);
    this.typingTimer?.remove();
    this.typingTimer = null;
    if (state !== FigureState.Working) {
      this.sprite.setTexture(this.idleKey);
      this.bubble.release();
      return;
    }
    this.typingTimer = this.scene.time.addEvent({ delay: TYPING_FRAME_MS, loop: true, callback: this.handleTypingFrame, callbackScope: this });
    this.handleTypingFrame();
  }

  /** The bubble stays up while the figure works and fades a few seconds after any other line. */
  say(message: string): void {
    this.bubble.say(message, this.state === FigureState.Working);
  }

  /** Stops timers and tweens and removes every display object. */
  destroy(): void {
    this.bobTween?.remove();
    this.blinkTimer?.remove();
    this.typingTimer?.remove();
    this.sprite.removeAllListeners();
    this.sprite.destroy();
    this.tag.destroy();
    this.badge.destroy();
    this.bubble.destroy();
    [this.idleKey, this.blinkKey, ...this.typingKeys].forEach((key: string): void => void this.scene.textures.remove(key));
  }

  private ensureTextures(): void {
    const palette = buildFigurePalette(this.figure.look);
    createPixelTexture(this.scene, { key: this.idleKey, rows: composeFigureRows(this.figure.look) }, palette);
    createPixelTexture(this.scene, { key: this.blinkKey, rows: composeBlinkRows(this.figure.look) }, palette);
    this.typingKeys.forEach((key: string, index: number): void => createPixelTexture(this.scene, { key, rows: composeTypingRows(this.figure.look, index) }, palette));
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
    if (this.state !== FigureState.Working) this.sprite.setTexture(this.blinkKey);
    this.blinkTimer = this.scene.time.delayedCall(BLINK_DURATION_MS, this.handleBlinkEnd, undefined, this);
  }

  private handleBlinkEnd(): void {
    if (this.state !== FigureState.Working) this.sprite.setTexture(this.idleKey);
    this.scheduleBlink();
  }

  private handleTypingFrame(): void {
    this.typingFrame = (this.typingFrame + 1) % TYPING_FRAME_COUNT;
    this.sprite.setTexture(this.typingKeys[this.typingFrame] ?? this.idleKey);
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
