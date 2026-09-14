import Phaser from 'phaser';

import { GAME_FONT_FAMILY } from '@shared/theme';
import { buildFigurePalette, composeBlinkRows, composeFigureRows } from '../art/composeFigure';
import { createPixelTexture } from '../art/pixelArt';
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
const BLINK_MIN_INTERVAL_MS = 2500;
const BLINK_MAX_INTERVAL_MS = 6000;
const BLINK_DURATION_MS = 120;
const HOVER_SCALE = 1.08;
const TAG_FONT_SIZE = '5px';
const TAG_RESOLUTION = 4;
const TAG_COLOR = '#f1ecff';
const TAG_BACKGROUND = 'rgba(14, 10, 26, 0.8)';
const TAG_PADDING_X = 2;
const TAG_PADDING_Y = 1;
const TAG_GAP = 2;
const TAG_DEPTH_BONUS = 0.5;
const TAG_SEPARATOR = ' · ';

/** A seated figure: sprite, name tag, idle bob, blink, hover, click. */
export class FigureSprite {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly tag: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;
  private readonly figure: Figure;
  private readonly idleKey: string;
  private readonly blinkKey: string;

  constructor(scene: Phaser.Scene, figure: Figure, origin: ScreenPoint, feet: GridPoint, feetScreen: ScreenPoint) {
    this.scene = scene;
    this.figure = figure;
    this.idleKey = `figure-${figure.id}`;
    this.blinkKey = `figure-${figure.id}-blink`;
    this.ensureTextures();
    const x = origin.x + feetScreen.x;
    const y = origin.y + feetScreen.y;
    this.sprite = scene.add.sprite(x, y, this.idleKey).setOrigin(BOTTOM_CENTER_X, BOTTOM_CENTER_Y).setDepth(getDepth(feet));
    this.tag = this.createTag(x, y - this.sprite.height - TAG_GAP, getDepth(feet) + TAG_DEPTH_BONUS);
    this.startIdle();
    this.wireInput();
  }

  private ensureTextures(): void {
    const palette = buildFigurePalette(this.figure.look);
    createPixelTexture(this.scene, { key: this.idleKey, rows: composeFigureRows(this.figure.look) }, palette);
    createPixelTexture(this.scene, { key: this.blinkKey, rows: composeBlinkRows(this.figure.look) }, palette);
  }

  private createTag(x: number, y: number, depth: number): Phaser.GameObjects.Text {
    const text = this.scene.add
      .text(x, y, this.figure.name, { fontFamily: GAME_FONT_FAMILY, fontSize: TAG_FONT_SIZE, color: TAG_COLOR, resolution: TAG_RESOLUTION })
      .setOrigin(BOTTOM_CENTER_X, BOTTOM_CENTER_Y)
      .setPadding(TAG_PADDING_X, TAG_PADDING_Y, TAG_PADDING_X, TAG_PADDING_Y)
      .setDepth(depth);
    text.setBackgroundColor(TAG_BACKGROUND);
    return text;
  }

  private startIdle(): void {
    this.scene.tweens.add({
      targets: [this.sprite, this.tag],
      y: `-=${BOB_DISTANCE}`,
      duration: BOB_DURATION_MS,
      yoyo: true,
      repeat: -1,
      ease: Phaser.Math.Easing.Sine.InOut,
      delay: Phaser.Math.Between(0, BOB_MAX_START_DELAY_MS),
    });
    this.scheduleBlink();
  }

  private scheduleBlink(): void {
    this.scene.time.delayedCall(Phaser.Math.Between(BLINK_MIN_INTERVAL_MS, BLINK_MAX_INTERVAL_MS), () => {
      this.sprite.setTexture(this.blinkKey);
      this.scene.time.delayedCall(BLINK_DURATION_MS, () => {
        this.sprite.setTexture(this.idleKey);
        this.scheduleBlink();
      });
    });
  }

  private wireInput(): void {
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.on(Phaser.Input.Events.POINTER_OVER, this.handlePointerOver, this);
    this.sprite.on(Phaser.Input.Events.POINTER_OUT, this.handlePointerOut, this);
    this.sprite.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
  }

  private handlePointerOver(): void {
    this.sprite.setScale(HOVER_SCALE);
    this.tag.setText(`${this.figure.name}${TAG_SEPARATOR}${this.figure.job}`);
  }

  private handlePointerOut(): void {
    this.sprite.setScale(1);
    this.tag.setText(this.figure.name);
  }

  private handlePointerDown(): void {
    const payload: FigureClickedPayload = { figureId: this.figure.id };
    gameEvents.emit(GameEvent.FigureClicked, payload);
  }
}
