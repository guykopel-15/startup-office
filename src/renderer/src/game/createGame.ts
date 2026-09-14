import Phaser from 'phaser';

import { THEME_COLORS } from '@shared/theme';
import { BootScene } from './scenes/BootScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: THEME_COLORS.background,
    pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [BootScene],
  });
}
