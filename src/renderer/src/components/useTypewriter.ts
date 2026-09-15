import { useEffect, useState } from 'react';

const CHARACTER_MS = 14;

/** Reveals `text` one character at a time, like an NPC dialog; restarts when the text changes. */
export function useTypewriter(text: string): string {
  const [shownLength, setShownLength] = useState(0);

  useEffect((): (() => void) => {
    setShownLength(0);
    const characters = Array.from(text);
    let revealed = 0;
    const timer = window.setInterval((): void => {
      revealed += 1;
      setShownLength(revealed);
      if (revealed >= characters.length) window.clearInterval(timer);
    }, CHARACTER_MS);
    return (): void => window.clearInterval(timer);
  }, [text]);

  return Array.from(text).slice(0, shownLength).join('');
}
