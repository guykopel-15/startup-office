/** The only place that reads process.env. Everything else asks this module. */
export interface MainConfig {
  rendererUrl: string | undefined;
  screenshotPath: string | undefined;
  isDarwin: boolean;
}

export function readConfig(): MainConfig {
  return {
    rendererUrl: process.env.ELECTRON_RENDERER_URL,
    screenshotPath: process.env.STARTUP_OFFICE_SCREENSHOT,
    isDarwin: process.platform === 'darwin',
  };
}
