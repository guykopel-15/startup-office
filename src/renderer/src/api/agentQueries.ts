import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { RunStatus } from '@shared/agents';
import { FigureState } from '@shared/figures';
import { unwrapResponse } from '@shared/response';
import { useFloorsStore } from '../store/floorsStore';
import { useRunsStore } from '../store/runsStore';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { AgentEvent, AgentRun, ClaudeAvailability, StartRunInput } from '@shared/agents';

export const CLAUDE_AVAILABILITY_QUERY_KEY = ['agents', 'availability'] as const;

/** Whether `claude` is installed and logged in; checked once per app session. */
export function useClaudeAvailability(): UseQueryResult<ClaudeAvailability, Error> {
  return useQuery({
    queryKey: CLAUDE_AVAILABILITY_QUERY_KEY,
    queryFn: async (): Promise<ClaudeAvailability> => unwrapResponse(await window.office.agents.check()),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

const FIGURE_STATE_BY_RUN_STATUS: Readonly<Record<RunStatus, FigureState>> = {
  [RunStatus.Queued]: FigureState.Working,
  [RunStatus.Running]: FigureState.Working,
  [RunStatus.Done]: FigureState.Done,
  [RunStatus.Error]: FigureState.Error,
  [RunStatus.Cancelled]: FigureState.Idle,
};

/** Applies run events to the runs store and mirrors the run status onto the figure. Mount once, in App. */
export function useAgentEventsSubscription(): void {
  useEffect((): (() => void) => {
    return window.office.agents.onEvent((event: AgentEvent): void => {
      useRunsStore.getState().applyEvent(event);
      const run = useRunsStore.getState().runs.find((candidate: AgentRun): boolean => candidate.id === event.runId);
      if (run === undefined || event.type === 'chunk') return;
      useFloorsStore.getState().setFigureState(run.floorId, run.figureId, FIGURE_STATE_BY_RUN_STATUS[event.status]);
    });
  }, []);
}

/** Queues a run in main and registers it locally so events have somewhere to land. */
export function useStartRun(): UseMutationResult<string, Error, StartRunInput> {
  return useMutation({
    mutationFn: async (input: StartRunInput): Promise<string> => {
      const runId = unwrapResponse(await window.office.agents.start(input));
      useRunsStore.getState().registerRun({ id: runId, floorId: input.floorId, figureId: input.figureId, prompt: input.prompt, mode: input.mode });
      return runId;
    },
  });
}

export function useCancelRun(): UseMutationResult<null, Error, string> {
  return useMutation({ mutationFn: async (runId: string): Promise<null> => unwrapResponse(await window.office.agents.cancel(runId)) });
}
