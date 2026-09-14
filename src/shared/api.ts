import type { RepoStatus } from './repo';
import type { ApiResponse } from './response';

export interface RepoApi {
  /** Clones (or refreshes) the repository at `url`. Resolves when the clone has finished. */
  load: (url: string) => Promise<ApiResponse<RepoStatus>>;
  getStatus: () => Promise<ApiResponse<RepoStatus>>;
  /** Subscribes to status pushes from main; returns the unsubscribe function. */
  onStatus: (listener: (status: RepoStatus) => void) => () => void;
}

/** Typed bridge exposed on `window.office` by the preload script. Grows with each task. */
export interface OfficeApi {
  version: string;
  /** `darwin`, `win32` or `linux`; the renderer uses it for platform-only layout such as the traffic-light inset. */
  platform: string;
  repo: RepoApi;
}

declare global {
  interface Window {
    office: OfficeApi;
  }
  /** Injected at build time from package.json by electron.vite.config.ts. */
  const __APP_VERSION__: string;
}
