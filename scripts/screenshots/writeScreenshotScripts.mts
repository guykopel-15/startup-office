/**
 * Writes the plain-JS page scripts used by the README captures into scripts/screenshots/generated/.
 * Run: npm run screenshot-scripts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SAMPLE_FIGURE, buildFillScript } from './fillAddFigure.mts';
import { buildAgentRunScript } from './agentRun.mts';
import { buildFigureStatesScript } from './figureStates.mts';
import { SAMPLE_FLOORS, buildFloorsReadyScript, buildNewFloorProgressScript } from './newFloor.mts';

const OUTPUT_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), 'generated');
const DIALOG_FILE = 'addFigureDialog.js';
const SEATED_FILE = 'addFigureSeated.js';
const FLOOR_PROGRESS_FILE = 'newFloorProgress.js';
const FLOORS_READY_FILE = 'floorsReady.js';
const AGENT_RUN_FILE = 'agentRun.js';
const FIGURE_STATES_FILE = 'figureStates.js';
const FIGURE_STATES_HOLD_MS = 45 * 1000;

mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
writeFileSync(join(OUTPUT_DIRECTORY, DIALOG_FILE), buildFillScript(SAMPLE_FIGURE, false));
writeFileSync(join(OUTPUT_DIRECTORY, SEATED_FILE), buildFillScript(SAMPLE_FIGURE, true));
const firstFloor = SAMPLE_FLOORS[0];
if (firstFloor === undefined) throw new Error('need a sample floor');
writeFileSync(join(OUTPUT_DIRECTORY, FLOOR_PROGRESS_FILE), buildNewFloorProgressScript(firstFloor));
writeFileSync(join(OUTPUT_DIRECTORY, FLOORS_READY_FILE), buildFloorsReadyScript(SAMPLE_FLOORS));
writeFileSync(join(OUTPUT_DIRECTORY, AGENT_RUN_FILE), buildAgentRunScript());
writeFileSync(join(OUTPUT_DIRECTORY, FIGURE_STATES_FILE), buildFigureStatesScript(FIGURE_STATES_HOLD_MS));
process.stdout.write(`wrote ${[DIALOG_FILE, SEATED_FILE, FLOOR_PROGRESS_FILE, FLOORS_READY_FILE, AGENT_RUN_FILE, FIGURE_STATES_FILE].join(', ')} to ${OUTPUT_DIRECTORY}\n`);
