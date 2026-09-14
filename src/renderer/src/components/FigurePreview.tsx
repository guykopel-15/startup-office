import React, { useEffect, useRef } from 'react';

import { buildFigurePalette, composeFigureRows } from '../game/art/composeFigure';
import { FIGURE_HEIGHT, FIGURE_WIDTH } from '../game/art/chibiTemplate';
import { parsePixelRows } from '../game/art/pixelArt';

import type { FigureLook } from '@shared/figures';
import type { PixelPoint } from '../game/art/pixelArt';

interface FigurePreviewProps {
  look: FigureLook;
}

const PIXEL_SCALE = 4;

/** Draws the composed figure into a canvas so the dialog shows the look live. */
export function FigurePreview({ look }: FigurePreviewProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect((): void => {
    const context = canvasRef.current?.getContext('2d');
    if (context === null || context === undefined) return;
    context.clearRect(0, 0, FIGURE_WIDTH * PIXEL_SCALE, FIGURE_HEIGHT * PIXEL_SCALE);
    parsePixelRows(composeFigureRows(look), buildFigurePalette(look)).forEach((pixel: PixelPoint): void => {
      context.fillStyle = pixel.color;
      context.fillRect(pixel.x * PIXEL_SCALE, pixel.y * PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE);
    });
  }, [look]);

  return <canvas ref={canvasRef} className="figure-preview" width={FIGURE_WIDTH * PIXEL_SCALE} height={FIGURE_HEIGHT * PIXEL_SCALE} aria-label="Figure preview" role="img" />;
}
