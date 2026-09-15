import { useEffect, useMemo, useState } from 'react';

import { GameEvent, gameEvents } from '../game/events';
import { selectActiveFloor, useFloorsStore } from '../store/floorsStore';
import { selectLatestRun, useRunsStore } from '../store/runsStore';
import { dialogGreeting } from './dialogText';
import { findFigure } from './useGiveTask';

import type { AgentRun } from '@shared/agents';
import type { Figure } from '@shared/figures';
import type { FigureClickedPayload } from '../game/events';
import type { GiveTask } from './useGiveTask';

export enum DialogMode {
  Talk = 'talk',
  Task = 'task',
}

export interface DialogBoxState {
  isOpen: boolean;
  figure: Figure | null;
  greeting: string;
  mode: DialogMode;
  text: string;
  canGiveTasks: boolean;
  setText: (value: string) => void;
  openTask: () => void;
  backToTalk: () => void;
  /** Hands the typed task to the figure and closes the box; nothing happens with empty text. */
  submit: () => void;
  showWork: () => void;
  close: () => void;
}

/** The figure last clicked in the office, until the box is closed. */
function useClickedFigureId(): [string | null, (figureId: string | null) => void] {
  const [figureId, setFigureId] = useState<string | null>(null);
  useEffect((): (() => void) => {
    const handleFigureClicked = (payload: FigureClickedPayload): void => setFigureId(payload.figureId);
    gameEvents.on(GameEvent.FigureClicked, handleFigureClicked);
    return (): void => {
      gameEvents.off(GameEvent.FigureClicked, handleFigureClicked);
    };
  }, []);
  return [figureId, setFigureId];
}

/** NPC dialog state: who is talking, what they say, and the choices. `onShowWork` opens the agent panel. */
export function useDialogBox(giveTask: GiveTask, onShowWork: (figureId: string) => void): DialogBoxState {
  const floor = useFloorsStore(selectActiveFloor);
  const [figureId, setFigureId] = useClickedFigureId();
  const [mode, setMode] = useState<DialogMode>(DialogMode.Talk);
  const [text, setText] = useState('');
  const allRuns = useRunsStore((state): readonly AgentRun[] => state.runs);
  const figure = findFigure(floor, figureId);
  const latestRun = useMemo((): AgentRun | null => selectLatestRun({ runs: allRuns }, floor?.id ?? '', figureId ?? ''), [allRuns, floor?.id, figureId]);
  const greeting = figure === null ? '' : dialogGreeting(figure, latestRun);

  const close = (): void => {
    setFigureId(null);
    setMode(DialogMode.Talk);
    setText('');
  };
  const submit = (): void => {
    if (figure === null || text.trim() === '') return;
    if (giveTask.giveTask(figure.id, text)) close();
  };
  const showWork = (): void => {
    if (figure !== null) onShowWork(figure.id);
    close();
  };
  return {
    isOpen: figure !== null,
    figure,
    greeting,
    mode,
    text,
    canGiveTasks: giveTask.canGiveTasks,
    setText,
    openTask: (): void => setMode(DialogMode.Task),
    backToTalk: (): void => setMode(DialogMode.Talk),
    submit,
    showWork,
    close,
  };
}
