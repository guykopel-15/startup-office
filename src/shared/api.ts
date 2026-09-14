/** Typed bridge exposed on `window.office` by the preload script. Grows with each task. */
export interface OfficeApi {
  version: string;
}

declare global {
  interface Window {
    office: OfficeApi;
  }
}
