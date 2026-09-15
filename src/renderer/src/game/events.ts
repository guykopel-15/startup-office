import Phaser from 'phaser';

export enum GameEvent {
  FigureClicked = 'figure:clicked',
  /** React asks the office to show a line over a figure (a sprint part, a greeting). */
  FigureSays = 'figure:says',
  /** A sprint closed on the active floor: confetti time. */
  SprintClosed = 'sprint:closed',
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

/** One bus shared by Phaser scenes and React. Phaser emits, React listens, and back. */
export const gameEvents = new Phaser.Events.EventEmitter();
