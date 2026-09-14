/**
 * Writes the plain-JS page scripts used by the README captures into scripts/screenshots/generated/.
 * Run: npm run screenshot-scripts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SAMPLE_FIGURE, buildFillScript } from './fillAddFigure.mts';
import { SAMPLE_REPO_URL, buildLoadRepoDialogScript, buildLoadRepoDoneScript } from './loadRepo.mts';

const OUTPUT_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), 'generated');
const DIALOG_FILE = 'addFigureDialog.js';
const SEATED_FILE = 'addFigureSeated.js';
const REPO_DIALOG_FILE = 'loadRepoDialog.js';
const REPO_DONE_FILE = 'loadRepoDone.js';

mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
writeFileSync(join(OUTPUT_DIRECTORY, DIALOG_FILE), buildFillScript(SAMPLE_FIGURE, false));
writeFileSync(join(OUTPUT_DIRECTORY, SEATED_FILE), buildFillScript(SAMPLE_FIGURE, true));
writeFileSync(join(OUTPUT_DIRECTORY, REPO_DIALOG_FILE), buildLoadRepoDialogScript(SAMPLE_REPO_URL));
writeFileSync(join(OUTPUT_DIRECTORY, REPO_DONE_FILE), buildLoadRepoDoneScript(SAMPLE_REPO_URL));
process.stdout.write(`wrote ${[DIALOG_FILE, SEATED_FILE, REPO_DIALOG_FILE, REPO_DONE_FILE].join(', ')} to ${OUTPUT_DIRECTORY}\n`);
