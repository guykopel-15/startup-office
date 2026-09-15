import { vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { FigureState } from '@shared/figures';
import { BADGE_FRAMES, BADGE_PALETTE, BadgeKey, badgeKeyFor } from './badges';
import { getFrameWidth, parsePixelRows } from './pixelArt';

import type { PixelFrame } from './pixelArt';

describe('badges', () => {
  it('are all the same size and fully paletted', (): void => {
    const first = BADGE_FRAMES[0] as PixelFrame;
    BADGE_FRAMES.forEach((frame: PixelFrame): void => {
      expect(frame.rows).toHaveLength(first.rows.length);
      expect(getFrameWidth(frame.rows)).toBe(getFrameWidth(first.rows));
      expect(() => parsePixelRows(frame.rows, BADGE_PALETTE)).not.toThrow();
    });
  });

  it('map figure states to badges and hide for idle', (): void => {
    expect(badgeKeyFor(FigureState.Done)).toBe(BadgeKey.Done);
    expect(badgeKeyFor(FigureState.Error)).toBe(BadgeKey.Error);
    expect(badgeKeyFor(FigureState.Working)).toBe(BadgeKey.WorkingOne);
    expect(badgeKeyFor(FigureState.Idle)).toBeNull();
  });
});
