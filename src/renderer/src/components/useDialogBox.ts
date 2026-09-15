import { useEffect, useState } from 'react';

import { findFigure } from '@shared/figures';
import { isBlank } from '@shared/text';
import { GameEvent, gameEvents } from '../game/events';
import { selectActiveFloor, useFloorsStore } from '../store/floorsStore';
import { selectLatestRun, useRunsStore } from '../store/runsStore';
import { dialogGreeting } from './dialogText';

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

export interface DialogBoxCallbacks {
  /** Opens the agent panel on the figure. */
  onShowWork: (figureId: string) => void;
  /** Fires when a figure click opens the box, so the panel can get out of the way. */
  onOpen: () => void;
}

/** What a click opened: the figure, its floor, and what it said at that moment. */
interface OpenedDialog {
  floorId: string;
  figureId: string;
  /** Frozen when the box opens so a streaming run does not restart the typewriter. */
  greeting: string;
}

/** Builds the dialog for a clicked figure from the stores as they are right now. */
function openDialogFor(figureId: string): OpenedDialog | null {
  const floor = selectActiveFloor(useFloorsStore.getState());
  const figure = findFigure(floor?.figures ?? [], figureId);
  if (floor === null || figure === null) return null;
  return { floorId: floor.id, figureId, greeting: dialogGreeting(figure, selectLatestRun(useRunsStore.getState(), floor.id, figureId)) };
}

/** NPC dialog state: who is talking, what they say, and the choices. */
export function useDialogBox(giveTask: GiveTask, callbacks: DialogBoxCallbacks): DialogBoxState {
  const floor = useFloorsStore(selectActiveFloor);
  const [opened, setOpened] = useState<OpenedDialog | null>(null);
  const [mode, setMode] = useState<DialogMode>(DialogMode.Talk);
  const [text, setText] = useState('');
  const { onOpen, onShowWork } = callbacks;

  const close = (): void => {
    setOpened(null);
    setMode(DialogMode.Talk);
    setText('');
  };

  useEffect((): (() => void) => {
    const handleFigureClicked = (payload: FigureClickedPayload): void => {
      const next = openDialogFor(payload.figureId);
      if (next === null) return;
      setOpened(next);
      setMode(DialogMode.Talk);
      setText('');
      onOpen();
    };
    gameEvents.on(GameEvent.FigureClicked, handleFigureClicked);
    return (): void => {
      gameEvents.off(GameEvent.FigureClicked, handleFigureClicked);
    };
  }, [onOpen]);

  // The box belongs to the floor it opened on: switching or closing that floor closes it.
  const isOnActiveFloor = opened !== null && opened.floorId === floor?.id;
  useEffect((): void => {
    if (opened !== null && !isOnActiveFloor) close();
  }, [opened, isOnActiveFloor]);

  const figure = isOnActiveFloor ? findFigure(floor?.figures ?? [], opened.figureId) : null;
  const submit = (): void => {
    if (figure === null || isBlank(text)) return;
    if (giveTask.giveTask(figure.id, text)) close();
  };
  const showWork = (): void => {
    if (figure !== null) onShowWork(figure.id);
    close();
  };
  return {
    isOpen: figure !== null,
    figure,
    greeting: opened?.greeting ?? '',
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
