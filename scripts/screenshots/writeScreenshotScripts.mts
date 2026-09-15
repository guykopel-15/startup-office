/**
 * Writes the plain-JS page scripts used by the README captures into scripts/screenshots/generated/.
 * Run: npm run screenshot-scripts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SAMPLE_FIGURE, buildFillScript } from './fillAddFigure.mts';
import { SAMPLE_FLOORS, buildFloorsReadyScript, buildNewFloorProgressScript } from './newFloor.mts';

const OUTPUT_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), 'generated');
const DIALOG_FILE = 'addFigureDialog.js';
const SEATED_FILE = 'addFigureSeated.js';
const FLOOR_PROGRESS_FILE = 'newFloorProgress.js';
const FLOORS_READY_FILE = 'floorsReady.js';

mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
writeFileSync(join(OUTPUT_DIRECTORY, DIALOG_FILE), buildFillScript(SAMPLE_FIGURE, false));
writeFileSync(join(OUTPUT_DIRECTORY, SEATED_FILE), buildFillScript(SAMPLE_FIGURE, true));
const firstFloor = SAMPLE_FLOORS[0];
if (firstFloor === undefined) throw new Error('need a sample floor');
writeFileSync(join(OUTPUT_DIRECTORY, FLOOR_PROGRESS_FILE), buildNewFloorProgressScript(firstFloor));
writeFileSync(join(OUTPUT_DIRECTORY, FLOORS_READY_FILE), buildFloorsReadyScript(SAMPLE_FLOORS));
process.stdout.write(`wrote ${[DIALOG_FILE, SEATED_FILE, FLOOR_PROGRESS_FILE, FLOORS_READY_FILE].join(', ')} to ${OUTPUT_DIRECTORY}\n`);
