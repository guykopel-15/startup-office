/**
 * Builds the page script for the agent panel capture: one local floor, open the panel on the
 * first figure and wait for its intake run (started automatically) to finish.
 */
import { SAMPLE_FLOORS, buildFloorsReadyScript } from './newFloor.mts';
import { pageScript } from './pageHelpers.mts';

const AGENTS_BUTTON_LABEL = 'Agents';
const RUN_TIMEOUT_MS = 6 * 60 * 1000;
const POLL_MS = 500;
const SETTLE_MS = 400;
const DONE_STATUS_CLASS = 'run-output__status--done';
const ERROR_STATUS_CLASS = 'run-output__status--error';

/** Page script: set up the local sample floor, open the agent panel, wait for the first figure's run to end. */
export function buildAgentRunScript(): string {
  const localFloor = SAMPLE_FLOORS[1] ?? SAMPLE_FLOORS[0];
  const floorSetup = localFloor === undefined ? '' : `const floorResult = await ${buildFloorsReadyScript([localFloor]).trim()}\n  if (floorResult !== undefined) return floorResult;`;
  return pageScript(`${floorSetup}
  document.querySelector('[aria-label=${JSON.stringify(AGENTS_BUTTON_LABEL)}]').click();
  {
    const started = Date.now();
    while (Date.now() - started < ${RUN_TIMEOUT_MS}) {
      const status = document.querySelector('.run-output__status');
      if (status && (status.classList.contains(${JSON.stringify(DONE_STATUS_CLASS)}) || status.classList.contains(${JSON.stringify(ERROR_STATUS_CLASS)}))) break;
      await wait(${POLL_MS});
    }
  }
  await wait(${SETTLE_MS});`);
}
