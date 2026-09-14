import { createLogger } from '../shared/logger';
import { WINDOW_MIN_HEIGHT, WINDOW_MIN_WIDTH } from './windowConfig';

const logger = createLogger('config');

export interface WindowSizeOverride {
  width: number;
  height: number;
}

/** The only place that reads process.env. Everything else asks this module. */
export interface MainConfig {
  rendererUrl: string | undefined;
  /** Dev only: capture the window to this PNG once it has rendered, then quit. */
  screenshotPath: string | undefined;
  /** Dev only: `WIDTHxHEIGHT` to open the window at a given size for screenshots. */
  windowSize: WindowSizeOverride | undefined;
  isDarwin: boolean;
}

const SIZE_PATTERN = /^(\d+)x(\d+)$/;
const DECIMAL_RADIX = 10;

function parseWindowSize(raw: string | undefined): WindowSizeOverride | undefined {
  if (raw === undefined) return undefined;
  const match = SIZE_PATTERN.exec(raw);
  if (match === null) {
    logger.warn('ignoring STARTUP_OFFICE_WINDOW, expected WIDTHxHEIGHT', raw);
    return undefined;
  }
  const width = Number.parseInt(match[1] ?? '', DECIMAL_RADIX);
  const height = Number.parseInt(match[2] ?? '', DECIMAL_RADIX);
  if (width < WINDOW_MIN_WIDTH || height < WINDOW_MIN_HEIGHT) {
    logger.warn('ignoring STARTUP_OFFICE_WINDOW, below the window minimum', { width, height, minimum: `${WINDOW_MIN_WIDTH}x${WINDOW_MIN_HEIGHT}` });
    return undefined;
  }
  return { width, height };
}

/** Dev-only overrides are dropped in packaged builds so a stray env var cannot alter a user's app. */
export function readConfig(isPackaged: boolean): MainConfig {
  return {
    rendererUrl: process.env.ELECTRON_RENDERER_URL,
    screenshotPath: isPackaged ? undefined : process.env.STARTUP_OFFICE_SCREENSHOT,
    windowSize: isPackaged ? undefined : parseWindowSize(process.env.STARTUP_OFFICE_WINDOW),
    isDarwin: process.platform === 'darwin',
  };
}
