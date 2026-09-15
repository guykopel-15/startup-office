import Phaser from 'phaser';

import { FigureState } from '@shared/figures';
import { findWalkPath, meetingSpots, roomTiles, tileCenter } from '../world/navigation';

import type { RoomKey } from '@shared/figures';
import type { Furniture } from '../world/furniture';
import type { GridPoint } from '../world/isoProjection';
import type { WalkableGrid } from '../world/navigation';
import type { FigureSprite } from './FigureSprite';

/** How a figure is spending its time away from (or at) its desk. */
enum Errand {
  AtDesk = 'atDesk',
  Wandering = 'wandering',
  Returning = 'returning',
  Meeting = 'meeting',
}

interface Actor {
  sprite: FigureSprite;
  room: RoomKey;
  seat: GridPoint;
  state: FigureState;
  errand: Errand;
  dwellTimer: Phaser.Time.TimerEvent | null;
}

const WANDER_TICK_MS = 5000;
/** Chance per tick that some idle figure gets up. */
const WANDER_CHANCE = 0.6;
const DWELL_MIN_MS = 2500;
const DWELL_MAX_MS = 6000;

/**
 * Decides where figures go: idle ones stretch their legs inside their own room, a `meeting`
 * state sends everyone to the meeting table, and work pulls a figure back to its desk.
 */
export class FigureDirector {
  private readonly scene: Phaser.Scene;
  private readonly grid: WalkableGrid;
  private readonly spots: readonly GridPoint[];
  private readonly actors = new Map<string, Actor>();
  private wanderTimer: Phaser.Time.TimerEvent | null;

  constructor(scene: Phaser.Scene, grid: WalkableGrid, furniture: readonly Furniture[]) {
    this.scene = scene;
    this.grid = grid;
    this.spots = meetingSpots(furniture);
    this.wanderTimer = scene.time.addEvent({ delay: WANDER_TICK_MS, loop: true, callback: this.handleWanderTick, callbackScope: this });
  }

  add(figureId: string, sprite: FigureSprite, room: RoomKey, seat: GridPoint, state: FigureState): void {
    this.actors.set(figureId, { sprite, room, seat, state, errand: Errand.AtDesk, dwellTimer: null });
    this.setState(figureId, state);
  }

  remove(figureId: string): void {
    this.actors.get(figureId)?.dwellTimer?.remove();
    this.actors.delete(figureId);
  }

  /** Reacts to a state change: meetings send the figure to the table, anything else brings it home. */
  setState(figureId: string, state: FigureState): void {
    const actor = this.actors.get(figureId);
    if (actor === undefined) return;
    actor.state = state;
    actor.sprite.setState(state);
    if (state === FigureState.Meeting) {
      this.goToMeeting(figureId, actor);
      return;
    }
    if (actor.errand !== Errand.AtDesk) this.goHome(actor);
  }

  destroy(): void {
    this.wanderTimer?.remove();
    this.wanderTimer = null;
    this.actors.forEach((actor: Actor): void => actor.dwellTimer?.remove());
    this.actors.clear();
  }

  private goToMeeting(figureId: string, actor: Actor): void {
    actor.dwellTimer?.remove();
    actor.dwellTimer = null;
    const index = Array.from(this.actors.keys()).indexOf(figureId);
    const spot = this.spots[Math.min(index, this.spots.length - 1)];
    if (spot === undefined) return;
    actor.errand = Errand.Meeting;
    this.walk(actor, spot, (): void => undefined);
  }

  private goHome(actor: Actor): void {
    actor.dwellTimer?.remove();
    actor.dwellTimer = null;
    actor.errand = Errand.Returning;
    this.walk(actor, actor.seat, (): void => {
      actor.errand = Errand.AtDesk;
    });
  }

  /** Paths through the grid; an unreachable target just keeps the figure where it is. */
  private walk(actor: Actor, to: GridPoint, onArrive: () => void): void {
    const path = findWalkPath(this.grid, actor.sprite.feet, to);
    if (path === null) {
      actor.errand = Errand.AtDesk;
      return;
    }
    actor.sprite.walkTo(path, onArrive);
  }

  private handleWanderTick(): void {
    if (Math.random() > WANDER_CHANCE) return;
    const candidates = Array.from(this.actors.values()).filter(this.canWander);
    const actor = candidates[Phaser.Math.Between(0, candidates.length - 1)];
    if (actor === undefined) return;
    const tiles = roomTiles(this.grid, actor.room);
    const tile = tiles[Phaser.Math.Between(0, tiles.length - 1)];
    if (tile === undefined) return;
    actor.errand = Errand.Wandering;
    this.walk(actor, tileCenter(tile), (): void => this.dwell(actor));
  }

  private readonly canWander = (actor: Actor): boolean => {
    const isFree = actor.state === FigureState.Idle || actor.state === FigureState.Done || actor.state === FigureState.Error;
    return isFree && actor.errand === Errand.AtDesk && !actor.sprite.isWalking;
  };

  private dwell(actor: Actor): void {
    actor.dwellTimer = this.scene.time.delayedCall(Phaser.Math.Between(DWELL_MIN_MS, DWELL_MAX_MS), (): void => this.goHome(actor));
  }
}
