/**
 * Builds the page script that opens the Add figure dialog and fills it with a sample figure.
 * The returned string runs inside the renderer (via STARTUP_OFFICE_SCRIPT), so it must stay plain browser JS.
 */
import { PAGE_HELPERS } from './pageHelpers.mts';

export interface SampleFigure {
  name: string;
  job: string;
  room: string;
  hairStyle: string;
  accessory: string;
  topColor: string;
  accessoryColor: string;
}

export const SAMPLE_FIGURE: SampleFigure = {
  name: 'Ella',
  job: 'Mobile dev',
  room: 'sales',
  hairStyle: 'long',
  accessory: 'headphones',
  topColor: '#ff6f91',
  accessoryColor: '#ffd866',
};

const OPEN_BUTTON_LABEL = 'Add figure';
const SUBMIT_BUTTON_LABEL = 'Add to office';
const DIALOG_SETTLE_MS = 200;
const BEFORE_SUBMIT_MS = 100;

const FIELD_IDS: Readonly<Record<keyof SampleFigure, string>> = {
  name: 'figure-name',
  job: 'figure-job',
  room: 'figure-room',
  hairStyle: 'figure-hair',
  accessory: 'figure-accessory',
  topColor: 'figure-topColor',
  accessoryColor: 'figure-accessoryColor',
};

function fillStatements(sample: SampleFigure): string {
  return (Object.keys(FIELD_IDS) as (keyof SampleFigure)[]).map((key: keyof SampleFigure): string => `setReactValue(document.getElementById(${JSON.stringify(FIELD_IDS[key])}), ${JSON.stringify(sample[key])});`).join('\n  ');
}

/** Page script: open the dialog, fill it, and optionally press "Add to office". */
export function buildFillScript(sample: SampleFigure, shouldSubmit: boolean): string {
  const submit = shouldSubmit ? `await wait(${BEFORE_SUBMIT_MS});\n  document.querySelector('[aria-label=${JSON.stringify(SUBMIT_BUTTON_LABEL)}]').click();` : '';
  return `(async () => {
  ${PAGE_HELPERS}
  document.querySelector('[aria-label=${JSON.stringify(OPEN_BUTTON_LABEL)}]').click();
  await wait(${DIALOG_SETTLE_MS});
  ${fillStatements(sample)}
  ${submit}
})();
`;
}
