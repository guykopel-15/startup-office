import { useEffect, useState } from 'react';

import { routeTask } from '@shared/tasks';
import { isBlank } from '@shared/text';
import { selectActiveFigures, useFloorsStore } from '../store/floorsStore';
import { CANNOT_START_HINT } from './useGiveTask';

import type { GiveTask } from './useGiveTask';

export interface HudChatState {
  text: string;
  hint: string | null;
  isExpanded: boolean;
  setText: (value: string) => void;
  /** Routes the text to a figure and hands it over; clears the box on success. */
  send: () => void;
  toggleExpanded: () => void;
}

const NOBODY_HINT = 'Nobody is on this floor to ask.';
const MENTION_ONLY_HINT = 'Say what to do after the @name.';

/** The chat box in the HUD: type an ask, it goes to the right figure. The draft belongs to the floor it was typed on. */
export function useHudChat(giveTask: GiveTask): HudChatState {
  const floorId = useFloorsStore((state): string | null => state.activeFloorId);
  const figures = useFloorsStore(selectActiveFigures);
  const [text, setText] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect((): void => {
    setText('');
    setHint(null);
  }, [floorId]);

  const handleTextChange = (value: string): void => {
    setText(value);
    setHint(null);
  };

  const send = (): void => {
    if (isBlank(text)) return;
    const routed = routeTask(text, figures);
    if (routed === null) {
      setHint(figures.length === 0 ? NOBODY_HINT : MENTION_ONLY_HINT);
      return;
    }
    if (!giveTask.giveTask(routed.assigneeId, routed.title)) {
      setHint(CANNOT_START_HINT);
      return;
    }
    setHint(null);
    setText('');
    setIsExpanded(true);
  };

  return { text, hint, isExpanded, setText: handleTextChange, send, toggleExpanded: (): void => setIsExpanded(!isExpanded) };
}
