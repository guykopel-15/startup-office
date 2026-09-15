/**
 * Builds the page script for the figure-states capture: one local floor, then wait while the
 * automatic intake runs so the office shows typing figures, badges and speech bubbles.
 */
import { SAMPLE_FLOORS, buildFloorsReadyScript } from './newFloor.mts';
import { pageScript } from './pageHelpers.mts';

/** Page script: set up the local sample floor and hold for `holdMs` so the runs are mid-flight (or finished). */
export function buildFigureStatesScript(holdMs: number): string {
  const localFloor = SAMPLE_FLOORS[1] ?? SAMPLE_FLOORS[0];
  const floorSetup = localFloor === undefined ? '' : `const floorResult = await ${buildFloorsReadyScript([localFloor]).trim()}\n  if (floorResult !== undefined) return floorResult;`;
  return pageScript(`${floorSetup}
  await wait(${holdMs});`);
}
