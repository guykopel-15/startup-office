import Phaser from 'phaser';

import { GAME_FONT_FAMILY, THEME_COLORS } from '@shared/theme';

export const BOOT_SCENE_KEY = 'boot';
const TITLE_TEXT = 'STARTUP OFFICE';
const SUBTITLE_TEXT = 'office map coming in task 2';
const TITLE_FONT_SIZE = '32px';
const SUBTITLE_FONT_SIZE = '14px';
const SUBTITLE_OFFSET_Y = 40;
const CENTER_ORIGIN = 0.5;

/** Empty starting scene. Task 2 replaces this with the office map. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(BOOT_SCENE_KEY);
  }

  create(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.add
      .text(centerX, centerY, TITLE_TEXT, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: TITLE_FONT_SIZE,
        color: THEME_COLORS.accent,
      })
      .setOrigin(CENTER_ORIGIN);
    this.add
      .text(centerX, centerY + SUBTITLE_OFFSET_Y, SUBTITLE_TEXT, {
        fontFamily: GAME_FONT_FAMILY,
        fontSize: SUBTITLE_FONT_SIZE,
        color: THEME_COLORS.muted,
      })
      .setOrigin(CENTER_ORIGIN);
  }
}
