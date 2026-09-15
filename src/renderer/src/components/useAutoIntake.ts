import { useEffect } from 'react';

import { RunMode, buildIntakePrompt } from '@shared/agents';
import { FloorSetupStep } from '@shared/floors';
import { RepoState } from '@shared/repo';
import { useStartRun } from '../api/agentQueries';
import { useFloorsStore } from '../store/floorsStore';
import { useRunsStore } from '../store/runsStore';

import type { Figure } from '@shared/figures';
import type { Floor } from '@shared/floors';

/** True once a floor's repo is on disk and its team is hired. */
export function isFloorReadyForIntake(floor: Floor): boolean {
  return floor.setup.step === FloorSetupStep.Ready && floor.repoStatus.state === RepoState.Ready && floor.repoStatus.path !== null && floor.figures.length > 0;
}

/**
 * When a floor becomes ready, every figure reads the repo from its role's point of view, once.
 * Runs are queued in main, a few at a time. Mount once, in App.
 */
export function useAutoIntake(isClaudeAvailable: boolean): void {
  const floors = useFloorsStore((state): Floor[] => state.floors);
  const startRun = useStartRun();
  const { mutate } = startRun;

  useEffect((): void => {
    if (!isClaudeAvailable) return;
    floors.filter(isFloorReadyForIntake).forEach((floor: Floor): void => {
      const { intakeStartedFloorIds, markIntakeStarted } = useRunsStore.getState();
      if (intakeStartedFloorIds.includes(floor.id)) return;
      markIntakeStarted(floor.id);
      floor.figures.forEach((figure: Figure): void => {
        mutate({ floorId: floor.id, figureId: figure.id, cwd: floor.repoStatus.path ?? '', prompt: buildIntakePrompt(figure.rolePrompt, figure.job), mode: RunMode.ReadOnly });
      });
    });
  }, [floors, isClaudeAvailable, mutate]);
}
