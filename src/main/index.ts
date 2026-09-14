import { join } from 'node:path';

import { app, BrowserWindow, shell } from 'electron';

import { createLogger } from '../shared/logger';
import {
  WINDOW_BACKGROUND_COLOR,
  WINDOW_DEFAULT_HEIGHT,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_TITLE,
} from './windowConfig';

const logger = createLogger('main');

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    title: WINDOW_TITLE,
    backgroundColor: WINDOW_BACKGROUND_COLOR,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl !== undefined) {
    void mainWindow.loadURL(rendererUrl);
    return;
  }
  void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
}

function handleActivate(): void {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
}

function handleAllWindowsClosed(): void {
  if (process.platform !== 'darwin') app.quit();
}

void app.whenReady().then(() => {
  logger.info('app ready');
  createWindow();
  app.on('activate', handleActivate);
});

app.on('window-all-closed', handleAllWindowsClosed);
