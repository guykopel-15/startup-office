import Phaser from 'phaser';

import { createLogger } from '@shared/logger';
import { HALF } from '@shared/theme';
import { OfficeCamera } from '../camera/OfficeCamera';
import { FigureSprite } from '../entities/FigureSprite';
import { nextBubbleText } from '../entities/bubbleText';
import { SLAB_DEPTH, drawFloors } from '../world/drawFloors';
import { drawFurniture } from '../world/drawFurniture';
import { drawWalls } from '../world/drawWalls';
import { PLAN_RECT } from '../world/floorPlan';
import { getDeskForFigure, getFurniture, getSeatPoint } from '../world/furniture';
import { getRectCorners, getScreenBounds, projectToScreen } from '../world/isoProjection';
import { PALETTE } from '../world/palette';
import { EXTERIOR_WALL_HEIGHT } from '../world/walls';
import { selectActiveFigures, useFloorsStore } from '../../store/floorsStore';
import { selectLatestRunsByFigure, useRunsStore } from '../../store/runsStore';

import type { AgentRun } from '@shared/agents';
import type { Figure } from '@shared/figures';
import type { Furniture } from '../world/furniture';
import type { ScreenBounds, ScreenPoint } from '../world/isoProjection';
import type { FloorsState } from '../../store/floorsStore';
import type { RunsState } from '../../store/runsStore';

export const OFFICE_SCENE_KEY = 'office';
const WORLD_WIDTH = 640;
const WORLD_HEIGHT = 360;
const OFFICE_VERTICAL_SHIFT = 4;
const DEPTH_BACKGROUND = -2000;
const BACKGROUND_OVERSCAN = 4;
const GLOW_RINGS = 6;
const GLOW_RADIUS_X = 420;
const GLOW_RADIUS_Y = 300;
const GLOW_CENTER_Y_RATIO = 0.2;
const GLOW_ALPHA = 0.16;

const logger = createLogger('office-scene');

/** The whole floor plan on one screen. The camera fits the office to the window at any size. */
export class OfficeScene extends Phaser.Scene {
  private figureSprites = new Map<string, FigureSprite>();
  private lastBubbles = new Map<string, string>();
  private shownFloorId: string | null = null;
  private officeCamera: OfficeCamera | null = null;
  private furniture: Furniture[] = [];
  private origin: ScreenPoint = { x: 0, y: 0 };
  private unsubscribeFigures: (() => void) | null = null;
  private unsubscribeRuns: (() => void) | null = null;

  constructor() {
    super(OFFICE_SCENE_KEY);
  }

  create(): void {
    this.drawBackground();
    this.origin = getOfficeOrigin();
    drawFloors(this, this.origin);
    drawWalls(this, this.origin);
    this.furniture = getFurniture();
    this.furniture.forEach((piece: Furniture): void => drawFurniture(this, this.origin, piece));
    this.syncFigures(useFloorsStore.getState());
    this.unsubscribeFigures = useFloorsStore.subscribe(this.handleFloorsChange);
    this.unsubscribeRuns = useRunsStore.subscribe(this.handleRunsChange);
    this.officeCamera = new OfficeCamera(this, getOfficeBounds(this.origin));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown, this);
  }

  /** Mirrors the active floor: removes sprites that left it, seats figures that joined it, pushes states. */
  private syncFigures(state: FloorsState): void {
    const figures = selectActiveFigures(state);
    const wanted = new Set(figures.map((figure: Figure): string => figure.id));
    this.figureSprites.forEach((sprite: FigureSprite, id: string): void => {
      if (wanted.has(id)) return;
      sprite.destroy();
      this.figureSprites.delete(id);
    });
    figures.filter((figure: Figure): boolean => !this.figureSprites.has(figure.id)).forEach((figure: Figure): void => this.seatFigure(figure));
    figures.forEach((figure: Figure): void => this.figureSprites.get(figure.id)?.setState(figure.state));
    if (state.activeFloorId !== this.shownFloorId) this.enterFloor(state.activeFloorId);
  }

  /** A floor switch hides old speech and remembers what each figure last said, so only new lines pop. */
  private enterFloor(floorId: string | null): void {
    this.shownFloorId = floorId;
    this.lastBubbles.clear();
    this.figureSprites.forEach((sprite: FigureSprite): void => sprite.hideBubble());
    if (floorId === null) return;
    selectLatestRunsByFigure(useRunsStore.getState(), floorId).forEach((run: AgentRun, figureId: string): void => {
      const text = nextBubbleText(undefined, run);
      if (text !== null) this.lastBubbles.set(figureId, text);
    });
  }

  /** Lets each figure say the latest line of its latest run, once per new line. */
  private syncBubbles(runs: RunsState): void {
    if (this.shownFloorId === null) return;
    const latestRuns = selectLatestRunsByFigure(runs, this.shownFloorId);
    this.figureSprites.forEach((sprite: FigureSprite, figureId: string): void => {
      const text = nextBubbleText(this.lastBubbles.get(figureId), latestRuns.get(figureId) ?? null);
      if (text === null) return;
      this.lastBubbles.set(figureId, text);
      sprite.say(text);
    });
  }

  private seatFigure(figure: Figure): void {
    const desk = getDeskForFigure(this.furniture, figure.room, figure.deskIndex);
    if (desk === undefined) {
      logger.warn('figure has no desk', { id: figure.id, room: figure.room, deskIndex: figure.deskIndex });
      return;
    }
    const feet = getSeatPoint(desk);
    this.figureSprites.set(figure.id, new FigureSprite(this, figure, this.origin, feet, projectToScreen(feet)));
  }

  private readonly handleFloorsChange = (state: FloorsState): void => {
    this.syncFigures(state);
  };

  private readonly handleRunsChange = (state: RunsState): void => {
    this.syncBubbles(state);
  };

  private handleShutdown(): void {
    this.unsubscribeFigures?.();
    this.unsubscribeFigures = null;
    this.unsubscribeRuns?.();
    this.unsubscribeRuns = null;
    this.officeCamera?.destroy();
    this.officeCamera = null;
    this.figureSprites.forEach((sprite: FigureSprite): void => sprite.destroy());
    this.figureSprites.clear();
    this.lastBubbles.clear();
    this.shownFloorId = null;
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

/** Screen offset that centers the projected plan inside the world. */
function getOfficeOrigin(): ScreenPoint {
  const bounds = getScreenBounds(getRectCorners(PLAN_RECT));
  return {
    x: WORLD_WIDTH * HALF - (bounds.minX + bounds.maxX) * HALF,
    y: WORLD_HEIGHT * HALF - (bounds.minY + bounds.maxY) * HALF + OFFICE_VERTICAL_SHIFT,
  };
}

/** World-space box around the whole office, tall walls and slab included. */
function getOfficeBounds(origin: ScreenPoint): ScreenBounds {
  const bounds = getScreenBounds(getRectCorners(PLAN_RECT));
  return {
    minX: origin.x + bounds.minX,
    maxX: origin.x + bounds.maxX,
    minY: origin.y + bounds.minY - EXTERIOR_WALL_HEIGHT,
    maxY: origin.y + bounds.maxY + SLAB_DEPTH,
  };
}
