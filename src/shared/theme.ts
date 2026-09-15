/** Colors shared by the CSS variables in global.css and the Phaser scenes. */
export const THEME_COLORS = {
  background: '#1a1330',
  panel: '#2a1f4d',
  border: '#4a3b7a',
  text: '#f1ecff',
  muted: '#8a7fb3',
  accent: '#ffd866',
  /** Darkest ink: outlines, baseboards, deep shadows. */
  ink: '#0e0a1a',
} as const;

export const GAME_FONT_FAMILY = 'monospace';
/** Canvas text is rendered at this multiple of its size so pixel-scaled labels stay crisp. */
export const GAME_TEXT_RESOLUTION = 4;
export const HALF = 0.5;
