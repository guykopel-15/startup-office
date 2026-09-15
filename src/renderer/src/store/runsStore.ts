import { create } from 'zustand';

import { RunStatus } from '@shared/agents';

import type { StoreApi } from 'zustand';

import type { AgentEvent, AgentRun, RunMode } from '@shared/agents';

export interface RegisterRunInput {
  id: string;
  floorId: string;
  figureId: string;
  prompt: string;
  mode: RunMode;
}

export interface RunsState {
  /** Newest last. */
  runs: AgentRun[];
  /** Floors whose figures already got their intake run, so it never fires twice. */
  intakeStartedFloorIds: string[];
  registerRun: (input: RegisterRunInput) => void;
  applyEvent: (event: AgentEvent) => void;
  markIntakeStarted: (floorId: string) => void;
  clearFloor: (floorId: string) => void;
}

/** Keep memory bounded: the panel shows the tail anyway. */
export const MAX_LINES_PER_RUN = 400;
const EMPTY_RUNS: readonly AgentRun[] = [];

function patchRun(runs: readonly AgentRun[], runId: string, patch: (run: AgentRun) => AgentRun): AgentRun[] {
  return runs.map((run: AgentRun): AgentRun => (run.id === runId ? patch(run) : run));
}

function applyToRun(run: AgentRun, event: AgentEvent): AgentRun {
  switch (event.type) {
    case 'status':
      return { ...run, status: event.status };
    case 'chunk':
      return { ...run, lines: [...run.lines, event.text].slice(-MAX_LINES_PER_RUN) };
    case 'done':
      return { ...run, status: event.status, result: event.result, error: event.error, costUsd: event.costUsd, turns: event.turns, endedAt: new Date().toISOString() };
  }
}

export function selectRunsForFigure(state: { runs: readonly AgentRun[] }, floorId: string, figureId: string): readonly AgentRun[] {
  const runs = state.runs.filter((run: AgentRun): boolean => run.floorId === floorId && run.figureId === figureId);
  return runs.length === 0 ? EMPTY_RUNS : runs;
}

export function selectLatestRun(state: { runs: readonly AgentRun[] }, floorId: string, figureId: string): AgentRun | null {
  const runs = selectRunsForFigure(state, floorId, figureId);
  return runs[runs.length - 1] ?? null;
}

export function isRunActive(run: AgentRun | null): boolean {
  return run !== null && (run.status === RunStatus.Queued || run.status === RunStatus.Running);
}

export const useRunsStore = create<RunsState>((set: StoreApi<RunsState>['setState'], get: StoreApi<RunsState>['getState']): RunsState => ({
  runs: [],
  intakeStartedFloorIds: [],
  registerRun: (input: RegisterRunInput): void => {
    const run: AgentRun = { ...input, status: RunStatus.Queued, lines: [], result: null, error: null, costUsd: null, turns: null, startedAt: new Date().toISOString(), endedAt: null };
    set({ runs: [...get().runs, run] });
  },
  applyEvent: (event: AgentEvent): void => {
    set({ runs: patchRun(get().runs, event.runId, (run: AgentRun): AgentRun => applyToRun(run, event)) });
  },
  markIntakeStarted: (floorId: string): void => {
    if (!get().intakeStartedFloorIds.includes(floorId)) set({ intakeStartedFloorIds: [...get().intakeStartedFloorIds, floorId] });
  },
  clearFloor: (floorId: string): void => {
    set({ runs: get().runs.filter((run: AgentRun): boolean => run.floorId !== floorId), intakeStartedFloorIds: get().intakeStartedFloorIds.filter((id: string): boolean => id !== floorId) });
  },
}));
