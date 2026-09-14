import { ACCESSORY_OVERLAYS, BASE_ROWS, BLINK_EYE_ROWS, HAIR_OVERLAYS } from './chibiTemplate';
import { TRANSPARENT_PIXEL } from './pixelArt';

import type { FigureLook } from '@shared/figures';
import type { Overlay } from './chibiTemplate';
import type { PixelPalette } from './pixelArt';

const OUTLINE_COLOR = '#0e0a1a';
const EYE_COLOR = '#1a1330';
const EYE_LIGHT_COLOR = '#ffffff';
const BLUSH_COLOR = '#f0a0a0';
const MOUTH_COLOR = '#c0604a';
const SHOE_COLOR = '#1a1330';
const HIGHLIGHT_MIX = 0.25;
const SHADE_MIX = -0.2;
const HEX_RADIX = 16;
const CHANNEL_MAX = 255;

/** Lightens (positive) or darkens (negative) a CSS hex color by a fraction. */
export function mixColor(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), HEX_RADIX);
  const channels = [(value >> 16) & CHANNEL_MAX, (value >> 8) & CHANNEL_MAX, value & CHANNEL_MAX];
  const mixed = channels.map((channel) => {
    const target = amount >= 0 ? CHANNEL_MAX : 0;
    return Math.round(channel + (target - channel) * Math.abs(amount));
  });
  return `#${mixed.map((channel) => channel.toString(HEX_RADIX).padStart(2, '0')).join('')}`;
}

export function buildFigurePalette(look: FigureLook): PixelPalette {
  return {
    D: OUTLINE_COLOR,
    H: look.hairColor,
    h: mixColor(look.hairColor, HIGHLIGHT_MIX),
    S: look.skinColor,
    s: mixColor(look.skinColor, SHADE_MIX),
    E: EYE_COLOR,
    W: EYE_LIGHT_COLOR,
    R: BLUSH_COLOR,
    M: MOUTH_COLOR,
    T: look.topColor,
    t: mixColor(look.topColor, SHADE_MIX),
    P: look.pantsColor,
    B: SHOE_COLOR,
    A: look.accessoryColor,
  };
}

/** Paints overlay rows over the base, skipping transparent overlay pixels. */
export function applyOverlay(base: readonly string[], overlay: Overlay): string[] {
  return base.map((row, y) => {
    const overlayRow = overlay.rows[y - overlay.offsetY];
    if (overlayRow === undefined) return row;
    return Array.from(row, (character, x) => {
      const overlayCharacter = overlayRow[x];
      return overlayCharacter === undefined || overlayCharacter === TRANSPARENT_PIXEL ? character : overlayCharacter;
    }).join('');
  });
}

export function composeFigureRows(look: FigureLook): string[] {
  const overlays = [HAIR_OVERLAYS[look.hairStyle], ACCESSORY_OVERLAYS[look.accessory]];
  return overlays.reduce<string[]>((rows, overlay) => (overlay === null ? rows : applyOverlay(rows, overlay)), [...BASE_ROWS]);
}

/** Same figure with its eyes shut, for the blink frame. Overlays on the eye rows win. */
export function composeBlinkRows(look: FigureLook): string[] {
  const shut = BASE_ROWS.map((row, y) => BLINK_EYE_ROWS[y] ?? row);
  const overlays = [HAIR_OVERLAYS[look.hairStyle], ACCESSORY_OVERLAYS[look.accessory]];
  return overlays.reduce<string[]>((rows, overlay) => (overlay === null ? rows : applyOverlay(rows, overlay)), shut);
}
