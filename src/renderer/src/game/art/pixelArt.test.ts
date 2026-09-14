import { vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { getFrameWidth, parsePixelRows } from './pixelArt';

describe('parsePixelRows', () => {
  it('skips transparent pixels and maps colors', () => {
    const pixels = parsePixelRows(['.A', 'B.'], { A: '#111111', B: '#222222' });
    expect(pixels).toEqual([
      { x: 1, y: 0, color: '#111111' },
      { x: 0, y: 1, color: '#222222' },
    ]);
  });

  it('throws on a character missing from the palette', () => {
    expect(() => parsePixelRows(['Z'], {})).toThrow('No palette color for "Z"');
  });
});

describe('getFrameWidth', () => {
  it('returns the widest row', () => {
    expect(getFrameWidth(['..', '....', '.'])).toBe(4);
  });
});
