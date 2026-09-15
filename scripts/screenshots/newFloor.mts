/**
 * Builds page scripts for the floors captures: the New floor dialog mid-progress, and the panel
 * with two floors set up. The returned strings run inside the renderer.
 */
import { pageScript } from './pageHelpers.mts';

const NEW_FLOOR_BUTTON_LABEL = 'New floor';
const SUBMIT_BUTTON_LABEL = 'Create floor';
const SOURCE_FIELD_ID = 'floor-source';
const NAME_FIELD_ID = 'floor-name';
const DIALOG_SETTLE_MS = 200;
const PROGRESS_SNAPSHOT_MS = 700;
const SETUP_TIMEOUT_MS = 60000;
const POLL_MS = 200;
const READY_TAB_CLASS = 'floor-tab--ready';

export interface SampleFloor {
  name: string;
  source: string;
}

export const SAMPLE_FLOORS: readonly SampleFloor[] = [
  { name: 'Startup Office', source: 'https://github.com/guykopel-15/startup-office' },
  { name: 'Claude Stick', source: '~/claude-stick' },
];

function submitFloor(floor: SampleFloor): string {
  return `document.querySelector('[aria-label=${JSON.stringify(NEW_FLOOR_BUTTON_LABEL)}]').click();
  await wait(${DIALOG_SETTLE_MS});
  setReactValue(document.getElementById(${JSON.stringify(SOURCE_FIELD_ID)}), ${JSON.stringify(floor.source)});
  setReactValue(document.getElementById(${JSON.stringify(NAME_FIELD_ID)}), ${JSON.stringify(floor.name)});
  document.querySelector('[aria-label=${JSON.stringify(SUBMIT_BUTTON_LABEL)}]').click();`;
}

/** Polls until `count` tabs are ready; braces keep each loop's variables local so the snippet can repeat. */
function waitForReadyTabs(count: number): string {
  return `{
    const started = Date.now();
    while (Date.now() - started < ${SETUP_TIMEOUT_MS}) {
      if (document.querySelectorAll(${JSON.stringify(`.${READY_TAB_CLASS}`)}).length >= ${count}) break;
      await wait(${POLL_MS});
    }
  }
  await wait(${PROGRESS_SNAPSHOT_MS});`;
}

/** Page script: submit one floor and capture while the team is still being hired. */
export function buildNewFloorProgressScript(floor: SampleFloor): string {
  return pageScript(`${submitFloor(floor)}
  await wait(${PROGRESS_SNAPSHOT_MS});`);
}

/** Page script: set up every sample floor, wait until all are ready, then select the first one. */
export function buildFloorsReadyScript(floors: readonly SampleFloor[]): string {
  const submissions = floors.map((floor: SampleFloor): string => `${submitFloor(floor)}\n  ${waitForReadyTabs(1)}\n  await wait(${DIALOG_SETTLE_MS});`).join('\n  ');
  return pageScript(`${submissions}
  ${waitForReadyTabs(floors.length)}
  document.querySelector('.floor-tab__select').click();`);
}

/** Statements that set up the local sample floor and bail out with the page error, if any. */
export function buildLocalFloorSetup(): string {
  const localFloor = SAMPLE_FLOORS[1] ?? SAMPLE_FLOORS[0];
  if (localFloor === undefined) return '';
  return `const floorResult = await ${buildFloorsReadyScript([localFloor]).trim()}\n  if (floorResult !== undefined) return floorResult;`;
}
