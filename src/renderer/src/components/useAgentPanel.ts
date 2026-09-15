import { useMemo, useState } from 'react';

import { RunMode, buildIntakePrompt, buildTaskPrompt } from '@shared/agents';
import { findFigure } from '@shared/figures';
import { isBlank } from '@shared/text';
import { useCancelRun, useStartRun } from '../api/agentQueries';
import { selectActiveFloor, useFloorsStore } from '../store/floorsStore';
import { isRunActive, selectRunsForFigure, useRunsStore } from '../store/runsStore';

import type { AgentRun } from '@shared/agents';
import type { Figure } from '@shared/figures';
import type { Floor } from '@shared/floors';

export interface AgentPanelState {
  floor: Floor | null;
  figure: Figure | null;
  figures: readonly Figure[];
  runs: readonly AgentRun[];
  latestRun: AgentRun | null;
  isBusy: boolean;
  /** The repo must be on disk before a run can start. */
  canRun: boolean;
  task: string;
  isOpen: boolean;
  selectFigure: (figureId: string) => void;
  setTask: (value: string) => void;
  setRolePrompt: (value: string) => void;
  runIntake: () => void;
  runTask: () => void;
  stop: () => void;
  close: () => void;
}

interface PanelContext {
  floor: Floor | null;
  figure: Figure | null;
  latestRun: AgentRun | null;
  task: string;
  start: (prompt: string) => void;
  cancel: (runId: string) => void;
  setRolePromptInStore: (floorId: string, figureId: string, rolePrompt: string) => void;
  setTask: (value: string) => void;
  setFigureId: (figureId: string | null) => void;
}

/** The actions the panel exposes, built from the current context. */
function panelActions(context: PanelContext): Pick<AgentPanelState, 'selectFigure' | 'setTask' | 'setRolePrompt' | 'runIntake' | 'runTask' | 'stop' | 'close'> {
  const { floor, figure, latestRun, task } = context;
  return {
    selectFigure: context.setFigureId,
    setTask: context.setTask,
    setRolePrompt: (value: string): void => {
      if (floor !== null && figure !== null) context.setRolePromptInStore(floor.id, figure.id, value);
    },
    runIntake: (): void => {
      if (figure !== null) context.start(buildIntakePrompt(figure.rolePrompt, figure.job));
    },
    runTask: (): void => {
      if (figure === null || isBlank(task)) return;
      context.start(buildTaskPrompt(figure.rolePrompt, figure.job, task));
      context.setTask('');
    },
    stop: (): void => {
      if (latestRun !== null && isRunActive(latestRun)) context.cancel(latestRun.id);
    },
    close: (): void => context.setFigureId(null),
  };
}

/** Panel state: which figure is open, its runs, and the actions. */
export function useAgentPanel(isClaudeAvailable: boolean): AgentPanelState {
  const floor = useFloorsStore(selectActiveFloor);
  const setRolePromptInStore = useFloorsStore((state): typeof state.setRolePrompt => state.setRolePrompt);
  // Opened from the dialog box's "Show your work", the Agents button or the select; figure clicks open the dialog box.
  const [figureId, setFigureId] = useState<string | null>(null);
  const [task, setTask] = useState('');
  const startRun = useStartRun();
  const cancelRun = useCancelRun();
  const floorId = floor?.id ?? '';
  // Select the stable array and derive in a memo: a selector that builds a new array each call would re-render forever.
  const allRuns = useRunsStore((state): readonly AgentRun[] => state.runs);
  const runs = useMemo((): readonly AgentRun[] => selectRunsForFigure({ runs: allRuns }, floorId, figureId ?? ''), [allRuns, floorId, figureId]);
  const latestRun = runs[runs.length - 1] ?? null;

  const figures = floor?.figures ?? [];
  const figure = findFigure(figures, figureId);
  const cwd = floor?.repoStatus.path ?? null;
  const isBusy = isRunActive(latestRun);
  const canRun = isClaudeAvailable && floor !== null && figure !== null && cwd !== null && !isBusy;
  const start = (prompt: string): void => {
    if (floor !== null && figure !== null && cwd !== null) startRun.mutate({ floorId: floor.id, figureId: figure.id, cwd, prompt, mode: RunMode.ReadOnly });
  };
  const actions = panelActions({ floor, figure, latestRun, task, start, cancel: cancelRun.mutate, setRolePromptInStore, setTask, setFigureId });
  return { floor, figure, figures, runs, latestRun, isBusy, canRun, task, isOpen: figure !== null, ...actions };
}
