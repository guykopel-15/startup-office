import { GameEvent, gameEvents } from './events';

import type { FigureClickedPayload } from './events';

/** Page-script helpers for README captures; installed in dev builds only. */
export interface DevHooks {
  /** Same as releasing the pointer on the figure in the office. */
  clickFigure: (figureId: string) => void;
}

declare global {
  interface Window {
    startupOfficeDev?: DevHooks;
  }
}

export function installDevHooks(): void {
  if (!import.meta.env.DEV) return;
  window.startupOfficeDev = {
    clickFigure: (figureId: string): void => {
      const payload: FigureClickedPayload = { figureId };
      gameEvents.emit(GameEvent.FigureClicked, payload);
    },
  };
}
