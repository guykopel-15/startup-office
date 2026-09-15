/**
 * Builds the page scripts for the task 10 captures: the NPC dialog box on a figure, and the HUD
 * chat after an ask was routed and answered. The dialog script opens the box through the dev hook
 * `window.startupOfficeDev.clickFigure`; the chat script types into the real chat box.
 */
import { buildLocalFloorSetup } from './newFloor.mts';
import { pageScript } from './pageHelpers.mts';

const DIALOG_FIGURE_ID = 'pm';
const DIALOG_SETTLE_MS = 3000;
const CHAT_FIELD_ID = 'hud-chat';
const CHAT_ASK = '@Dan write a short test plan for the riskiest module';
const EXPAND_LABEL = 'Show chat history';
const DONE_CHIP_SELECTOR = '[title="1 done"]';
/** The ask queues behind the floor's intake runs, so the reply can take a while. */
const REPLY_TIMEOUT_MS = 15 * 60 * 1000;
const POLL_MS = 500;
const SETTLE_MS = 400;
const ENTER_KEY = 'Enter';

/** Page script: set up the local floor, hold while intake runs, then open the dialog box on the product manager. */
export function buildDialogBoxScript(holdMs: number): string {
  return pageScript(`${buildLocalFloorSetup()}
  await wait(${holdMs});
  window.startupOfficeDev.clickFigure(${JSON.stringify(DIALOG_FIGURE_ID)});
  await wait(${DIALOG_SETTLE_MS});`);
}

/** Page script: set up the local floor, send an ask from the HUD chat, wait for the figure's reply. */
export function buildHudChatScript(): string {
  return pageScript(`${buildLocalFloorSetup()}
  document.querySelector('[aria-label=${JSON.stringify(EXPAND_LABEL)}]').click();
  const chatInput = document.getElementById(${JSON.stringify(CHAT_FIELD_ID)});
  setReactValue(chatInput, ${JSON.stringify(CHAT_ASK)});
  chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(ENTER_KEY)}, bubbles: true }));
  {
    const started = Date.now();
    while (Date.now() - started < ${REPLY_TIMEOUT_MS}) {
      if (document.querySelector(${JSON.stringify(DONE_CHIP_SELECTOR)})) break;
      await wait(${POLL_MS});
    }
  }
  await wait(${SETTLE_MS});`);
}
