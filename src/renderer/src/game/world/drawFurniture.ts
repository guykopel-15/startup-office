import Phaser from 'phaser';

import { FurnitureKind, getFurnitureCenter } from './desks';
import { getDepth, projectToScreen } from './isoProjection';

import type { Furniture } from './desks';
import type { GridPoint, ScreenPoint } from './isoProjection';

const OUTLINE_COLOR = 0x0e0a1a;
const OUTLINE_ALPHA = 0.9;
const DESK_HEIGHT = 6;
const DESK_TOP_COLOR = 0xa5805a;
const DESK_LEFT_COLOR = 0x6e5138;
const DESK_RIGHT_COLOR = 0x8a6a4a;
const TABLE_TOP_COLOR = 0x8a63b0;
const TABLE_LEFT_COLOR = 0x4d3566;
const TABLE_RIGHT_COLOR = 0x6b4a8a;
const RECEPTION_TOP_COLOR = 0x4a3b7a;
const RECEPTION_LEFT_COLOR = 0x241f3d;
const RECEPTION_RIGHT_COLOR = 0x362d5c;
const MONITOR_WIDTH = 9;
const MONITOR_HEIGHT = 7;
const MONITOR_SCREEN_COLOR = 0x2b3e6b;
const MONITOR_LINE_COLOR = 0x8cf5e6;
const MONITOR_GLOW_ALPHA = 0.16;
const MONITOR_GLOW_PAD = 3;
const MONITOR_STAND_HEIGHT = 2;
const MONITOR_FRONT_OFFSET_Y = 1.25;
const MONITOR_SIDE_OFFSET_X = 0.9;
const CHAIR_COLOR = 0x2a2040;
const CHAIR_WIDTH = 7;
const CHAIR_HEIGHT = 10;
const CHAIR_BACK_OFFSET = 1.4;
const HALF = 0.5;

interface Prism {
  topColor: number;
  leftColor: number;
  rightColor: number;
  height: number;
}

const PRISMS: Readonly<Record<FurnitureKind, Prism>> = {
  [FurnitureKind.Desk]: { topColor: DESK_TOP_COLOR, leftColor: DESK_LEFT_COLOR, rightColor: DESK_RIGHT_COLOR, height: DESK_HEIGHT },
  [FurnitureKind.MeetingTable]: { topColor: TABLE_TOP_COLOR, leftColor: TABLE_LEFT_COLOR, rightColor: TABLE_RIGHT_COLOR, height: DESK_HEIGHT },
  [FurnitureKind.ReceptionDesk]: { topColor: RECEPTION_TOP_COLOR, leftColor: RECEPTION_LEFT_COLOR, rightColor: RECEPTION_RIGHT_COLOR, height: DESK_HEIGHT + 2 },
};

/** Draws one piece as its own Graphics so the scene can depth-sort it against figures. */
export function drawFurniture(scene: Phaser.Scene, origin: ScreenPoint, piece: Furniture): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics({ x: origin.x, y: origin.y });
  const prism = PRISMS[piece.kind];
  if (piece.kind === FurnitureKind.Desk) drawChair(graphics, piece);
  drawPrism(graphics, piece, prism);
  if (piece.kind === FurnitureKind.Desk) drawMonitor(graphics, piece, prism.height);
  graphics.setDepth(getDepth(getFurnitureCenter(piece)));
  return graphics;
}

function corners(piece: Furniture): [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint] {
  return [
    projectToScreen({ gx: piece.gx0, gy: piece.gy0 }),
    projectToScreen({ gx: piece.gx1, gy: piece.gy0 }),
    projectToScreen({ gx: piece.gx1, gy: piece.gy1 }),
    projectToScreen({ gx: piece.gx0, gy: piece.gy1 }),
  ];
}

function polygon(points: readonly ScreenPoint[]): Phaser.Geom.Point[] {
  return points.map((point) => new Phaser.Geom.Point(point.x, point.y));
}

function drawPrism(graphics: Phaser.GameObjects.Graphics, piece: Furniture, prism: Prism): void {
  const [top, right, bottom, left] = corners(piece);
  const raise = (point: ScreenPoint): ScreenPoint => ({ x: point.x, y: point.y - prism.height });
  graphics.fillStyle(prism.leftColor, 1).fillPoints(polygon([left, bottom, raise(bottom), raise(left)]), true);
  graphics.fillStyle(prism.rightColor, 1).fillPoints(polygon([bottom, right, raise(right), raise(bottom)]), true);
  graphics.fillStyle(prism.topColor, 1).fillPoints(polygon([raise(top), raise(right), raise(bottom), raise(left)]), true);
  graphics.lineStyle(1, OUTLINE_COLOR, OUTLINE_ALPHA);
  graphics.strokePoints(polygon([raise(top), raise(right), raise(bottom), raise(left)]), true);
  graphics.strokePoints(polygon([left, bottom, raise(bottom), raise(left)]), true);
  graphics.strokePoints(polygon([bottom, right, raise(right), raise(bottom)]), true);
}

function drawMonitor(graphics: Phaser.GameObjects.Graphics, piece: Furniture, deskHeight: number): void {
  const front: GridPoint = { gx: (piece.gx0 + piece.gx1) * HALF + MONITOR_SIDE_OFFSET_X, gy: piece.gy0 + MONITOR_FRONT_OFFSET_Y };
  const base = projectToScreen(front);
  const screenX = base.x - MONITOR_WIDTH * HALF;
  const screenY = base.y - deskHeight - MONITOR_STAND_HEIGHT - MONITOR_HEIGHT;
  graphics.fillStyle(MONITOR_LINE_COLOR, MONITOR_GLOW_ALPHA).fillRect(screenX - MONITOR_GLOW_PAD, screenY - MONITOR_GLOW_PAD, MONITOR_WIDTH + MONITOR_GLOW_PAD * 2, MONITOR_HEIGHT + MONITOR_GLOW_PAD * 2);
  graphics.fillStyle(OUTLINE_COLOR, 1).fillRect(base.x - 1, base.y - deskHeight - MONITOR_STAND_HEIGHT, 2, MONITOR_STAND_HEIGHT);
  graphics.fillStyle(OUTLINE_COLOR, 1).fillRect(screenX - 1, screenY - 1, MONITOR_WIDTH + 2, MONITOR_HEIGHT + 2);
  graphics.fillStyle(MONITOR_SCREEN_COLOR, 1).fillRect(screenX, screenY, MONITOR_WIDTH, MONITOR_HEIGHT);
  graphics.fillStyle(MONITOR_LINE_COLOR, 1).fillRect(screenX + 1, screenY + 2, MONITOR_WIDTH - 4, 1).fillRect(screenX + 1, screenY + 4, MONITOR_WIDTH - 6, 1);
}

function drawChair(graphics: Phaser.GameObjects.Graphics, piece: Furniture): void {
  const seat = projectToScreen({ gx: (piece.gx0 + piece.gx1) * HALF, gy: piece.gy0 - CHAIR_BACK_OFFSET });
  graphics.fillStyle(OUTLINE_COLOR, 1).fillRect(seat.x - CHAIR_WIDTH * HALF - 1, seat.y - CHAIR_HEIGHT - 1, CHAIR_WIDTH + 2, CHAIR_HEIGHT + 2);
  graphics.fillStyle(CHAIR_COLOR, 1).fillRect(seat.x - CHAIR_WIDTH * HALF, seat.y - CHAIR_HEIGHT, CHAIR_WIDTH, CHAIR_HEIGHT);
}
