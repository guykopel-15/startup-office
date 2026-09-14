import Phaser from 'phaser';

import { THEME_COLORS } from '@shared/theme';
import { drawIsoOffice } from '../world/drawIsoOffice';
import { PLAN_HEIGHT, PLAN_WIDTH } from '../world/floorPlan';
import { getScreenBounds } from '../world/isoProjection';

export const OFFICE_SCENE_KEY = 'office';
const WORLD_WIDTH = 640;
const WORLD_HEIGHT = 360;
const BACKGROUND_TOP = 0x1a1330;
const BACKGROUND_BOTTOM = 0x0e0a1a;
const VIGNETTE_ALPHA = 0.25;
const OFFICE_VERTICAL_SHIFT = -6;
const HALF = 0.5;

/** The whole floor plan on one screen. The camera fits the world to the window. */
export class OfficeScene extends Phaser.Scene {
  constructor() {
    super(OFFICE_SCENE_KEY);
  }

  create(): void {
    this.drawBackground();
    const office = drawIsoOffice(this);
    const bounds = getScreenBounds([
      { gx: 0, gy: 0 },
      { gx: PLAN_WIDTH, gy: 0 },
      { gx: PLAN_WIDTH, gy: PLAN_HEIGHT },
      { gx: 0, gy: PLAN_HEIGHT },
    ]);
    office.setPosition(WORLD_WIDTH * HALF - (bounds.minX + bounds.maxX) * HALF, WORLD_HEIGHT * HALF - (bounds.minY + bounds.maxY) * HALF + OFFICE_VERTICAL_SHIFT);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }

  private handleResize(): void {
    this.fitCamera();
  }

  private fitCamera(): void {
    const zoom = Math.min(this.scale.width / WORLD_WIDTH, this.scale.height / WORLD_HEIGHT);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(WORLD_WIDTH * HALF, WORLD_HEIGHT * HALF);
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(BACKGROUND_TOP, BACKGROUND_TOP, BACKGROUND_BOTTOM, BACKGROUND_BOTTOM, 1).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    graphics.fillStyle(Phaser.Display.Color.HexStringToColor(THEME_COLORS.background).color, VIGNETTE_ALPHA).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }
}
