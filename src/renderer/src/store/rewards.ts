import { RunStatus } from '@shared/agents';
import { DAMAGE_PER_FAILED_RUN, XP_PER_DONE_RUN } from '@shared/experience';
import { findFigure } from '@shared/figures';
import { GameEvent, gameEvents } from '../game/events';
import { selectFloor, useFloorsStore } from './floorsStore';
import { useTasksStore } from './tasksStore';

import type { AgentRun } from '@shared/agents';
import type { FigureHitPayload, FigureLeveledUpPayload, FigureRewardedPayload } from '../game/events';

const LEVEL_UP_PREFIX = 'Level up! I am level ';
const LEVEL_UP_SUFFIX = ' now.';

/** A finished run pays out: XP (and maybe a level) when it ended well, damage when its quest failed. */
export function rewardRun(run: AgentRun): void {
  const floor = selectFloor(useFloorsStore.getState(), run.floorId);
  const figure = findFigure(floor?.figures ?? [], run.figureId);
  if (floor === null || figure === null) return;
  if (run.status === RunStatus.Done) {
    const previousLevel = figure.level;
    const leveled = useFloorsStore.getState().awardExperience(floor.id, figure.id, XP_PER_DONE_RUN);
    const rewarded: FigureRewardedPayload = { floorId: floor.id, figureId: figure.id, points: XP_PER_DONE_RUN };
    gameEvents.emit(GameEvent.FigureRewarded, rewarded);
    if (leveled !== null && leveled.level > previousLevel) celebrateLevel(floor.id, figure.id, leveled.level);
    return;
  }
  if (run.status === RunStatus.Error) {
    useFloorsStore.getState().awardExperience(floor.id, figure.id, -DAMAGE_PER_FAILED_RUN);
    const hit: FigureHitPayload = { floorId: floor.id, figureId: figure.id, amount: DAMAGE_PER_FAILED_RUN };
    gameEvents.emit(GameEvent.FigureHit, hit);
  }
}

function celebrateLevel(floorId: string, figureId: string, level: number): void {
  useTasksStore.getState().addMessage({ floorId, authorId: figureId, text: `${LEVEL_UP_PREFIX}${level}${LEVEL_UP_SUFFIX}` });
  const payload: FigureLeveledUpPayload = { floorId, figureId, level };
  gameEvents.emit(GameEvent.FigureLeveledUp, payload);
}
