/**
 * Builds the page script for the figure-states capture: one local floor, then hold while the
 * automatic intake runs so the office shows typing figures, badges and speech bubbles.
 */
import { buildLocalFloorSetup } from './newFloor.mts';
import { pageScript } from './pageHelpers.mts';

/** Page script: set up the local sample floor and hold for `holdMs` so the runs are mid-flight. */
export function buildFigureStatesScript(holdMs: number): string {
  return pageScript(`${buildLocalFloorSetup()}
  await wait(${holdMs});`);
}
