import Phaser from 'phaser';

import { PrismFace, drawFacePatch, drawPrism, rectCorners, toPoints } from './drawPrism';
import { FurnitureKind, ScreenColor, getFurnitureCenter } from './furniture';
import { getDepth, projectToScreen } from './isoProjection';
import { PALETTE } from './palette';

import type { PrismColors } from './drawPrism';
import type { DeskOptions, Furniture } from './furniture';
import type { GridRect } from './floorPlan';
import type { ScreenPoint } from './isoProjection';

const DESK_HEIGHT = 15;
const TABLE_HEIGHT = 15;
const CHAIR_HEIGHT = 7;
const CHAIR_BACK_HEIGHT = 13;
const BOOKSHELF_HEIGHT = 33;
const RACK_HEIGHT = 35;
const COOLER_HEIGHT = 14;
const CABINET_HEIGHT = 20;
const SAFE_HEIGHT = 16;
const COUNTER_HEIGHT = 16;
const FRIDGE_HEIGHT = 32;
const ROUND_TABLE_HEIGHT = 14;
const STOOL_HEIGHT = 7;
const SOFA_HEIGHT = 9;
const SOFA_BACK_HEIGHT = 15;
const POT_HEIGHT = 7;
const PLANT_RADIUS = 6;
const PLANT_LIFT = 11;

const MONITOR_WIDTH = 9;
const MONITOR_HEIGHT = 7;
const MONITOR_STAND = 2;
const MONITOR_GLOW_ALPHA = 0.25;
const MONITOR_GLOW_PAD = 3;
const KEYBOARD_WIDTH = 8;
const KEYBOARD_DEPTH = 3;
const MUG_SIZE = 3;
const PAPER_WIDTH = 6;
const PAPER_DEPTH = 4;
const LAMP_RADIUS = 2;
const LAMP_GLOW_ALPHA = 0.3;
const LAPTOP_WIDTH = 8;
const LAPTOP_DEPTH = 5;
const RACK_STRIPE_COUNT = 5;
const RACK_LED_COLORS: readonly number[] = [PALETTE.ledGreen, PALETTE.ledGreen, PALETTE.ledRed, PALETTE.ledYellow];
const SHELF_ROWS = 3;
const CHAIR_BACK_DEPTH = 0.3;
const HALF = 0.5;

const WOOD: PrismColors = { top: PALETTE.woodTop, south: PALETTE.woodSouth, east: PALETTE.woodEast };
const DARK_WOOD: PrismColors = { top: PALETTE.woodDarkTop, south: PALETTE.woodDarkSouth, east: PALETTE.woodDarkEast };
const CHAIR: PrismColors = { top: PALETTE.chairTop, south: PALETTE.chairSide, east: PALETTE.chairSide };
const EXECUTIVE_CHAIR: PrismColors = { top: PALETTE.executiveChairTop, south: PALETTE.executiveChairSide, east: PALETTE.executiveChairSide };
const STOOL: PrismColors = { top: PALETTE.stoolTop, south: PALETTE.stoolSide, east: PALETTE.stoolSide };
const RACK: PrismColors = { top: PALETTE.rackBody, south: PALETTE.rackBody, east: PALETTE.rackSide };
const COOLER: PrismColors = { top: PALETTE.coolerTop, south: PALETTE.coolerBody, east: PALETTE.coolerEast };
const CABINET: PrismColors = { top: PALETTE.cabinetTop, south: PALETTE.cabinetSouth, east: PALETTE.cabinetEast };
const SAFE: PrismColors = { top: PALETTE.safeTop, south: PALETTE.safeSouth, east: PALETTE.safeEast };
const COUNTER: PrismColors = { top: PALETTE.applianceTop, south: PALETTE.applianceSouth, east: PALETTE.applianceEast };
const FRIDGE: PrismColors = { top: PALETTE.fridgeTop, south: PALETTE.fridgeSouth, east: PALETTE.fridgeEast };
const SOFA: PrismColors = { top: PALETTE.sofaTop, south: PALETTE.sofaSide, east: PALETTE.sofaSide };
const POT: PrismColors = { top: PALETTE.pot, south: PALETTE.potSide, east: PALETTE.potSide };
const SCREEN_COLORS: Readonly<Record<ScreenColor, number>> = {
  [ScreenColor.Blue]: PALETTE.screenBlue,
  [ScreenColor.Mint]: PALETTE.screenMint,
  [ScreenColor.Green]: PALETTE.screenGreen,
};

/** Draws one piece as its own Graphics so the scene can depth-sort it against figures and walls. */
export function drawFurniture(scene: Phaser.Scene, origin: ScreenPoint, piece: Furniture): void {
  const graphics = scene.add.graphics({ x: origin.x, y: origin.y }).setDepth(getDepth(getFurnitureCenter(piece)));
  drawPiece(graphics, piece);
}

function drawPiece(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  switch (piece.kind) {
    case FurnitureKind.Desk:
      drawDesk(graphics, piece, WOOD, piece.desk);
      return;
    case FurnitureKind.BigDesk:
      drawDesk(graphics, piece, DARK_WOOD, piece.desk);
      return;
    case FurnitureKind.MeetingTable:
      drawMeetingTable(graphics, piece);
      return;
    case FurnitureKind.Chair:
      drawChair(graphics, piece, CHAIR);
      return;
    case FurnitureKind.ExecutiveChair:
      drawChair(graphics, piece, EXECUTIVE_CHAIR);
      return;
    case FurnitureKind.Bookshelf:
      drawBookshelf(graphics, piece);
      return;
    case FurnitureKind.Plant:
      drawPlant(graphics, piece);
      return;
    case FurnitureKind.ServerRack:
      drawServerRack(graphics, piece);
      return;
    case FurnitureKind.WaterCooler:
      drawWaterCooler(graphics, piece);
      return;
    case FurnitureKind.FilingCabinet:
      drawPrism(graphics, piece, CABINET_HEIGHT, CABINET);
      drawFacePatch(graphics, piece, CABINET_HEIGHT, PrismFace.South, { u0: 0.15, u1: 0.85, v0: 0.5, v1: 0.54 }, PALETTE.outline);
      drawFacePatch(graphics, piece, CABINET_HEIGHT, PrismFace.South, { u0: 0.15, u1: 0.85, v0: 0.12, v1: 0.16 }, PALETTE.outline);
      return;
    case FurnitureKind.Safe:
      drawPrism(graphics, piece, SAFE_HEIGHT, SAFE);
      drawFacePatch(graphics, piece, SAFE_HEIGHT, PrismFace.South, { u0: 0.4, u1: 0.6, v0: 0.4, v1: 0.6 }, PALETTE.lamp);
      return;
    case FurnitureKind.KitchenCounter:
      drawKitchenCounter(graphics, piece);
      return;
    case FurnitureKind.Fridge:
      drawPrism(graphics, piece, FRIDGE_HEIGHT, FRIDGE);
      drawFacePatch(graphics, piece, FRIDGE_HEIGHT, PrismFace.South, { u0: 0.05, u1: 0.95, v0: 0.62, v1: 0.66 }, PALETTE.applianceEast);
      return;
    case FurnitureKind.RoundTable:
      drawRoundTable(graphics, piece);
      return;
    case FurnitureKind.Stool:
      drawPrism(graphics, piece, STOOL_HEIGHT, STOOL);
      return;
    case FurnitureKind.Sofa:
      drawSofa(graphics, piece);
      return;
  }
}

function topPoint(rect: GridRect, u: number, v: number, height: number): ScreenPoint {
  const point = projectToScreen({ gx: rect.gx0 + (rect.gx1 - rect.gx0) * u, gy: rect.gy0 + (rect.gy1 - rect.gy0) * v });
  return { x: point.x, y: point.y - height };
}

function fillTopRect(graphics: Phaser.GameObjects.Graphics, rect: GridRect, height: number, color: number, alpha = 1): void {
  const [top, right, bottom, left] = rectCorners(rect);
  const lift = (point: ScreenPoint): ScreenPoint => ({ x: point.x, y: point.y - height });
  graphics.fillStyle(color, alpha).fillPoints(toPoints([lift(top), lift(right), lift(bottom), lift(left)]), true);
}

function subRect(rect: GridRect, u0: number, v0: number, u1: number, v1: number): GridRect {
  const width = rect.gx1 - rect.gx0;
  const depth = rect.gy1 - rect.gy0;
  return { gx0: rect.gx0 + width * u0, gy0: rect.gy0 + depth * v0, gx1: rect.gx0 + width * u1, gy1: rect.gy0 + depth * v1 };
}

function drawDesk(graphics: Phaser.GameObjects.Graphics, piece: Furniture, colors: PrismColors, options: DeskOptions | undefined): void {
  drawPrism(graphics, piece, DESK_HEIGHT, colors);
  const settings = options ?? { screen: ScreenColor.Blue, hasMug: false, hasLamp: false, hasPaper: false };
  fillTopRect(graphics, subRect(piece, 0.25, 0.62, 0.55, 0.92), DESK_HEIGHT + 1, PALETTE.keyboard);
  if (settings.hasPaper) fillTopRect(graphics, subRect(piece, 0.62, 0.55, 0.9, 0.9), DESK_HEIGHT + 1, PALETTE.paper);
  if (settings.hasMug) drawMug(graphics, topPoint(piece, 0.82, 0.3, DESK_HEIGHT));
  if (settings.hasLamp) drawLamp(graphics, topPoint(piece, 0.85, 0.35, DESK_HEIGHT));
  drawMonitor(graphics, topPoint(piece, 0.55, 0.42, DESK_HEIGHT), SCREEN_COLORS[settings.screen]);
}

function drawMonitor(graphics: Phaser.GameObjects.Graphics, base: ScreenPoint, screenColor: number): void {
  const screenX = base.x - MONITOR_WIDTH * HALF;
  const screenY = base.y - MONITOR_STAND - MONITOR_HEIGHT;
  graphics.fillStyle(screenColor, MONITOR_GLOW_ALPHA).fillRect(screenX - MONITOR_GLOW_PAD, screenY - MONITOR_GLOW_PAD, MONITOR_WIDTH + MONITOR_GLOW_PAD * 2, MONITOR_HEIGHT + MONITOR_GLOW_PAD * 2);
  graphics.fillStyle(PALETTE.screenBezel, 1).fillRect(base.x - 1, base.y - MONITOR_STAND, 2, MONITOR_STAND);
  graphics.fillStyle(PALETTE.screenBezel, 1).fillRect(screenX - 1, screenY - 1, MONITOR_WIDTH + 2, MONITOR_HEIGHT + 2);
  graphics.fillStyle(screenColor, 1).fillRect(screenX, screenY, MONITOR_WIDTH, MONITOR_HEIGHT);
  graphics.fillStyle(PALETTE.screenBezel, 0.5).fillRect(screenX + 1, screenY + 2, MONITOR_WIDTH - 4, 1).fillRect(screenX + 1, screenY + 4, MONITOR_WIDTH - 6, 1);
}

function drawMug(graphics: Phaser.GameObjects.Graphics, base: ScreenPoint): void {
  graphics.fillStyle(PALETTE.outline, 1).fillRect(base.x - MUG_SIZE * HALF - 1, base.y - MUG_SIZE - 1, MUG_SIZE + 2, MUG_SIZE + 2);
  graphics.fillStyle(PALETTE.mugRed, 1).fillRect(base.x - MUG_SIZE * HALF, base.y - MUG_SIZE, MUG_SIZE, MUG_SIZE);
}

function drawLamp(graphics: Phaser.GameObjects.Graphics, base: ScreenPoint): void {
  graphics.fillStyle(PALETTE.lamp, LAMP_GLOW_ALPHA).fillCircle(base.x, base.y - 5, LAMP_RADIUS * 3);
  graphics.fillStyle(PALETTE.screenBezel, 1).fillRect(base.x - 1, base.y - 6, 1, 6);
  graphics.fillStyle(PALETTE.lamp, 1).fillCircle(base.x, base.y - 6, LAMP_RADIUS);
}

function drawMeetingTable(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, TABLE_HEIGHT, WOOD);
  const laptop = subRect(piece, 0.4, 0.3, 0.4 + LAPTOP_WIDTH / (piece.gx1 - piece.gx0) / 3, 0.3 + LAPTOP_DEPTH / (piece.gy1 - piece.gy0) / 3);
  fillTopRect(graphics, laptop, TABLE_HEIGHT + 1, PALETTE.screenBezel);
  const screen = topPoint(laptop, 0.5, 0, TABLE_HEIGHT);
  graphics.fillStyle(PALETTE.screenBlue, 1).fillRect(screen.x - 3, screen.y - 5, 6, 4);
}

function drawChair(graphics: Phaser.GameObjects.Graphics, piece: Furniture, colors: PrismColors): void {
  drawPrism(graphics, piece, CHAIR_HEIGHT, colors);
  const back = subRect(piece, 0, 0, 1, CHAIR_BACK_DEPTH);
  drawPrism(graphics, back, CHAIR_BACK_HEIGHT, colors);
}

function drawBookshelf(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, BOOKSHELF_HEIGHT, DARK_WOOD);
  const bookColors = [PALETTE.mugRed, PALETTE.screenBlue, PALETTE.lamp, PALETTE.ledGreen, PALETTE.stickyPurple];
  for (let row = 0; row < SHELF_ROWS; row += 1) {
    const v0 = 0.1 + row * 0.28;
    drawFacePatch(graphics, piece, BOOKSHELF_HEIGHT, PrismFace.East, { u0: 0.08, u1: 0.92, v0, v1: v0 + 0.22 }, PALETTE.shelfBack);
    bookColors.forEach((color, index) => {
      const u0 = 0.12 + index * 0.16;
      drawFacePatch(graphics, piece, BOOKSHELF_HEIGHT, PrismFace.East, { u0, u1: u0 + 0.1, v0: v0 + 0.02, v1: v0 + 0.18 - (index % 2) * 0.04 }, color);
    });
  }
}

function drawPlant(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, POT_HEIGHT, POT);
  const top = topPoint(piece, 0.5, 0.5, PLANT_LIFT);
  graphics.fillStyle(PALETTE.plantLeafDark, 1).fillCircle(top.x, top.y, PLANT_RADIUS);
  graphics.fillStyle(PALETTE.plantLeaf, 1).fillCircle(top.x - 2, top.y - 2, PLANT_RADIUS - 2);
}

function drawServerRack(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, RACK_HEIGHT, RACK);
  for (let index = 0; index < RACK_STRIPE_COUNT; index += 1) {
    const v0 = 0.08 + index * 0.18;
    drawFacePatch(graphics, piece, RACK_HEIGHT, PrismFace.South, { u0: 0.06, u1: 0.94, v0, v1: v0 + 0.11 }, PALETTE.rackStripe);
  }
  RACK_LED_COLORS.forEach((color, index) => {
    const v0 = 0.12 + index * 0.18;
    drawFacePatch(graphics, piece, RACK_HEIGHT, PrismFace.South, { u0: 0.12, u1: 0.22, v0, v1: v0 + 0.05 }, color);
  });
}

function drawWaterCooler(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, COOLER_HEIGHT, COOLER);
  drawFacePatch(graphics, piece, COOLER_HEIGHT, PrismFace.South, { u0: 0.1, u1: 0.9, v0: 0.6, v1: 0.95 }, PALETTE.coolerWater);
  const jug = subRect(piece, 0.15, 0.15, 0.85, 0.85);
  drawPrism(graphics, jug, COOLER_HEIGHT + 6, { top: PALETTE.coolerWater, south: PALETTE.coolerWater, east: PALETTE.windowGlassBottom }, false);
}

function drawKitchenCounter(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, COUNTER_HEIGHT, COUNTER);
  fillTopRect(graphics, subRect(piece, 0.1, 0.2, 0.32, 0.8), COUNTER_HEIGHT + 1, PALETTE.sinkRim);
  fillTopRect(graphics, subRect(piece, 0.13, 0.28, 0.29, 0.72), COUNTER_HEIGHT + 1, PALETTE.sink);
  fillTopRect(graphics, subRect(piece, 0.6, 0.2, 0.9, 0.8), COUNTER_HEIGHT + 2, PALETTE.screenBezel);
}

function drawRoundTable(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  const center = topPoint(piece, 0.5, 0.5, 0);
  const radiusX = (piece.gx1 - piece.gx0) * 7 * HALF;
  const radiusY = radiusX * HALF;
  graphics.fillStyle(PALETTE.woodEast, 1).fillRect(center.x - 2, center.y - ROUND_TABLE_HEIGHT, 4, ROUND_TABLE_HEIGHT);
  graphics.fillStyle(PALETTE.woodSouth, 1).fillEllipse(center.x, center.y - ROUND_TABLE_HEIGHT + 2, radiusX * 2, radiusY * 2);
  graphics.fillStyle(PALETTE.woodTop, 1).fillEllipse(center.x, center.y - ROUND_TABLE_HEIGHT, radiusX * 2, radiusY * 2);
  drawMug(graphics, { x: center.x - 4, y: center.y - ROUND_TABLE_HEIGHT });
  graphics.fillStyle(PALETTE.paper, 1).fillRect(center.x + 1, center.y - ROUND_TABLE_HEIGHT - 1, PAPER_WIDTH - 2, PAPER_DEPTH - 2);
}

function drawSofa(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, SOFA_HEIGHT, SOFA);
  drawPrism(graphics, subRect(piece, 0, 0, 1, 0.3), SOFA_BACK_HEIGHT, SOFA);
  drawPrism(graphics, subRect(piece, 0, 0, 0.12, 1), SOFA_HEIGHT + 3, SOFA);
  drawPrism(graphics, subRect(piece, 0.88, 0, 1, 1), SOFA_HEIGHT + 3, SOFA);
}

export { KEYBOARD_WIDTH, KEYBOARD_DEPTH };
