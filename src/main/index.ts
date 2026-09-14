import { join } from 'node:path';

import { app, BrowserWindow, shell } from 'electron';

import { createLogger } from '../shared/logger';
import { readConfig } from './config';
import { registerRepoController } from './ipc/repoController';
import { killRunningGit } from './services/gitRunner';
import { RepoService } from './services/repoService';
import { captureWindowToFile } from './services/screenshotService';
import {
  APP_ICON_PATH,
  APP_NAME,
  WINDOW_BACKGROUND_COLOR,
  WINDOW_DEFAULT_HEIGHT,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_TITLE,
} from './windowConfig';

const logger = createLogger('main');
const config = readConfig(app.isPackaged);
app.setName(APP_NAME);

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: config.windowSize?.width ?? WINDOW_DEFAULT_WIDTH,
    height: config.windowSize?.height ?? WINDOW_DEFAULT_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    title: WINDOW_TITLE,
    icon: APP_ICON_PATH,
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

  if (config.rendererUrl !== undefined) {
    void mainWindow.loadURL(config.rendererUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
  return mainWindow;
}

function handleActivate(): void {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
}

function handleAllWindowsClosed(): void {
  if (!config.isDarwin) app.quit();
}

async function handleScreenshotRequest(mainWindow: BrowserWindow, outputPath: string): Promise<void> {
  try {
    await captureWindowToFile(mainWindow, outputPath, config.screenshotScriptPath);
  } catch (error: unknown) {
    logger.error('screenshot failed', error);
  }
  app.quit();
}

void app.whenReady().then(() => {
  logger.info('app ready');
  registerRepoController(new RepoService(app.getPath('userData')));
  if (config.isDarwin && !app.isPackaged) app.dock?.setIcon(APP_ICON_PATH);
  const mainWindow = createWindow();
  app.on('activate', handleActivate);
  const { screenshotPath } = config;
  if (screenshotPath === undefined) return;
  mainWindow.webContents.once('did-finish-load', () => {
    void handleScreenshotRequest(mainWindow, screenshotPath);
  });
});

app.on('window-all-closed', handleAllWindowsClosed);
app.on('before-quit', killRunningGit);
