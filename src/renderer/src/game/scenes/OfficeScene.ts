import Phaser from 'phaser';

import { DEFAULT_FIGURES } from '@shared/figures';
import { THEME_COLORS } from '@shared/theme';
import { FigureSprite } from '../entities/FigureSprite';
import { getDeskForFigure, getDesks, getFixedFurniture, getSeatPoint } from '../world/desks';
import { drawFurniture } from '../world/drawFurniture';
import { drawIsoOffice } from '../world/drawIsoOffice';
import { PLAN_HEIGHT, PLAN_WIDTH } from '../world/floorPlan';
import { getScreenBounds, projectToScreen } from '../world/isoProjection';

import type { Figure } from '@shared/figures';
import type { ScreenPoint } from '../world/isoProjection';

export const OFFICE_SCENE_KEY = 'office';
const WORLD_WIDTH = 640;
const WORLD_HEIGHT = 360;
const BACKGROUND_TOP = 0x1a1330;
const BACKGROUND_BOTTOM = 0x0e0a1a;
const VIGNETTE_ALPHA = 0.25;
const OFFICE_VERTICAL_SHIFT = -6;
const DEPTH_BACKGROUND = -2000;
const HALF = 0.5;

/** The whole floor plan on one screen. The camera fits the world to the window. */
export class OfficeScene extends Phaser.Scene {
  private figureSprites: FigureSprite[] = [];

  constructor() {
    super(OFFICE_SCENE_KEY);
  }

  create(): void {
    this.drawBackground();
    const origin = getOfficeOrigin();
    drawIsoOffice(this, origin);
    [...getDesks(), ...getFixedFurniture()].forEach((piece) => drawFurniture(this, origin, piece));
    this.figureSprites = DEFAULT_FIGURES.flatMap((figure) => this.seatFigure(figure, origin));

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }

  private seatFigure(figure: Figure, origin: ScreenPoint): FigureSprite[] {
    const desk = getDeskForFigure(figure.room, figure.deskIndex);
    if (desk === undefined) return [];
    const feet = getSeatPoint(desk);
    return [new FigureSprite(this, figure, origin, feet, projectToScreen(feet))];
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
    const graphics = this.add.graphics().setDepth(DEPTH_BACKGROUND);
    graphics.fillGradientStyle(BACKGROUND_TOP, BACKGROUND_TOP, BACKGROUND_BOTTOM, BACKGROUND_BOTTOM, 1).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    graphics.fillStyle(Phaser.Display.Color.HexStringToColor(THEME_COLORS.background).color, VIGNETTE_ALPHA).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }
}

/** Screen offset that centers the projected plan inside the world. */
function getOfficeOrigin(): ScreenPoint {
  const bounds = getScreenBounds([
    { gx: 0, gy: 0 },
    { gx: PLAN_WIDTH, gy: 0 },
    { gx: PLAN_WIDTH, gy: PLAN_HEIGHT },
    { gx: 0, gy: PLAN_HEIGHT },
  ]);
  return {
    x: WORLD_WIDTH * HALF - (bounds.minX + bounds.maxX) * HALF,
    y: WORLD_HEIGHT * HALF - (bounds.minY + bounds.maxY) * HALF + OFFICE_VERTICAL_SHIFT,
  };
}
