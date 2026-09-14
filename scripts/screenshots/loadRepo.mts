/**
 * Builds page scripts for the Load repo captures: the open dialog with a URL pasted, and the
 * navbar after a real clone has finished. The returned strings run inside the renderer.
 */
const OPEN_BUTTON_LABEL = 'Load repo';
const SUBMIT_BUTTON_LABEL = 'Clone';
const URL_FIELD_ID = 'repo-url';
const DIALOG_SETTLE_MS = 200;
const CLONE_TIMEOUT_MS = 60000;
const POLL_MS = 250;
const READY_CLASS = 'repo-chip--ready';
const ERROR_CLASS = 'repo-chip--error';

export const SAMPLE_REPO_URL = 'https://github.com/guykopel-15/startup-office';

function preamble(url: string): string {
  return `const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  // React controlled inputs only notice a value set through the native setter followed by an input event.
  const setReactValue = (element, value) => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  };
  document.querySelector('[aria-label=${JSON.stringify(OPEN_BUTTON_LABEL)}]').click();
  await wait(${DIALOG_SETTLE_MS});
  setReactValue(document.getElementById(${JSON.stringify(URL_FIELD_ID)}), ${JSON.stringify(url)});`;
}

/** Page script: open the dialog and paste the URL. */
export function buildLoadRepoDialogScript(url: string): string {
  return `(async () => {\n  ${preamble(url)}\n})();\n`;
}

/** Page script: open the dialog, paste the URL, press Clone, and wait for the chip to settle. */
export function buildLoadRepoDoneScript(url: string): string {
  return `(async () => {
  ${preamble(url)}
  await wait(${DIALOG_SETTLE_MS});
  document.querySelector('[aria-label=${JSON.stringify(SUBMIT_BUTTON_LABEL)}]').click();
  const started = Date.now();
  while (Date.now() - started < ${CLONE_TIMEOUT_MS}) {
    const chip = document.querySelector('[role="status"]');
    if (chip.classList.contains(${JSON.stringify(READY_CLASS)}) || chip.classList.contains(${JSON.stringify(ERROR_CLASS)})) break;
    await wait(${POLL_MS});
  }
})();
`;
}
