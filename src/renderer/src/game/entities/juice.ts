import Phaser from 'phaser';

import { GAME_FONT_FAMILY, GAME_TEXT_RESOLUTION, THEME_COLORS } from '@shared/theme';
import { createPixelTexture } from '../art/pixelArt';
import { DEPTH_RIM } from '../world/drawWalls';
import { BOTTOM_CENTER_X, BOTTOM_CENTER_Y } from './anchors';

import type { PixelPalette } from '../art/pixelArt';

/** Floating numbers and bursts over a figure: the "juice" of a finished or failed quest. */

const SPARK_KEY = 'spark';
const SPARK_PALETTE: PixelPalette = { A: THEME_COLORS.accent, B: '#fff4b0' };
const SPARK_ROWS: readonly string[] = ['AB', 'BA'];
const FLOAT_DEPTH = DEPTH_RIM + 2;
const FLOAT_FONT_SIZE = '6px';
const LEVEL_FONT_SIZE = '8px';
const FLOAT_RISE = 18;
const FLOAT_MS = 1800;
const LEVEL_RISE = 18;
const LEVEL_MS = 2600;
const LEVEL_UP_TEXT = 'LEVEL UP!';
const REWARD_PREFIX = '+';
const REWARD_SUFFIX = ' XP';
const DAMAGE_PREFIX = '-';
const REWARD_COLOR = '#5fe089';
const DAMAGE_COLOR = '#ff4d6d';
const HIT_TINT = 0xff6b8a;
const HIT_FLASH_MS = 120;
const HIT_SHAKE_PIXELS = 2;
const HIT_SHAKE_STEPS = 4;
const SPARK_COUNT = 40;
const SPARK_SPEED_MIN = 25;
const SPARK_SPEED_MAX = 60;
const SPARK_LIFESPAN_MS = 1300;
const SPARK_GRAVITY = 40;
const FULL_CIRCLE = 360;

function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color: string, fontSize: string, rise: number, duration: number): void {
  const label = scene.add
    .text(x, y, text, { fontFamily: GAME_FONT_FAMILY, fontSize, color, resolution: GAME_TEXT_RESOLUTION, fontStyle: 'bold' })
    .setOrigin(BOTTOM_CENTER_X, BOTTOM_CENTER_Y)
    .setDepth(FLOAT_DEPTH);
  scene.tweens.add({ targets: label, y: y - rise, alpha: 0, duration, ease: Phaser.Math.Easing.Cubic.Out, onComplete: (): void => label.destroy() });
}

/** "+50 XP" drifting up in green. */
export function showReward(scene: Phaser.Scene, x: number, y: number, points: number): void {
  floatText(scene, x, y, `${REWARD_PREFIX}${points}${REWARD_SUFFIX}`, REWARD_COLOR, FLOAT_FONT_SIZE, FLOAT_RISE, FLOAT_MS);
}

/** "-10" drifting up in red, plus a flash and a shake of the figure. */
export function showHit(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, x: number, y: number, amount: number): void {
  floatText(scene, x, y, `${DAMAGE_PREFIX}${amount}`, DAMAGE_COLOR, FLOAT_FONT_SIZE, FLOAT_RISE, FLOAT_MS);
  sprite.setTint(HIT_TINT);
  scene.time.delayedCall(HIT_FLASH_MS, (): void => void sprite.clearTint());
  scene.tweens.add({ targets: sprite, x: sprite.x + HIT_SHAKE_PIXELS, duration: HIT_FLASH_MS / HIT_SHAKE_STEPS, yoyo: true, repeat: HIT_SHAKE_STEPS - 1 });
}

/** A gold spark burst and "LEVEL UP!" over the figure. */
export function showLevelUp(scene: Phaser.Scene, x: number, y: number): void {
  createPixelTexture(scene, { key: SPARK_KEY, rows: SPARK_ROWS }, SPARK_PALETTE);
  const emitter = scene.add
    .particles(x, y, SPARK_KEY, {
      speed: { min: SPARK_SPEED_MIN, max: SPARK_SPEED_MAX },
      angle: { min: 0, max: FULL_CIRCLE },
      gravityY: SPARK_GRAVITY,
      lifespan: SPARK_LIFESPAN_MS,
      quantity: SPARK_COUNT,
      emitting: false,
    })
    .setDepth(FLOAT_DEPTH);
  emitter.explode(SPARK_COUNT);
  scene.time.delayedCall(SPARK_LIFESPAN_MS, (): void => emitter.destroy());
  floatText(scene, x, y, LEVEL_UP_TEXT, THEME_COLORS.accent, LEVEL_FONT_SIZE, LEVEL_RISE, LEVEL_MS);
}
