import React, { useEffect, useRef } from 'react';
import { createGame } from './createGame';

export function GameCanvas(): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = createGame(host);
    return () => game.destroy(true);
  }, []);

  return <div ref={hostRef} className="game-canvas" data-testid="game-canvas" tabIndex={-1} />;
}
