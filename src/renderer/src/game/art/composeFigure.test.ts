import { vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { DEFAULT_FIGURES } from '@shared/figures';
import { FIGURE_HEIGHT, FIGURE_WIDTH } from './chibiTemplate';
import { buildFigurePalette, composeBlinkRows, composeFigureRows, mixColor } from './composeFigure';
import { getFrameWidth, parsePixelRows } from './pixelArt';

describe('mixColor', () => {
  it('lightens toward white and darkens toward black', () => {
    expect(mixColor('#000000', 1)).toBe('#ffffff');
    expect(mixColor('#ffffff', -1)).toBe('#000000');
    expect(mixColor('#808080', 0)).toBe('#808080');
  });
});

describe('composeFigureRows', () => {
  it('keeps every default figure at the template size and fully paletted', () => {
    DEFAULT_FIGURES.forEach((figure) => {
      const palette = buildFigurePalette(figure.look);
      [composeFigureRows(figure.look), composeBlinkRows(figure.look)].forEach((rows) => {
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

  it('shuts the eyes in the blink frame', () => {
    const figure = DEFAULT_FIGURES[0];
    if (figure === undefined) throw new Error('need a figure');
    const open = composeFigureRows(figure.look);
    const shut = composeBlinkRows(figure.look);
    expect(shut).not.toEqual(open);
  });
});
