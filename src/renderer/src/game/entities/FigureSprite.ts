import Phaser from 'phaser';

import { FigureState } from '@shared/figures';
import { GAME_FONT_FAMILY, GAME_TEXT_RESOLUTION, THEME_COLORS } from '@shared/theme';
import { buildFigurePalette, composeBlinkRows, composeFigureRows } from '../art/composeFigure';
import { createPixelTexture } from '../art/pixelArt';
import { DRAG_THRESHOLD_PIXELS } from '../camera/OfficeCamera';
import { GameEvent, gameEvents } from '../events';
import { DEPTH_RIM } from '../world/drawWalls';
import { getDepth, projectToScreen } from '../world/isoProjection';
import { BOTTOM_CENTER_X, BOTTOM_CENTER_Y } from './anchors';
import { FigureBadge } from './FigureBadge';
import { FigureBubble } from './FigureBubble';
import { FigureTyping } from './FigureTyping';
import { FigureWalker } from './FigureWalker';

import type { Figure } from '@shared/figures';
import type { FigureClickedPayload } from '../events';
import type { GridPoint, ScreenPoint } from '../world/isoProjection';

const BOB_DISTANCE = 1;
const BOB_DURATION_MS = 900;
const BOB_MAX_START_DELAY_MS = 800;
const TWEEN_REPEAT_FOREVER = -1;
const BLINK_MIN_INTERVAL_MS = 2500;
const BLINK_MAX_INTERVAL_MS = 6000;
const BLINK_DURATION_MS = 120;
const HOVER_SCALE = 1.08;
const REST_SCALE = 1;
const TEXTURE_KEY_PREFIX = 'figure-';
const BLINK_KEY_SUFFIX = '-blink';
const TAG_FONT_SIZE = '5px';
const TAG_BACKGROUND = 'rgba(14, 10, 26, 0.8)';
const TAG_PADDING_X = 2;
const TAG_PADDING_Y = 1;
const TAG_GAP = 3;
const BADGE_GAP = 2;
const BUBBLE_GAP = 3;
const TAG_DEPTH_BONUS = 0.5;
const BADGE_DEPTH_BONUS = 0.6;
/** Speech is UI: it sits above every wall and figure, ordered among bubbles by the figure's depth. */
const BUBBLE_DEPTH_BASE = DEPTH_RIM + 1;
const TAG_SEPARATOR = ' · ';

/** A figure in the office: sprite, name tag, status badge, speech bubble, idle bob, blink, typing, walking, hover, click. */
export class FigureSprite {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly tag: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;
  private readonly figure: Figure;
  private readonly origin: ScreenPoint;
  private readonly idleKey: string;
  private readonly blinkKey: string;
  private readonly badge: FigureBadge;
  private readonly bubble: FigureBubble;
  private readonly typing: FigureTyping;
  private readonly walker: FigureWalker;
  private restX: number;
  private restY: number;
  private bubbleRestY: number;
  private bobOffset = 0;
  private state: FigureState | null = null;
  private bobTween: Phaser.Tweens.Tween | null = null;
  private blinkTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, figure: Figure, origin: ScreenPoint, feet: GridPoint) {
    this.scene = scene;
    this.figure = figure;
    this.origin = origin;
    this.idleKey = `${TEXTURE_KEY_PREFIX}${figure.id}`;
    this.blinkKey = `${this.idleKey}${BLINK_KEY_SUFFIX}`;
    this.ensureTextures();
    const feetScreen = projectToScreen(feet);
    this.restX = origin.x + feetScreen.x;
    this.restY = origin.y + feetScreen.y;
    const depth = getDepth(feet);
    this.sprite = scene.add.sprite(this.restX, this.restY, this.idleKey).setOrigin(BOTTOM_CENTER_X, BOTTOM_CENTER_Y).setDepth(depth);
    this.typing = new FigureTyping(scene, this.sprite, this.idleKey, figure.look);
    this.walker = new FigureWalker(scene, this.sprite, this.idleKey, figure.look, feet);
    this.tag = this.createTag(this.restX, this.restY - this.sprite.height - TAG_GAP, depth + TAG_DEPTH_BONUS);
    const tagTop = this.tag.y - this.tag.height;
    this.badge = new FigureBadge(scene, this.restX, tagTop - BADGE_GAP, depth + BADGE_DEPTH_BONUS);
    this.bubbleRestY = tagTop - BUBBLE_GAP;
    this.bubble = new FigureBubble(scene, this.restX, this.bubbleRestY, BUBBLE_DEPTH_BASE + depth);
    this.setState(figure.state);
    this.startIdle();
    this.wireInput();
  }

  get feet(): GridPoint {
    return this.walker.position;
  }

  get isWalking(): boolean {
    return this.walker.isWalking;
  }

  /** Switches badge and pose; the typing frames cycle only while working at the desk. Same state twice is a no-op. */
  setState(state: FigureState): void {
    if (state === this.state) return;
    this.state = state;
    this.badge.setState(state);
    this.placeBubble();
    this.applyPose();
    if (state !== FigureState.Working) this.bubble.release();
  }

  /** Walks along `path` (feet points); typing pauses on the way and resumes on arrival when still working. */
  walkTo(path: readonly GridPoint[], onArrive: () => void): void {
    this.typing.stop();
    this.walker.walk(path, {
      onStep: (feet: GridPoint): void => this.placeAt(feet),
      onArrive: (): void => {
        this.applyPose();
        onArrive();
      },
    });
  }

  /** The bubble stays up while the figure works and fades a few seconds after any other line. */
  say(message: string): void {
    this.placeBubble();
    this.bubble.say(message, this.state === FigureState.Working);
  }

  hideBubble(): void {
    this.bubble.hide();
  }

  /** Stops timers and tweens and removes every display object. */
  destroy(): void {
    this.bobTween?.remove();
    this.blinkTimer?.remove();
    this.sprite.removeAllListeners();
    this.sprite.destroy();
    this.tag.destroy();
    this.badge.destroy();
    this.bubble.destroy();
    this.typing.destroy();
    this.walker.destroy();
    [this.idleKey, this.blinkKey].forEach((key: string): void => void this.scene.textures.remove(key));
  }

  private ensureTextures(): void {
    const palette = buildFigurePalette(this.figure.look);
    createPixelTexture(this.scene, { key: this.idleKey, rows: composeFigureRows(this.figure.look) }, palette);
    createPixelTexture(this.scene, { key: this.blinkKey, rows: composeBlinkRows(this.figure.look) }, palette);
  }

  private createTag(x: number, y: number, depth: number): Phaser.GameObjects.Text {
    const text = this.scene.add
      .text(x, y, this.figure.name, { fontFamily: GAME_FONT_FAMILY, fontSize: TAG_FONT_SIZE, color: THEME_COLORS.text, resolution: GAME_TEXT_RESOLUTION })
      .setOrigin(BOTTOM_CENTER_X, BOTTOM_CENTER_Y)
      .setPadding(TAG_PADDING_X, TAG_PADDING_Y, TAG_PADDING_X, TAG_PADDING_Y)
      .setDepth(depth);
    text.setBackgroundColor(TAG_BACKGROUND);
    return text;
  }

  /** Typing runs only while working and standing still; walking shows the stride instead. */
  private applyPose(): void {
    if (this.state === FigureState.Working && !this.walker.isWalking) {
      this.typing.start();
      return;
    }
    this.typing.stop();
  }

  /** Moves everything to a new feet point and re-sorts it against walls and furniture. */
  private placeAt(feet: GridPoint): void {
    const feetScreen = projectToScreen(feet);
    this.restX = this.origin.x + feetScreen.x;
    this.restY = this.origin.y + feetScreen.y;
    const depth = getDepth(feet);
    this.sprite.setDepth(depth);
    this.tag.setDepth(depth + TAG_DEPTH_BONUS);
    this.badge.displayObject.setDepth(depth + BADGE_DEPTH_BONUS);
    this.bubble.displayObject.setDepth(BUBBLE_DEPTH_BASE + depth);
    [this.sprite, this.tag, this.badge.displayObject, this.bubble.displayObject].forEach((object): void => void object.setX(this.restX));
    this.placeBubble();
  }

  /** The bubble sits above the badge when one is showing, else right above the tag. */
  private placeBubble(): void {
    const tagTop = this.restY - this.sprite.height - TAG_GAP - this.tag.height;
    const badgeSpace = this.badge.isVisible ? this.badge.height + BADGE_GAP : 0;
    this.bubbleRestY = tagTop - badgeSpace - BUBBLE_GAP;
    this.applyBob();
  }

  /** The bob is a counter so repositioning the bubble never fights the tween. */
  private startIdle(): void {
    this.bobTween = this.scene.tweens.addCounter({
      from: 0,
      to: BOB_DISTANCE,
      duration: BOB_DURATION_MS,
      yoyo: true,
      repeat: TWEEN_REPEAT_FOREVER,
      ease: Phaser.Math.Easing.Sine.InOut,
      delay: Phaser.Math.Between(0, BOB_MAX_START_DELAY_MS),
      onUpdate: this.handleBob,
      callbackScope: this,
    });
    this.scheduleBlink();
  }

  private handleBob(tween: Phaser.Tweens.Tween): void {
    this.bobOffset = tween.getValue() ?? 0;
    this.applyBob();
  }

  /** Moves the figure and everything attached to it by the current bob offset. */
  private applyBob(): void {
    const tagRestY = this.restY - this.sprite.height - TAG_GAP;
    this.sprite.setY(this.restY - this.bobOffset);
    this.tag.setY(tagRestY - this.bobOffset);
    this.badge.displayObject.setY(tagRestY - this.tag.height - BADGE_GAP - this.bobOffset);
    this.bubble.displayObject.setY(this.bubbleRestY - this.bobOffset);
  }

  private scheduleBlink(): void {
    this.blinkTimer = this.scene.time.delayedCall(Phaser.Math.Between(BLINK_MIN_INTERVAL_MS, BLINK_MAX_INTERVAL_MS), this.handleBlinkStart, undefined, this);
  }

  private get isPosing(): boolean {
    return this.typing.isActive || this.walker.isWalking;
  }

  private handleBlinkStart(): void {
    if (!this.isPosing) this.sprite.setTexture(this.blinkKey);
    this.blinkTimer = this.scene.time.delayedCall(BLINK_DURATION_MS, this.handleBlinkEnd, undefined, this);
  }

  private handleBlinkEnd(): void {
    if (!this.isPosing) this.sprite.setTexture(this.idleKey);
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
    this.sprite.setScale(REST_SCALE);
    this.tag.setText(this.figure.name);
  }

  /** A release counts as a click only when the pointer did not travel far since it went down. */
  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.getDistance() >= DRAG_THRESHOLD_PIXELS) return;
    const payload: FigureClickedPayload = { figureId: this.figure.id };
    gameEvents.emit(GameEvent.FigureClicked, payload);
  }
}
