/**
 * Builds the page script for the level-up capture: the local floor, an ask to one figure, then
 * capture right after its quest ends, while the XP numbers and the level-up burst are on screen.
 */
import { buildLocalFloorSetup } from './newFloor.mts';
import { pageScript } from './pageHelpers.mts';

const CHAT_FIELD_ID = 'hud-chat';
const CHAT_ASK = '@Dan list the three riskiest files and why';
const DONE_CHIP_SELECTOR = '[title="1 done"]';
/** The ask queues behind the floor's intake runs, so the reply can take a while. */
const REPLY_TIMEOUT_MS = 15 * 60 * 1000;
const POLL_MS = 100;
/** Long enough for the burst to bloom, short enough to catch it. */
const BURST_MS = 100;
const ENTER_KEY = 'Enter';

export function buildLevelUpScript(): string {
  return pageScript(`${buildLocalFloorSetup()}
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
  await wait(${BURST_MS});`);
}
