import Phaser from 'phaser';

export enum GameEvent {
  FigureClicked = 'figure:clicked',
}

export interface FigureClickedPayload {
  figureId: string;
}

/** One bus shared by Phaser scenes and React. Phaser emits, React listens, and back. */
export const gameEvents = new Phaser.Events.EventEmitter();
