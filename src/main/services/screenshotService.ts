import { writeFile } from 'node:fs/promises';

import { createLogger } from '../../shared/logger';

import type { BrowserWindow } from 'electron';

const logger = createLogger('screenshot');
const SETTLE_DELAY_MS = 1500;

/** Dev helper: capture the window to a PNG once it has rendered, then resolve. */
export async function captureWindowToFile(window: BrowserWindow, outputPath: string): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_DELAY_MS));
  const image = await window.webContents.capturePage();
  await writeFile(outputPath, image.toPNG());
  logger.info('wrote screenshot', outputPath);
}
