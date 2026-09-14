/** Typed bridge exposed on `window.office` by the preload script. Grows with each task. */
export interface OfficeApi {
  version: string;
  /** `darwin`, `win32` or `linux`; the renderer uses it for platform-only layout such as the traffic-light inset. */
  platform: string;
}

declare global {
  interface Window {
    office: OfficeApi;
  }
}
