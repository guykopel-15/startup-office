import { THEME_COLORS } from '@shared/theme';
import { ACCESSORY_OVERLAYS, BASE_ROWS, BLINK_EYE_ROWS, HAIR_OVERLAYS, TYPING_FRAMES } from './chibiTemplate';
import { ERASE_PIXEL, TRANSPARENT_PIXEL } from './pixelArt';

import type { FigureLook } from '@shared/figures';
import type { Overlay } from './chibiTemplate';
import type { PixelPalette } from './pixelArt';

const EYE_LIGHT_COLOR = '#ffffff';
const BLUSH_COLOR = '#f0a0a0';
const MOUTH_COLOR = '#c0604a';
const HIGHLIGHT_MIX = 0.25;
const SHADE_MIX = -0.2;
const HEX_RADIX = 16;
const HEX_PREFIX_LENGTH = 1;
const HEX_CHANNEL_WIDTH = 2;
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;
const CHANNEL_MAX = 255;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

/** Lightens (positive) or darkens (negative) a CSS `#rrggbb` color by a fraction. Throws on any other format. */
export function mixColor(hex: string, amount: number): string {
  if (!HEX_COLOR_PATTERN.test(hex)) throw new Error(`Expected a #rrggbb color, got "${hex}"`);
  const value = Number.parseInt(hex.slice(HEX_PREFIX_LENGTH), HEX_RADIX);
  const channels = [(value >> RED_SHIFT) & CHANNEL_MAX, (value >> GREEN_SHIFT) & CHANNEL_MAX, value & CHANNEL_MAX];
  const target = amount >= 0 ? CHANNEL_MAX : 0;
  const mixed = channels.map((channel: number): number => Math.round(channel + (target - channel) * Math.abs(amount)));
  return `#${mixed.map((channel: number): string => channel.toString(HEX_RADIX).padStart(HEX_CHANNEL_WIDTH, '0')).join('')}`;
}

export function buildFigurePalette(look: FigureLook): PixelPalette {
  return {
    D: THEME_COLORS.ink,
    H: look.hairColor,
    h: mixColor(look.hairColor, HIGHLIGHT_MIX),
    S: look.skinColor,
    s: mixColor(look.skinColor, SHADE_MIX),
    E: THEME_COLORS.background,
    W: EYE_LIGHT_COLOR,
    R: BLUSH_COLOR,
    M: MOUTH_COLOR,
    T: look.topColor,
    t: mixColor(look.topColor, SHADE_MIX),
    P: look.pantsColor,
    B: THEME_COLORS.background,
    A: look.accessoryColor,
    C: look.hatColor,
  };
}

/** Paints overlay rows over the base, skipping transparent overlay pixels. */
export function applyOverlay(base: readonly string[], overlay: Overlay): string[] {
  return base.map((row: string, y: number): string => {
    const overlayRow = overlay.rows[y - overlay.offsetY];
    if (overlayRow === undefined) return row;
    return Array.from(row, (character: string, x: number): string => {
      const overlayCharacter = overlayRow[x];
      if (overlayCharacter === undefined || overlayCharacter === TRANSPARENT_PIXEL) return character;
      return overlayCharacter === ERASE_PIXEL ? TRANSPARENT_PIXEL : overlayCharacter;
    }).join('');
  });
}

function composeRows(base: readonly string[], look: FigureLook): string[] {
  const overlays = [HAIR_OVERLAYS[look.hairStyle], ACCESSORY_OVERLAYS[look.accessory]];
  return overlays.reduce<string[]>((rows: string[], overlay: Overlay | null): string[] => (overlay === null ? rows : applyOverlay(rows, overlay)), [...base]);
}

export function composeFigureRows(look: FigureLook): string[] {
  return composeRows(BASE_ROWS, look);
}

/** Same figure with its eyes shut, for the blink frame. Overlays on the eye rows win. */
export function composeBlinkRows(look: FigureLook): string[] {
  return composeRows(
    BASE_ROWS.map((row: string, y: number): string => BLINK_EYE_ROWS[y] ?? row),
    look,
  );
}

/** The figure typing: hair and accessory as usual, arms on the keyboard. `frame` cycles the two poses. */
export function composeTypingRows(look: FigureLook, frame: number): string[] {
  const pose = TYPING_FRAMES[frame % TYPING_FRAMES.length];
  const base = composeRows(BASE_ROWS, look);
  return pose === undefined ? base : applyOverlay(base, pose);
}

export const TYPING_FRAME_COUNT = TYPING_FRAMES.length;
