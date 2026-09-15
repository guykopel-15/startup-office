import { vi } from 'vitest';

vi.mock('phaser', (): { default: object } => ({ default: {} }));

import { FigureState } from '@shared/figures';
import { BADGE_FRAMES, BADGE_PALETTE, BadgeKey, WORKING_BADGE_KEYS, badgeKeyFor } from './badges';
import { getFrameWidth, parsePixelRows } from './pixelArt';

import type { PixelFrame, PixelPoint } from './pixelArt';

describe('badges', (): void => {
  it('are all the same size and fully paletted', (): void => {
    expect(BADGE_FRAMES.length).toBeGreaterThan(0);
    const first = BADGE_FRAMES[0];
    if (first === undefined) return;
    BADGE_FRAMES.forEach((frame: PixelFrame): void => {
      expect(frame.rows).toHaveLength(first.rows.length);
      expect(getFrameWidth(frame.rows)).toBe(getFrameWidth(first.rows));
      expect((): PixelPoint[] => parsePixelRows(frame.rows, BADGE_PALETTE)).not.toThrow();
    });
  });

  it('has a frame for every working key', (): void => {
    const keys = BADGE_FRAMES.map((frame: PixelFrame): string => frame.key);
    expect(keys).toEqual(expect.arrayContaining([...WORKING_BADGE_KEYS]));
  });

  it('map figure states to badges and hide for idle and meeting', (): void => {
    expect(badgeKeyFor(FigureState.Done)).toBe(BadgeKey.Done);
    expect(badgeKeyFor(FigureState.Error)).toBe(BadgeKey.Error);
    expect(badgeKeyFor(FigureState.Working)).toBe(BadgeKey.WorkingOne);
    expect(badgeKeyFor(FigureState.Idle)).toBeNull();
    expect(badgeKeyFor(FigureState.Meeting)).toBeNull();
  });
});
