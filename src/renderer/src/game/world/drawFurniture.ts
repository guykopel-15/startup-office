import Phaser from 'phaser';

import { HALF } from '@shared/theme';
import { PrismFace, drawPrism, fillFacePatch, fillQuad, topQuad } from './drawPrism';
import { DEFAULT_DESK, FurnitureKind, ScreenColor } from './furniture';
import { TILE_WIDTH, getDepth, getRectCenter, projectToScreen, raise } from './isoProjection';
import { PALETTE } from './palette';

import type { FacePatch, PrismColors } from './drawPrism';
import type { DeskOptions, Furniture } from './furniture';
import type { GridRect, ScreenPoint } from './isoProjection';

const DESK_HEIGHT = 15;
const CHAIR_HEIGHT = 7;
const CHAIR_BACK_HEIGHT = 13;
const CHAIR_BACK_DEPTH = 0.3;
const BOOKSHELF_HEIGHT = 33;
const RACK_HEIGHT = 35;
const COOLER_HEIGHT = 14;
const COOLER_JUG_EXTRA = 6;
const CABINET_HEIGHT = 20;
const SAFE_HEIGHT = 16;
const COUNTER_HEIGHT = 16;
const FRIDGE_HEIGHT = 32;
const ROUND_TABLE_HEIGHT = 14;
const STOOL_HEIGHT = 7;
const SOFA_HEIGHT = 9;
const SOFA_BACK_HEIGHT = 15;
const SOFA_ARM_EXTRA = 3;
const SOFA_BACK_DEPTH = 0.3;
const SOFA_ARM_WIDTH = 0.12;
const POT_HEIGHT = 7;
const PLANT_RADIUS = 6;
const PLANT_HIGHLIGHT_SHRINK = 2;
const PLANT_HIGHLIGHT_OFFSET = 2;
const PLANT_LIFT = 11;
const ITEM_LIFT = 1;
const MICROWAVE_LIFT = 2;

const MONITOR_WIDTH = 9;
const MONITOR_HEIGHT = 7;
const MONITOR_STAND = 2;
const MONITOR_STAND_WIDTH = 2;
const MONITOR_BEZEL = 1;
const MONITOR_GLOW_ALPHA = 0.25;
const MONITOR_GLOW_PADDING = 3;
const MONITOR_LINE_ALPHA = 0.5;
const MONITOR_LINE_ROWS: readonly number[] = [2, 4];
const MONITOR_LINE_SHORTEN: readonly number[] = [4, 6];
const MUG_SIZE = 3;
const MUG_OUTLINE = 1;
const LAMP_RADIUS = 2;
const LAMP_GLOW_RADIUS = 6;
const LAMP_HEIGHT = 6;
const LAMP_GLOW_ALPHA = 0.3;
const LAPTOP_SCREEN_WIDTH = 6;
const LAPTOP_SCREEN_HEIGHT = 4;
const LAPTOP_SCREEN_LIFT = 5;
const RACK_STRIPE_COUNT = 5;
const RACK_STRIPE_START = 0.08;
const RACK_STRIPE_STEP = 0.18;
const RACK_STRIPE_THICKNESS = 0.11;
const RACK_STRIPE_INSET = 0.06;
const LED_START = 0.12;
const LED_STEP = 0.18;
const LED_PATCH: FacePatch = { alongStart: 0.12, alongEnd: 0.22, heightStart: 0, heightEnd: 0.05 };
const RACK_LED_COLORS: readonly number[] = [PALETTE.ledGreen, PALETTE.ledGreen, PALETTE.ledRed, PALETTE.ledYellow];
const SHELF_ROWS = 3;
const SHELF_ROW_START = 0.1;
const SHELF_ROW_STEP = 0.28;
const SHELF_ROW_HEIGHT = 0.22;
const SHELF_INSET = 0.08;
const BOOK_START = 0.12;
const BOOK_STEP = 0.16;
const BOOK_WIDTH = 0.1;
const BOOK_LIFT = 0.02;
const BOOK_HEIGHT = 0.16;
const BOOK_HEIGHT_VARIATION = 0.04;
const BOOK_COLORS: readonly number[] = [PALETTE.mugRed, PALETTE.screenBlue, PALETTE.lamp, PALETTE.ledGreen, PALETTE.stickyPurple];
const TABLE_PEDESTAL_WIDTH = 4;
const TABLE_MUG_OFFSET = 4;
const TABLE_PAPER_WIDTH = 4;
const TABLE_PAPER_HEIGHT = 2;

/** Rectangles on a desk top, as fractions of the desk footprint. */
const KEYBOARD_PATCH: GridRect = { gx0: 0.25, gy0: 0.62, gx1: 0.55, gy1: 0.92 };
const PAPER_PATCH: GridRect = { gx0: 0.62, gy0: 0.55, gx1: 0.9, gy1: 0.9 };
const LAPTOP_PATCH: GridRect = { gx0: 0.4, gy0: 0.3, gx1: 0.55, gy1: 0.6 };
const SINK_RIM_PATCH: GridRect = { gx0: 0.1, gy0: 0.2, gx1: 0.32, gy1: 0.8 };
const SINK_PATCH: GridRect = { gx0: 0.13, gy0: 0.28, gx1: 0.29, gy1: 0.72 };
const MICROWAVE_PATCH: GridRect = { gx0: 0.6, gy0: 0.2, gx1: 0.9, gy1: 0.8 };
const MONITOR_ANCHOR: ScreenAnchor = { u: 0.55, v: 0.42 };
const MUG_ANCHOR: ScreenAnchor = { u: 0.82, v: 0.3 };
const LAMP_ANCHOR: ScreenAnchor = { u: 0.85, v: 0.35 };
const CENTER_ANCHOR: ScreenAnchor = { u: HALF, v: HALF };
const CABINET_DRAWER_LINES: readonly FacePatch[] = [
  { alongStart: 0.15, alongEnd: 0.85, heightStart: 0.5, heightEnd: 0.54 },
  { alongStart: 0.15, alongEnd: 0.85, heightStart: 0.12, heightEnd: 0.16 },
];
const SAFE_DIAL_PATCH: FacePatch = { alongStart: 0.4, alongEnd: 0.6, heightStart: 0.4, heightEnd: 0.6 };
const FRIDGE_SEAM_PATCH: FacePatch = { alongStart: 0.05, alongEnd: 0.95, heightStart: 0.62, heightEnd: 0.66 };
const COOLER_WATER_PATCH: FacePatch = { alongStart: 0.1, alongEnd: 0.9, heightStart: 0.6, heightEnd: 0.95 };
const COOLER_JUG_INSET = 0.15;

interface ScreenAnchor {
  u: number;
  v: number;
}

const WOOD: PrismColors = { top: PALETTE.woodTop, south: PALETTE.woodSouth, east: PALETTE.woodEast };
const DARK_WOOD: PrismColors = { top: PALETTE.woodDarkTop, south: PALETTE.woodDarkSouth, east: PALETTE.woodDarkEast };
const CHAIR: PrismColors = { top: PALETTE.chairTop, south: PALETTE.chairSide, east: PALETTE.chairSide };
const STOOL: PrismColors = { top: PALETTE.stoolTop, south: PALETTE.stoolSide, east: PALETTE.stoolSide };
const RACK: PrismColors = { top: PALETTE.rackBody, south: PALETTE.rackBody, east: PALETTE.rackSide };
const COOLER: PrismColors = { top: PALETTE.coolerTop, south: PALETTE.coolerBody, east: PALETTE.coolerEast };
const COOLER_JUG: PrismColors = { top: PALETTE.coolerWater, south: PALETTE.coolerWater, east: PALETTE.windowGlassBottom };
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

type Drawer = (graphics: Phaser.GameObjects.Graphics, piece: Furniture) => void;

const DRAWERS: Readonly<Record<FurnitureKind, Drawer>> = {
  [FurnitureKind.Desk]: (graphics, piece): void => drawDesk(graphics, piece, WOOD),
  [FurnitureKind.BigDesk]: (graphics, piece): void => drawDesk(graphics, piece, DARK_WOOD),
  [FurnitureKind.MeetingTable]: drawMeetingTable,
  [FurnitureKind.Chair]: drawChair,
  [FurnitureKind.Bookshelf]: drawBookshelf,
  [FurnitureKind.Plant]: drawPlant,
  [FurnitureKind.ServerRack]: drawServerRack,
  [FurnitureKind.WaterCooler]: drawWaterCooler,
  [FurnitureKind.FilingCabinet]: drawFilingCabinet,
  [FurnitureKind.Safe]: drawSafe,
  [FurnitureKind.KitchenCounter]: drawKitchenCounter,
  [FurnitureKind.Fridge]: drawFridge,
  [FurnitureKind.RoundTable]: drawRoundTable,
  [FurnitureKind.Stool]: (graphics, piece): void => drawPrism(graphics, piece, STOOL_HEIGHT, STOOL),
  [FurnitureKind.Sofa]: drawSofa,
};

/** Draws one piece as its own Graphics so the scene can depth-sort it against figures and walls. */
export function drawFurniture(scene: Phaser.Scene, origin: ScreenPoint, piece: Furniture): void {
  const graphics = scene.add.graphics({ x: origin.x, y: origin.y }).setDepth(getDepth(getRectCenter(piece)));
  DRAWERS[piece.kind](graphics, piece);
}

/** A point on a box top, `u`/`v` as fractions of the footprint. */
function topPoint(rect: GridRect, anchor: ScreenAnchor, height: number): ScreenPoint {
  return raise(projectToScreen({ gx: rect.gx0 + (rect.gx1 - rect.gx0) * anchor.u, gy: rect.gy0 + (rect.gy1 - rect.gy0) * anchor.v }), height);
}

function subRect(rect: GridRect, fractions: GridRect): GridRect {
  const width = rect.gx1 - rect.gx0;
  const depth = rect.gy1 - rect.gy0;
  return { gx0: rect.gx0 + width * fractions.gx0, gy0: rect.gy0 + depth * fractions.gy0, gx1: rect.gx0 + width * fractions.gx1, gy1: rect.gy0 + depth * fractions.gy1 };
}

function fillTopRect(graphics: Phaser.GameObjects.Graphics, rect: GridRect, height: number, color: number): void {
  fillQuad(graphics, topQuad(rect, height), color);
}

function drawDesk(graphics: Phaser.GameObjects.Graphics, piece: Furniture, colors: PrismColors): void {
  const options: DeskOptions = piece.desk ?? DEFAULT_DESK;
  drawPrism(graphics, piece, DESK_HEIGHT, colors);
  fillTopRect(graphics, subRect(piece, KEYBOARD_PATCH), DESK_HEIGHT + ITEM_LIFT, PALETTE.keyboard);
  if (options.hasPaper) fillTopRect(graphics, subRect(piece, PAPER_PATCH), DESK_HEIGHT + ITEM_LIFT, PALETTE.paper);
  if (options.hasMug) drawMug(graphics, topPoint(piece, MUG_ANCHOR, DESK_HEIGHT));
  if (options.hasLamp) drawLamp(graphics, topPoint(piece, LAMP_ANCHOR, DESK_HEIGHT));
  drawMonitor(graphics, topPoint(piece, MONITOR_ANCHOR, DESK_HEIGHT), SCREEN_COLORS[options.screen]);
}

function drawMonitor(graphics: Phaser.GameObjects.Graphics, base: ScreenPoint, screenColor: number): void {
  const screenX = base.x - MONITOR_WIDTH * HALF;
  const screenY = base.y - MONITOR_STAND - MONITOR_HEIGHT;
  const glowSize = MONITOR_GLOW_PADDING * 2;
  graphics.fillStyle(screenColor, MONITOR_GLOW_ALPHA).fillRect(screenX - MONITOR_GLOW_PADDING, screenY - MONITOR_GLOW_PADDING, MONITOR_WIDTH + glowSize, MONITOR_HEIGHT + glowSize);
  graphics.fillStyle(PALETTE.screenBezel, 1).fillRect(base.x - MONITOR_STAND_WIDTH * HALF, base.y - MONITOR_STAND, MONITOR_STAND_WIDTH, MONITOR_STAND);
  graphics.fillRect(screenX - MONITOR_BEZEL, screenY - MONITOR_BEZEL, MONITOR_WIDTH + MONITOR_BEZEL * 2, MONITOR_HEIGHT + MONITOR_BEZEL * 2);
  graphics.fillStyle(screenColor, 1).fillRect(screenX, screenY, MONITOR_WIDTH, MONITOR_HEIGHT);
  graphics.fillStyle(PALETTE.screenBezel, MONITOR_LINE_ALPHA);
  MONITOR_LINE_ROWS.forEach((row: number, index: number): void => {
    graphics.fillRect(screenX + MONITOR_BEZEL, screenY + row, MONITOR_WIDTH - (MONITOR_LINE_SHORTEN[index] ?? 0), 1);
  });
}

function drawMug(graphics: Phaser.GameObjects.Graphics, base: ScreenPoint): void {
  graphics.fillStyle(PALETTE.outline, 1).fillRect(base.x - MUG_SIZE * HALF - MUG_OUTLINE, base.y - MUG_SIZE - MUG_OUTLINE, MUG_SIZE + MUG_OUTLINE * 2, MUG_SIZE + MUG_OUTLINE * 2);
  graphics.fillStyle(PALETTE.mugRed, 1).fillRect(base.x - MUG_SIZE * HALF, base.y - MUG_SIZE, MUG_SIZE, MUG_SIZE);
}

function drawLamp(graphics: Phaser.GameObjects.Graphics, base: ScreenPoint): void {
  const bulb = raise(base, LAMP_HEIGHT);
  graphics.fillStyle(PALETTE.lamp, LAMP_GLOW_ALPHA).fillCircle(bulb.x, bulb.y, LAMP_GLOW_RADIUS);
  graphics.fillStyle(PALETTE.screenBezel, 1).fillRect(base.x - 1, bulb.y, 1, LAMP_HEIGHT);
  graphics.fillStyle(PALETTE.lamp, 1).fillCircle(bulb.x, bulb.y, LAMP_RADIUS);
}

function drawMeetingTable(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, DESK_HEIGHT, WOOD);
  const laptop = subRect(piece, LAPTOP_PATCH);
  fillTopRect(graphics, laptop, DESK_HEIGHT + ITEM_LIFT, PALETTE.screenBezel);
  const screen = topPoint(laptop, { u: HALF, v: 0 }, DESK_HEIGHT);
  graphics.fillStyle(PALETTE.screenBlue, 1).fillRect(screen.x - LAPTOP_SCREEN_WIDTH * HALF, screen.y - LAPTOP_SCREEN_LIFT, LAPTOP_SCREEN_WIDTH, LAPTOP_SCREEN_HEIGHT);
}

function drawChair(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, CHAIR_HEIGHT, CHAIR);
  drawPrism(graphics, subRect(piece, { gx0: 0, gy0: 0, gx1: 1, gy1: CHAIR_BACK_DEPTH }), CHAIR_BACK_HEIGHT, CHAIR);
}

function drawBookshelf(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, BOOKSHELF_HEIGHT, DARK_WOOD);
  for (let row = 0; row < SHELF_ROWS; row += 1) {
    const rowStart = SHELF_ROW_START + row * SHELF_ROW_STEP;
    fillFacePatch(graphics, piece, BOOKSHELF_HEIGHT, PrismFace.East, { alongStart: SHELF_INSET, alongEnd: 1 - SHELF_INSET, heightStart: rowStart, heightEnd: rowStart + SHELF_ROW_HEIGHT }, PALETTE.shelfBack);
    BOOK_COLORS.forEach((color: number, index: number): void => {
      const bookStart = BOOK_START + index * BOOK_STEP;
      const bookTop = rowStart + BOOK_HEIGHT - (index % 2) * BOOK_HEIGHT_VARIATION;
      fillFacePatch(graphics, piece, BOOKSHELF_HEIGHT, PrismFace.East, { alongStart: bookStart, alongEnd: bookStart + BOOK_WIDTH, heightStart: rowStart + BOOK_LIFT, heightEnd: bookTop }, color);
    });
  }
}

function drawPlant(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, POT_HEIGHT, POT);
  const top = topPoint(piece, CENTER_ANCHOR, PLANT_LIFT);
  graphics.fillStyle(PALETTE.plantLeafDark, 1).fillCircle(top.x, top.y, PLANT_RADIUS);
  graphics.fillStyle(PALETTE.plantLeaf, 1).fillCircle(top.x - PLANT_HIGHLIGHT_OFFSET, top.y - PLANT_HIGHLIGHT_OFFSET, PLANT_RADIUS - PLANT_HIGHLIGHT_SHRINK);
}

function drawServerRack(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, RACK_HEIGHT, RACK);
  for (let index = 0; index < RACK_STRIPE_COUNT; index += 1) {
    const stripeStart = RACK_STRIPE_START + index * RACK_STRIPE_STEP;
    fillFacePatch(graphics, piece, RACK_HEIGHT, PrismFace.South, { alongStart: RACK_STRIPE_INSET, alongEnd: 1 - RACK_STRIPE_INSET, heightStart: stripeStart, heightEnd: stripeStart + RACK_STRIPE_THICKNESS }, PALETTE.rackStripe);
  }
  RACK_LED_COLORS.forEach((color: number, index: number): void => {
    const ledStart = LED_START + index * LED_STEP;
    fillFacePatch(graphics, piece, RACK_HEIGHT, PrismFace.South, { ...LED_PATCH, heightStart: ledStart, heightEnd: ledStart + LED_PATCH.heightEnd }, color);
  });
}

function drawWaterCooler(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, COOLER_HEIGHT, COOLER);
  fillFacePatch(graphics, piece, COOLER_HEIGHT, PrismFace.South, COOLER_WATER_PATCH, PALETTE.coolerWater);
  const jug = subRect(piece, { gx0: COOLER_JUG_INSET, gy0: COOLER_JUG_INSET, gx1: 1 - COOLER_JUG_INSET, gy1: 1 - COOLER_JUG_INSET });
  drawPrism(graphics, jug, COOLER_HEIGHT + COOLER_JUG_EXTRA, COOLER_JUG, false);
}

function drawFilingCabinet(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, CABINET_HEIGHT, CABINET);
  CABINET_DRAWER_LINES.forEach((line: FacePatch): void => fillFacePatch(graphics, piece, CABINET_HEIGHT, PrismFace.South, line, PALETTE.outline));
}

function drawSafe(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, SAFE_HEIGHT, SAFE);
  fillFacePatch(graphics, piece, SAFE_HEIGHT, PrismFace.South, SAFE_DIAL_PATCH, PALETTE.lamp);
}

function drawFridge(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, FRIDGE_HEIGHT, FRIDGE);
  fillFacePatch(graphics, piece, FRIDGE_HEIGHT, PrismFace.South, FRIDGE_SEAM_PATCH, PALETTE.applianceEast);
}

function drawKitchenCounter(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, COUNTER_HEIGHT, COUNTER);
  fillTopRect(graphics, subRect(piece, SINK_RIM_PATCH), COUNTER_HEIGHT + ITEM_LIFT, PALETTE.sinkRim);
  fillTopRect(graphics, subRect(piece, SINK_PATCH), COUNTER_HEIGHT + ITEM_LIFT, PALETTE.sink);
  fillTopRect(graphics, subRect(piece, MICROWAVE_PATCH), COUNTER_HEIGHT + MICROWAVE_LIFT, PALETTE.screenBezel);
}

function drawRoundTable(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  const base = topPoint(piece, CENTER_ANCHOR, 0);
  const top = raise(base, ROUND_TABLE_HEIGHT);
  const radiusX = (piece.gx1 - piece.gx0) * TILE_WIDTH * HALF * HALF;
  const radiusY = radiusX * HALF;
  graphics.fillStyle(PALETTE.woodEast, 1).fillRect(base.x - TABLE_PEDESTAL_WIDTH * HALF, top.y, TABLE_PEDESTAL_WIDTH, ROUND_TABLE_HEIGHT);
  graphics.fillStyle(PALETTE.woodSouth, 1).fillEllipse(top.x, top.y + MICROWAVE_LIFT, radiusX * 2, radiusY * 2);
  graphics.fillStyle(PALETTE.woodTop, 1).fillEllipse(top.x, top.y, radiusX * 2, radiusY * 2);
  drawMug(graphics, { x: top.x - TABLE_MUG_OFFSET, y: top.y });
  graphics.fillStyle(PALETTE.paper, 1).fillRect(top.x + ITEM_LIFT, top.y - ITEM_LIFT, TABLE_PAPER_WIDTH, TABLE_PAPER_HEIGHT);
}

function drawSofa(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  drawPrism(graphics, piece, SOFA_HEIGHT, SOFA);
  drawPrism(graphics, subRect(piece, { gx0: 0, gy0: 0, gx1: 1, gy1: SOFA_BACK_DEPTH }), SOFA_BACK_HEIGHT, SOFA);
  drawPrism(graphics, subRect(piece, { gx0: 0, gy0: 0, gx1: SOFA_ARM_WIDTH, gy1: 1 }), SOFA_HEIGHT + SOFA_ARM_EXTRA, SOFA);
  drawPrism(graphics, subRect(piece, { gx0: 1 - SOFA_ARM_WIDTH, gy0: 0, gx1: 1, gy1: 1 }), SOFA_HEIGHT + SOFA_ARM_EXTRA, SOFA);
}
