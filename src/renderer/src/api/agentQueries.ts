import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { RunStatus } from '@shared/agents';
import { FigureState } from '@shared/figures';
import { SprintStatus } from '@shared/sprints';
import { unwrapResponse } from '@shared/response';
import { useFloorsStore } from '../store/floorsStore';
import { rewardRun } from '../store/rewards';
import { useRunsStore } from '../store/runsStore';
import { selectSprintForFloor, useSprintsStore } from '../store/sprintsStore';
import { useTasksStore } from '../store/tasksStore';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { AgentEvent, AgentRun, ClaudeAvailability, StartRunInput } from '@shared/agents';

export const CLAUDE_AVAILABILITY_QUERY_KEY = ['agents', 'availability'] as const;

/** What the renderer starts: the main-process input plus the quest or the sprint planning the run belongs to. */
export interface StartRunRequest extends StartRunInput {
  taskId?: string;
  sprintId?: string;
}

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

function isFloorInMeeting(floorId: string): boolean {
  return selectSprintForFloor(useSprintsStore.getState(), floorId)?.status === SprintStatus.Planning;
}

/** Applies run events to the runs store, mirrors the run status onto the figure, closes its task and pays out XP. Mount once, in App. */
export function useAgentEventsSubscription(): void {
  useEffect((): (() => void) => {
    return window.office.agents.onEvent((event: AgentEvent): void => {
      useRunsStore.getState().applyEvent(event);
      const run = useRunsStore.getState().runs.find((candidate: AgentRun): boolean => candidate.id === event.runId);
      if (run === undefined || event.type === 'chunk') return;
      // During a planning meeting everyone stays at the table; the plan decides who works next.
      if (!isFloorInMeeting(run.floorId)) useFloorsStore.getState().setFigureState(run.floorId, run.figureId, FIGURE_STATE_BY_RUN_STATUS[event.status]);
      if (event.type !== 'done') return;
      useTasksStore.getState().finishRun(run);
      rewardRun(run);
    });
  }, []);
}

/**
 * Queues a run in main and registers it locally so events have somewhere to land. A quest's task
 * (or a sprint's planning run) is attached in the same tick as the registration, so a `done` event can never outrun it.
 */
export function useStartRun(): UseMutationResult<string, Error, StartRunRequest> {
  return useMutation({
    mutationFn: async ({ taskId, sprintId, ...input }: StartRunRequest): Promise<string> => {
      const runId = unwrapResponse(await window.office.agents.start(input));
      useRunsStore.getState().registerRun({ id: runId, floorId: input.floorId, figureId: input.figureId, prompt: input.prompt, mode: input.mode });
      if (taskId !== undefined) useTasksStore.getState().attachRun(taskId, runId);
      if (sprintId !== undefined) useSprintsStore.getState().attachPlanRun(sprintId, runId);
      return runId;
    },
  });
}

export function useCancelRun(): UseMutationResult<null, Error, string> {
  return useMutation({ mutationFn: async (runId: string): Promise<null> => unwrapResponse(await window.office.agents.cancel(runId)) });
}
