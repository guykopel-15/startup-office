import Phaser from 'phaser';

import { OFFICE_SCENE_KEY } from './OfficeScene';

export const BOOT_SCENE_KEY = 'boot';

/** Hands off to the office. Asset preloading lands here when external assets arrive. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(BOOT_SCENE_KEY);
  }

  create(): void {
    this.scene.start(OFFICE_SCENE_KEY);
  }
}
