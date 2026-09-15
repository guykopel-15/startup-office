import { vi } from 'vitest';

vi.mock('phaser', async (): Promise<object> => (await import('../test/phaserMock')).phaserMock());

import { RunMode, RunStatus } from '@shared/agents';
import { DAMAGE_PER_FAILED_RUN, XP_PER_DONE_RUN } from '@shared/experience';
import { DEFAULT_FIGURES } from '@shared/figures';
import { GameEvent, gameEvents } from '../game/events';
import { installOfficeMock, lastMessageText, seedReadyFloor } from '../test/officeMock';
import { useFloorsStore } from './floorsStore';
import { rewardRun } from './rewards';

import type { AgentRun } from '@shared/agents';
import type { Figure } from '@shared/figures';

let floorId = '';

function figure(): Figure {
  const found = useFloorsStore.getState().floors[0]?.figures[0];
  if (found === undefined) throw new Error('no figure');
  return found;
}

function run(status: RunStatus): AgentRun {
  return { id: 'r', floorId, figureId: 'frontend', prompt: 'p', mode: RunMode.ReadOnly, status, lines: [], result: null, error: null, costUsd: null, turns: null, startedAt: '', endedAt: null };
}

beforeEach((): void => {
  installOfficeMock();
  floorId = seedReadyFloor(DEFAULT_FIGURES.slice(0, 1));
});

describe('rewardRun', (): void => {
  it('pays XP for a finished run, levels the figure up at the threshold, and announces it', (): void => {
    const rewarded = vi.fn();
    const leveled = vi.fn();
    gameEvents.on(GameEvent.FigureRewarded, rewarded);
    gameEvents.on(GameEvent.FigureLeveledUp, leveled);
    rewardRun(run(RunStatus.Done));
    expect(figure()).toMatchObject({ experiencePoints: XP_PER_DONE_RUN, level: 1 });
    expect(rewarded).toHaveBeenCalledWith({ floorId, figureId: 'frontend', points: XP_PER_DONE_RUN });
    expect(leveled).not.toHaveBeenCalled();
    rewardRun(run(RunStatus.Done));
    expect(figure()).toMatchObject({ experiencePoints: 2 * XP_PER_DONE_RUN, level: 2 });
    expect(leveled).toHaveBeenCalledWith({ floorId, figureId: 'frontend', level: 2 });
    expect(lastMessageText()).toBe('Level up! I am level 2 now.');
    gameEvents.off(GameEvent.FigureRewarded, rewarded);
    gameEvents.off(GameEvent.FigureLeveledUp, leveled);
  });

  it('takes damage on a failed run without dropping below zero or losing a level, and ignores cancelled runs', (): void => {
    const hit = vi.fn();
    gameEvents.on(GameEvent.FigureHit, hit);
    rewardRun(run(RunStatus.Error));
    expect(figure().experiencePoints).toBe(0);
    expect(hit).toHaveBeenCalledWith({ floorId, figureId: 'frontend', amount: DAMAGE_PER_FAILED_RUN });
    rewardRun(run(RunStatus.Done));
    rewardRun(run(RunStatus.Done));
    rewardRun(run(RunStatus.Error));
    expect(figure()).toMatchObject({ experiencePoints: 2 * XP_PER_DONE_RUN - DAMAGE_PER_FAILED_RUN, level: 2 });
    rewardRun(run(RunStatus.Cancelled));
    expect(hit).toHaveBeenCalledTimes(2);
    gameEvents.off(GameEvent.FigureHit, hit);
  });
});
