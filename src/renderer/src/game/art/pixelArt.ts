import Phaser from 'phaser';

export const TRANSPARENT_PIXEL = '.';

/** Maps one character in a pixel row to a CSS color. */
export type PixelPalette = Record<string, string>;

export interface PixelFrame {
  key: string;
  rows: readonly string[];
}

export interface PixelPoint {
  x: number;
  y: number;
  color: string;
}

/** Turns string rows into a flat list of colored pixels, skipping transparent ones. */
export function parsePixelRows(rows: readonly string[], palette: PixelPalette): PixelPoint[] {
  const pixels: PixelPoint[] = [];
  rows.forEach((row, y) => {
    Array.from(row).forEach((character, x) => {
      if (character === TRANSPARENT_PIXEL) return;
      const color = palette[character];
      if (color === undefined) throw new Error(`No palette color for "${character}" at ${x},${y}`);
      pixels.push({ x, y, color });
    });
  });
  return pixels;
}

export function getFrameWidth(rows: readonly string[]): number {
  return rows.reduce((widest, row) => Math.max(widest, row.length), 0);
}

/** Draws one pixel frame into a canvas texture the scene can use as a sprite. */
export function createPixelTexture(
  scene: Phaser.Scene,
  frame: PixelFrame,
  palette: PixelPalette,
): void {
  if (scene.textures.exists(frame.key)) return;
  const width = getFrameWidth(frame.rows);
  const height = frame.rows.length;
  const texture = scene.textures.createCanvas(frame.key, width, height);
  if (texture === null) throw new Error(`Could not create canvas texture "${frame.key}"`);
  const context = texture.getContext();
  parsePixelRows(frame.rows, palette).forEach((pixel) => {
    context.fillStyle = pixel.color;
    context.fillRect(pixel.x, pixel.y, 1, 1);
  });
  texture.refresh();
}
