import Phaser from 'phaser';

import { DEFAULT_FIGURES } from '@shared/figures';
import { OfficeCamera } from '../camera/OfficeCamera';
import { FigureSprite } from '../entities/FigureSprite';
import { drawFloors } from '../world/drawFloors';
import { drawFurniture } from '../world/drawFurniture';
import { drawWalls } from '../world/drawWalls';
import { PLAN_HEIGHT, PLAN_WIDTH } from '../world/floorPlan';
import { getDeskForFigure, getFurniture, getSeatPoint } from '../world/furniture';
import { getScreenBounds, projectToScreen } from '../world/isoProjection';
import { PALETTE } from '../world/palette';
import { EXTERIOR_WALL_HEIGHT } from '../world/walls';

import type { Figure } from '@shared/figures';
import type { Bounds } from '../camera/fitCamera';
import type { ScreenPoint } from '../world/isoProjection';

export const OFFICE_SCENE_KEY = 'office';
const WORLD_WIDTH = 640;
const WORLD_HEIGHT = 360;
const OFFICE_VERTICAL_SHIFT = 4;
const SLAB_DEPTH = 14;
const DEPTH_BACKGROUND = -2000;
const BACKGROUND_OVERSCAN = 4;
const GLOW_RINGS = 6;
const GLOW_RADIUS_X = 420;
const GLOW_RADIUS_Y = 300;
const GLOW_CENTER_Y_RATIO = 0.2;
const GLOW_ALPHA = 0.16;
const HALF = 0.5;

/** The whole floor plan on one screen. The camera fits the office to the window at any size. */
export class OfficeScene extends Phaser.Scene {
  private figureSprites: FigureSprite[] = [];
  private officeCamera: OfficeCamera | null = null;

  constructor() {
    super(OFFICE_SCENE_KEY);
  }

  create(): void {
    this.drawBackground();
    const origin = getOfficeOrigin();
    drawFloors(this, origin);
    drawWalls(this, origin);
    getFurniture().forEach((piece) => drawFurniture(this, origin, piece));
    this.figureSprites = DEFAULT_FIGURES.flatMap((figure) => this.seatFigure(figure, origin));
    this.officeCamera = new OfficeCamera(this, getOfficeBounds(origin));
  }

  private seatFigure(figure: Figure, origin: ScreenPoint): FigureSprite[] {
    const desk = getDeskForFigure(figure.room, figure.deskIndex);
    if (desk === undefined) return [];
    const feet = getSeatPoint(desk);
    return [new FigureSprite(this, figure, origin, feet, projectToScreen(feet))];
  }

  /** Radial glow approximated with concentric ellipses, the handoff's background gradient. */
  private drawBackground(): void {
    const graphics = this.add.graphics().setDepth(DEPTH_BACKGROUND);
    const overscanWidth = WORLD_WIDTH * BACKGROUND_OVERSCAN;
    const overscanHeight = WORLD_HEIGHT * BACKGROUND_OVERSCAN;
    graphics.fillStyle(PALETTE.backgroundOuter, 1).fillRect(-overscanWidth * HALF, -overscanHeight * HALF, overscanWidth * 2, overscanHeight * 2);
    for (let ring = GLOW_RINGS; ring >= 1; ring -= 1) {
      const scale = ring / GLOW_RINGS;
      const color = ring > GLOW_RINGS * HALF ? PALETTE.backgroundMiddle : PALETTE.backgroundInner;
      graphics.fillStyle(color, GLOW_ALPHA).fillEllipse(WORLD_WIDTH * HALF, WORLD_HEIGHT * GLOW_CENTER_Y_RATIO, GLOW_RADIUS_X * 2 * scale, GLOW_RADIUS_Y * 2 * scale);
    }
  }
}

function planCorners(): { gx: number; gy: number }[] {
  return [
    { gx: 0, gy: 0 },
    { gx: PLAN_WIDTH, gy: 0 },
    { gx: PLAN_WIDTH, gy: PLAN_HEIGHT },
    { gx: 0, gy: PLAN_HEIGHT },
  ];
}

/** Screen offset that centers the projected plan inside the world. */
function getOfficeOrigin(): ScreenPoint {
  const bounds = getScreenBounds(planCorners());
  return {
    x: WORLD_WIDTH * HALF - (bounds.minX + bounds.maxX) * HALF,
    y: WORLD_HEIGHT * HALF - (bounds.minY + bounds.maxY) * HALF + OFFICE_VERTICAL_SHIFT,
  };
}

/** World-space box around the whole office, tall walls and slab included. */
function getOfficeBounds(origin: ScreenPoint): Bounds {
  const bounds = getScreenBounds(planCorners());
  return {
    minX: origin.x + bounds.minX,
    maxX: origin.x + bounds.maxX,
    minY: origin.y + bounds.minY - EXTERIOR_WALL_HEIGHT,
    maxY: origin.y + bounds.maxY + SLAB_DEPTH,
  };
}
