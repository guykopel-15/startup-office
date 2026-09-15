import Phaser from 'phaser';

import { createPixelTexture } from '../art/pixelArt';

import type { PixelPalette } from '../art/pixelArt';

const CONFETTI_KEY = 'confetti';
const CONFETTI_PALETTE: PixelPalette = { A: '#ffd866', B: '#5fe089', C: '#ff4d6d', D: '#7dd3fc' };
const CONFETTI_ROWS: readonly string[] = ['AB', 'CD'];
const PIECE_COUNT = 90;
const SPREAD_X = 220;
const DURATION_MS = 1400;
const LIFESPAN_MS = 1600;
const GRAVITY_Y = 60;
const SPEED_MIN = 20;
const SPEED_MAX = 70;
const ROTATE_MAX = 360;
const DEPTH = 20000;

/** A short burst of pixel confetti over `point`, for a closed sprint. Cleans itself up. */
export function burstConfetti(scene: Phaser.Scene, x: number, y: number): void {
  createPixelTexture(scene, { key: CONFETTI_KEY, rows: CONFETTI_ROWS }, CONFETTI_PALETTE);
  const emitter = scene.add
    .particles(x, y, CONFETTI_KEY, {
      x: { min: -SPREAD_X, max: SPREAD_X },
      speedY: { min: SPEED_MIN, max: SPEED_MAX },
      speedX: { min: -SPEED_MIN, max: SPEED_MIN },
      gravityY: GRAVITY_Y,
      rotate: { min: 0, max: ROTATE_MAX },
      lifespan: LIFESPAN_MS,
      quantity: PIECE_COUNT,
      emitting: false,
    })
    .setDepth(DEPTH);
  emitter.explode(PIECE_COUNT);
  scene.time.delayedCall(DURATION_MS + LIFESPAN_MS, (): void => emitter.destroy());
}
