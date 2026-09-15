import { useState } from 'react';

import { routeTask } from '@shared/tasks';
import { selectActiveFigures, useFloorsStore } from '../store/floorsStore';

import type { Figure } from '@shared/figures';
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
const CANNOT_START_HINT = 'Needs Claude Code and a repository on this floor.';

/** The chat box in the HUD: type an ask, it goes to the right figure. */
export function useHudChat(giveTask: GiveTask): HudChatState {
  const figures = useFloorsStore(selectActiveFigures);
  const [text, setText] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const send = (): void => {
    const routed = routeTask(text, figures as readonly Figure[]);
    if (routed === null) {
      if (text.trim() !== '') setHint(NOBODY_HINT);
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

  return { text, hint, isExpanded, setText, send, toggleExpanded: (): void => setIsExpanded(!isExpanded) };
}
