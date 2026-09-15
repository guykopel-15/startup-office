import { vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { Accessory, DEFAULT_FIGURES, HairStyle } from '@shared/figures';
import { BLINK_EYE_ROWS, FIGURE_HEIGHT, FIGURE_WIDTH } from './chibiTemplate';
import { TYPING_FRAME_COUNT, applyOverlay, buildFigurePalette, composeBlinkRows, composeFigureRows, composeTypingRows, mixColor } from './composeFigure';
import { getFrameWidth, parsePixelRows } from './pixelArt';

import type { Figure, FigureLook } from '@shared/figures';

const PLAIN_LOOK: FigureLook = {
  hairStyle: HairStyle.Short,
  hairColor: '#5a3a22',
  skinColor: '#f5c9a2',
  topColor: '#7b5cff',
  pantsColor: '#26305a',
  accessory: Accessory.None,
  accessoryColor: '#000000',
  hatColor: '#3a7bd5',
};

describe('mixColor', () => {
  it('lightens toward white and darkens toward black', () => {
    expect(mixColor('#000000', 1)).toBe('#ffffff');
    expect(mixColor('#ffffff', -1)).toBe('#000000');
    expect(mixColor('#808080', 0)).toBe('#808080');
  });

  it('rejects anything that is not #rrggbb', () => {
    expect(() => mixColor('#fff', 0.1)).toThrow('Expected a #rrggbb color');
    expect(() => mixColor('red', 0.1)).toThrow('Expected a #rrggbb color');
  });
});

describe('applyOverlay', () => {
  it('paints opaque overlay pixels at the offset and leaves transparent ones alone', () => {
    const result = applyOverlay(['aaa', 'bbb', 'ccc'], { offsetY: 1, rows: ['.X.'] });
    expect(result).toEqual(['aaa', 'bXb', 'ccc']);
  });

  it('erases base pixels where the overlay uses a space', () => {
    expect(applyOverlay(['abc'], { offsetY: 0, rows: [' X.'] })).toEqual(['.Xc']);
  });

  it('ignores overlay rows that fall outside the base', () => {
    const result = applyOverlay(['aa'], { offsetY: 0, rows: ['XX', 'YY'] });
    expect(result).toEqual(['XX']);
  });
});

describe('composeFigureRows', () => {
  it('keeps every default figure at the template size and fully paletted', () => {
    DEFAULT_FIGURES.forEach((figure: Figure): void => {
      const palette = buildFigurePalette(figure.look);
      [composeFigureRows(figure.look), composeBlinkRows(figure.look)].forEach((rows: string[]): void => {
        expect(rows).toHaveLength(FIGURE_HEIGHT);
        expect(getFrameWidth(rows)).toBe(FIGURE_WIDTH);
        expect(() => parsePixelRows(rows, palette)).not.toThrow();
      });
    });
  });

  it('gives different looks different pixels', () => {
    const [first, second] = DEFAULT_FIGURES;
    if (first === undefined || second === undefined) throw new Error('need two figures');
    expect(composeFigureRows(first.look)).not.toEqual(composeFigureRows(second.look));
  });

  it('only changes the eye rows in the blink frame and keeps glasses on top', () => {
    const glasses: FigureLook = { ...PLAIN_LOOK, accessory: Accessory.Glasses, accessoryColor: '#1a1330' };
    const open = composeFigureRows(glasses);
    const shut = composeBlinkRows(glasses);
    open.forEach((row: string, y: number): void => {
      const isEyeRow = BLINK_EYE_ROWS[y] !== undefined;
      if (!isEyeRow) expect(shut[y]).toBe(row);
    });
    expect(shut).not.toEqual(open);
    const framesOpen = open.filter((row: string): boolean => row.includes('A')).length;
    const framesShut = shut.filter((row: string): boolean => row.includes('A')).length;
    expect(framesShut).toBe(framesOpen);
  });

  it('colors a cap with the hat color, not the accessory color', () => {
    const cap: FigureLook = { ...PLAIN_LOOK, hairStyle: HairStyle.Cap, hatColor: '#123456' };
    expect(composeFigureRows(cap).some((row: string): boolean => row.includes('C'))).toBe(true);
    expect(buildFigurePalette(cap)['C']).toBe('#123456');
  });
});

describe('composeTypingRows', () => {
  it('keeps the template size, differs per frame, and brings the arms in from the sides', (): void => {
    const palette = buildFigurePalette(PLAIN_LOOK);
    const frames = Array.from({ length: TYPING_FRAME_COUNT }, (_, index: number): string[] => composeTypingRows(PLAIN_LOOK, index));
    frames.forEach((rows: string[]): void => {
      expect(rows).toHaveLength(FIGURE_HEIGHT);
      expect(getFrameWidth(rows)).toBe(FIGURE_WIDTH);
      expect(() => parsePixelRows(rows, palette)).not.toThrow();
      expect(rows[17]?.[1]).toBe('.');
    });
    expect(frames[0]).not.toEqual(frames[1]);
    expect(frames[0]).not.toEqual(composeFigureRows(PLAIN_LOOK));
  });
});
