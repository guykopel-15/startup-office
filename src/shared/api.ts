import type { AgentEvent, ClaudeAvailability, StartRunInput } from './agents';
import type { LoadStateResult, Snapshot } from './persistence';
import type { RepoStatus, RepoStatusEvent } from './repo';
import type { ApiResponse } from './response';

export interface RepoApi {
  /** Clones (or refreshes) the GitHub repository at `url` for `floorId`. Resolves when the clone has finished. */
  load: (floorId: string, url: string) => Promise<ApiResponse<RepoStatus>>;
  /** Uses a folder already on disk as the repository of `floorId`. */
  useLocal: (floorId: string, path: string) => Promise<ApiResponse<RepoStatus>>;
  getStatus: (floorId: string) => Promise<ApiResponse<RepoStatus>>;
  /** Opens the native folder picker; resolves to the chosen path or null when cancelled. */
  pickFolder: () => Promise<ApiResponse<string | null>>;
  /** Subscribes to status pushes from main; returns the unsubscribe function. */
  onStatus: (listener: (event: RepoStatusEvent) => void) => () => void;
}

export interface AgentsApi {
  /** Locates and verifies the `claude` binary. */
  check: () => Promise<ApiResponse<ClaudeAvailability>>;
  /** Queues a run; resolves with its id. Output arrives through `onEvent`. */
  start: (input: StartRunInput) => Promise<ApiResponse<string>>;
  cancel: (runId: string) => Promise<ApiResponse<null>>;
  onEvent: (listener: (event: AgentEvent) => void) => () => void;
}

export interface StateApi {
  /** The office saved by the last session, or null on a first start. */
  load: () => Promise<ApiResponse<LoadStateResult>>;
  save: (snapshot: Snapshot) => Promise<ApiResponse<null>>;
}

/** Typed bridge exposed on `window.office` by the preload script. Grows with each task. */
export interface OfficeApi {
  version: string;
  /** `darwin`, `win32` or `linux`; the renderer uses it for platform-only layout such as the traffic-light inset. */
  platform: string;
  repo: RepoApi;
  agents: AgentsApi;
  state: StateApi;
}

declare global {
  interface Window {
    office: OfficeApi;
  }
  /** Injected at build time from package.json by electron.vite.config.ts. */
  const __APP_VERSION__: string;
}
