/**
 * Renders the app icon from pixel rows to build/icon.png without any image library.
 * Run: npm run icon
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICON_SOURCE_SIZE = 32;
const ICON_OUTPUT_SIZE = 1024;
const SCALE = ICON_OUTPUT_SIZE / ICON_SOURCE_SIZE;
const CHANNELS = 4;
const TRANSPARENT = '.';
const OUTPUT_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'build', 'icon.png');

const PALETTE: Record<string, [number, number, number, number]> = {
  D: [14, 10, 26, 255],
  B: [42, 31, 77, 255],
  W: [74, 59, 122, 255],
  Y: [255, 216, 102, 255],
  H: [59, 35, 20, 255],
  h: [110, 70, 40, 255],
  S: [245, 201, 162, 255],
  E: [26, 19, 48, 255],
  w: [255, 255, 255, 255],
  R: [240, 160, 160, 255],
  M: [192, 96, 74, 255],
  K: [58, 123, 213, 255],
};

const BASE_ROWS: readonly string[] = [
  '....DDDDDDDDDDDDDDDDDDDDDDDD....',
  '..DDBBBBBBBBBBBBBBBBBBBBBBBBDD..',
  '.DBBBBBBBBBBBBBBBBBBBBBBBBBBBBD.',
  '.DBBBBBBBBDDDDDDDDDDDDDDBBBBBBD.',
  'DBBBBBBBBBDWWWWWWWWWWWWDBBBBBBBD',
  'DBBBBBBBBBDWWWWWWWWWWWWDBBBBBBBD',
  'DBBBBBBBBBDWYYWWYYWWYYWDBBBBBBBD',
  'DBBBBBBBBBDWYYWWYYWWYYWDBBBBBBBD',
  'DBBBBBBBBBDWWWWWWWWWWWWDBBBBBBBD',
  'DBBBBBBBBBDWYYWWYYWWYYWDBBBBBBBD',
  'DBBBBBBBBBDWYYWWYYWWYYWDBBBBBBBD',
  'DBBBBBBBBBDWWWWWWWWWWWWDBBBBBBBD',
  'DBBBBBBBBBDWYYWWYYWWYYWDBBBBBBBD',
  'DBBBBBBBBBDWYYWWYYWWYYWDBBBBBBBD',
  'DBBBBBBBBBDDDDDDDDDDDDDDBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  'DBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBD',
  '.DBBBBBBBBBBBBBBBBBBBBBBBBBBBBD.',
  '..DDBBBBBBBBBBBBBBBBBBBBBBBBDD..',
  '....DDDDDDDDDDDDDDDDDDDDDDDD....',
];

const HEAD_ROWS: readonly string[] = [
  '.....DDDDDDDD.....',
  '...DDHHHHHHHHDD...',
  '..DHHHhHHHHhHHHD..',
  '.DHHHHHHHHHHHHHHD.',
  '.DHHHHHHHHHHHHHHD.',
  '.DHHSSSSSSSSSSHHD.',
  '.DHSSSSSSSSSSSSHD.',
  '.DSSSSSSSSSSSSSSD.',
  '.DSSEEwSSSSEEwSSD.',
  '.DSSEEESSSSEEESSD.',
  '.DSSEEESSSSEEESSD.',
  '.DRRSSSSSSSSSSRRD.',
  '.DRRSSSSMMSSSSRRD.',
  '..DSSSSSSSSSSSSD..',
  '...DSSSSSSSSSSD...',
  '....DDSSSSSSDD....',
  '...DKKKKSSKKKKD...',
  '..DKKKKKKKKKKKKD..',
  '..DKKKKKKKKKKKKD..',
];
const HEAD_OFFSET_X = 7;
const HEAD_OFFSET_Y = 12;

function composite(base: readonly string[], overlay: readonly string[], offsetX: number, offsetY: number): string[] {
  return base.map((row, y) => {
    const overlayRow = overlay[y - offsetY];
    if (overlayRow === undefined) return row;
    return Array.from(row, (character, x) => {
      const overlayCharacter = overlayRow[x - offsetX];
      return overlayCharacter === undefined || overlayCharacter === TRANSPARENT ? character : overlayCharacter;
    }).join('');
  });
}

function rowsToRgba(rows: readonly string[]): Buffer {
  const raw = Buffer.alloc((ICON_OUTPUT_SIZE * CHANNELS + 1) * ICON_OUTPUT_SIZE);
  for (let outputY = 0; outputY < ICON_OUTPUT_SIZE; outputY += 1) {
    const rowStart = outputY * (ICON_OUTPUT_SIZE * CHANNELS + 1);
    raw[rowStart] = 0;
    const sourceRow = rows[Math.floor(outputY / SCALE)] ?? '';
    for (let outputX = 0; outputX < ICON_OUTPUT_SIZE; outputX += 1) {
      const character = sourceRow[Math.floor(outputX / SCALE)] ?? TRANSPARENT;
      const color = PALETTE[character] ?? [0, 0, 0, 0];
      raw.set(color, rowStart + 1 + outputX * CHANNELS);
    }
  }
  return raw;
}

const CRC_TABLE: number[] = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(rgba: Buffer): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(ICON_OUTPUT_SIZE, 0);
  header.writeUInt32BE(ICON_OUTPUT_SIZE, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // color type RGBA
  return Buffer.concat([signature, chunk('IHDR', header), chunk('IDAT', deflateSync(rgba)), chunk('IEND', Buffer.alloc(0))]);
}

const rows = composite(BASE_ROWS, HEAD_ROWS, HEAD_OFFSET_X, HEAD_OFFSET_Y);
mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, encodePng(rowsToRgba(rows)));
process.stdout.write(`wrote ${OUTPUT_PATH}\n`);
