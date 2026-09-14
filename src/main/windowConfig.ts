import { join } from 'node:path';

import { THEME_COLORS } from '../shared/theme';

export const WINDOW_TITLE = 'Startup Office';
/** Folder name under the OS app-data directory; pinned so dev and packaged builds share it. */
export const APP_NAME = 'startup-office';
export const WINDOW_DEFAULT_WIDTH = 1440;
export const WINDOW_DEFAULT_HEIGHT = 900;
export const WINDOW_MIN_WIDTH = 300;
export const WINDOW_MIN_HEIGHT = 300;
export const WINDOW_BACKGROUND_COLOR = THEME_COLORS.background;
export const APP_ICON_PATH = join(__dirname, '../../build/icon.png');
