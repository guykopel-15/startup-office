import React, { useEffect, useRef } from 'react';
import { createGame } from './createGame';

/**
 * Hosts the Phaser game. Phaser's RESIZE scale mode only watches the window, so a ResizeObserver
 * tells it when the host itself changes size (the HUD growing, the chat history opening).
 */
export function GameCanvas(): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect((): (() => void) | undefined => {
    const host = hostRef.current;
    if (host === null) return undefined;
    const game = createGame(host);
    // refresh() re-reads the parent's size in RESIZE mode; resize() would pin a size and let the canvas outgrow the host.
    const observer = new ResizeObserver((): void => void game.scale.refresh());
    observer.observe(host);
    return (): void => {
      observer.disconnect();
      game.destroy(true);
    };
  }, []);

  return <div ref={hostRef} className="game-canvas" data-testid="game-canvas" tabIndex={-1} />;
}
