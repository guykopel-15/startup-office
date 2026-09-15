import { useEffect, useState } from 'react';

export interface Typewriter {
  shown: string;
  isDone: boolean;
  /** Reveals the whole text at once (a click on the dialog). */
  skip: () => void;
}

const CHARACTER_MS = 14;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface Progress {
  text: string;
  shownLength: number;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Reveals `text` one character at a time, like an NPC dialog; restarts when the text changes. */
export function useTypewriter(text: string): Typewriter {
  const characters = Array.from(text);
  const [progress, setProgress] = useState<Progress>({ text, shownLength: 0 });
  // Keyed on the text so a new line never shows the old reveal length for a frame.
  const shownLength = progress.text === text ? progress.shownLength : 0;
  const isDone = shownLength >= characters.length;

  useEffect((): (() => void) | undefined => {
    if (prefersReducedMotion()) {
      setProgress({ text, shownLength: Array.from(text).length });
      return undefined;
    }
    setProgress({ text, shownLength: 0 });
    let revealed = 0;
    const total = Array.from(text).length;
    const timer = window.setInterval((): void => {
      revealed += 1;
      setProgress({ text, shownLength: revealed });
      if (revealed >= total) window.clearInterval(timer);
    }, CHARACTER_MS);
    return (): void => window.clearInterval(timer);
  }, [text]);

  return { shown: characters.slice(0, shownLength).join(''), isDone, skip: (): void => setProgress({ text, shownLength: characters.length }) };
}
