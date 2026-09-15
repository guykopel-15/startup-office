import Phaser from 'phaser';

export enum GameEvent {
  FigureClicked = 'figure:clicked',
  /** React asks the office to show a line over a figure (a sprint part, a greeting). */
  FigureSays = 'figure:says',
  /** A sprint closed on the active floor: confetti time. */
  SprintClosed = 'sprint:closed',
  /** A run ended well: XP floats up over the figure. */
  FigureRewarded = 'figure:rewarded',
  /** A quest failed: damage numbers over the figure. */
  FigureHit = 'figure:hit',
  FigureLeveledUp = 'figure:leveledUp',
}

export interface FigureClickedPayload {
  figureId: string;
}

export interface FigureSaysPayload {
  floorId: string;
  figureId: string;
  text: string;
}

export interface SprintClosedPayload {
  floorId: string;
}

export interface FigureRewardedPayload {
  floorId: string;
  figureId: string;
  points: number;
}

export interface FigureHitPayload {
  floorId: string;
  figureId: string;
  amount: number;
}

export interface FigureLeveledUpPayload {
  floorId: string;
  figureId: string;
  level: number;
}

/** One bus shared by Phaser scenes and React. Phaser emits, React listens, and back. */
export const gameEvents = new Phaser.Events.EventEmitter();
