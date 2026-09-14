import { readFile, writeFile } from 'node:fs/promises';

import { createLogger } from '../../shared/logger';

import type { BrowserWindow } from 'electron';

const logger = createLogger('screenshot');
const SETTLE_DELAY_MS = 1500;
const AFTER_SCRIPT_DELAY_MS = 600;

function wait(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve: () => void): void => {
    setTimeout(resolve, milliseconds);
  });
}

/** Dev helper: optionally run a script in the page (to open a dialog, fill a form), then capture the window to a PNG. */
export async function captureWindowToFile(window: BrowserWindow, outputPath: string, scriptPath: string | undefined): Promise<void> {
  await wait(SETTLE_DELAY_MS);
  if (scriptPath !== undefined) {
    const script = await readFile(scriptPath, 'utf8');
    await window.webContents.executeJavaScript(script, true);
    await wait(AFTER_SCRIPT_DELAY_MS);
  }
  const image = await window.webContents.capturePage();
  await writeFile(outputPath, image.toPNG());
  logger.info('wrote screenshot', outputPath);
}
