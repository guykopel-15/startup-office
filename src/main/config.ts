/** The only place that reads process.env. Everything else asks this module. */
export interface WindowSizeOverride {
  width: number;
  height: number;
}

export interface MainConfig {
  rendererUrl: string | undefined;
  screenshotPath: string | undefined;
  /** Dev only: `WIDTHxHEIGHT` to open the window at a given size for screenshots. */
  windowSize: WindowSizeOverride | undefined;
  isDarwin: boolean;
}

const SIZE_PATTERN = /^(\d+)x(\d+)$/;

function parseWindowSize(raw: string | undefined): WindowSizeOverride | undefined {
  if (raw === undefined) return undefined;
  const match = SIZE_PATTERN.exec(raw);
  if (match === null) return undefined;
  return { width: Number(match[1]), height: Number(match[2]) };
}

export function readConfig(): MainConfig {
  return {
    rendererUrl: process.env.ELECTRON_RENDERER_URL,
    screenshotPath: process.env.STARTUP_OFFICE_SCREENSHOT,
    windowSize: parseWindowSize(process.env.STARTUP_OFFICE_WINDOW),
    isDarwin: process.platform === 'darwin',
  };
}
