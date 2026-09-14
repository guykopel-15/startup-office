/**
 * Writes the plain-JS page scripts used by the README captures into scripts/screenshots/generated/.
 * Run: npm run screenshot-scripts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SAMPLE_FIGURE, buildFillScript } from './fillAddFigure.mts';

const OUTPUT_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), 'generated');
const DIALOG_FILE = 'addFigureDialog.js';
const SEATED_FILE = 'addFigureSeated.js';

mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
writeFileSync(join(OUTPUT_DIRECTORY, DIALOG_FILE), buildFillScript(SAMPLE_FIGURE, false));
writeFileSync(join(OUTPUT_DIRECTORY, SEATED_FILE), buildFillScript(SAMPLE_FIGURE, true));
process.stdout.write(`wrote ${DIALOG_FILE} and ${SEATED_FILE} to ${OUTPUT_DIRECTORY}\n`);
