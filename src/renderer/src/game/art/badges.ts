import { FigureState } from '@shared/figures';

import type { PixelFrame, PixelPalette } from './pixelArt';

/** Small pixel badges shown above a figure's name tag. Tokens: G green, R red, Y yellow, W white, D dark. */
export const BADGE_PALETTE: PixelPalette = {
  G: '#5fe089',
  R: '#ff4d6d',
  Y: '#ffd866',
  W: '#f1ecff',
  D: '#0e0a1a',
};

export enum BadgeKey {
  Done = 'badge-done',
  Error = 'badge-error',
  Queued = 'badge-queued',
  WorkingOne = 'badge-working-1',
  WorkingTwo = 'badge-working-2',
  WorkingThree = 'badge-working-3',
}

export const BADGE_FRAMES: readonly PixelFrame[] = [
  { key: BadgeKey.Done, rows: ['DDDDDDDDD', 'DWWWWWWWD', 'DWWWWWGWD', 'DWGWWGGWD', 'DWGGGGWWD', 'DWWGGWWWD', 'DWWWWWWWD', 'DDDDDDDDD'] },
  { key: BadgeKey.Error, rows: ['DDDDDDDDD', 'DWWWWWWWD', 'DWRWWWRWD', 'DWWRWRWWD', 'DWWWRWWWD', 'DWWRWRWWD', 'DWRWWWRWD', 'DDDDDDDDD'] },
  { key: BadgeKey.Queued, rows: ['DDDDDDDDD', 'DWWWWWWWD', 'DWDDDDDWD', 'DWWDDDWWD', 'DWWWDWWWD', 'DWWDDDWWD', 'DWDDDDDWD', 'DDDDDDDDD'] },
  { key: BadgeKey.WorkingOne, rows: ['DDDDDDDDD', 'DWWWWWWWD', 'DWWWWWWWD', 'DWYWWWWWD', 'DWYWWWWWD', 'DWWWWWWWD', 'DWWWWWWWD', 'DDDDDDDDD'] },
  { key: BadgeKey.WorkingTwo, rows: ['DDDDDDDDD', 'DWWWWWWWD', 'DWWWWWWWD', 'DWYWYWWWD', 'DWYWYWWWD', 'DWWWWWWWD', 'DWWWWWWWD', 'DDDDDDDDD'] },
  { key: BadgeKey.WorkingThree, rows: ['DDDDDDDDD', 'DWWWWWWWD', 'DWWWWWWWD', 'DWYWYWYWD', 'DWYWYWYWD', 'DWWWWWWWD', 'DWWWWWWWD', 'DDDDDDDDD'] },
];

export const WORKING_BADGE_KEYS: readonly BadgeKey[] = [BadgeKey.WorkingOne, BadgeKey.WorkingTwo, BadgeKey.WorkingThree];

/** The badge for a figure state; null when the figure is idle. Working uses the animated dots. */
export function badgeKeyFor(state: FigureState): BadgeKey | null {
  switch (state) {
    case FigureState.Done:
      return BadgeKey.Done;
    case FigureState.Error:
      return BadgeKey.Error;
    case FigureState.Working:
      return BadgeKey.WorkingOne;
    case FigureState.Idle:
    case FigureState.Meeting:
      return null;
  }
}
