/**
 * Builds the page scripts for the sprint captures: the team walking into the meeting room right
 * after a sprint starts, and the sprint board once the product manager's plan handed out the parts.
 */
import { buildLocalFloorSetup } from './newFloor.mts';
import { pageScript } from './pageHelpers.mts';

const START_LABEL = 'Start sprint';
const GOAL_FIELD_ID = 'sprint-goal';
const GOAL = 'Make the HUD readable on a 300px wide window';
const MEETING_SETTLE_MS = 9000;
const TASK_ROW_SELECTOR = '.sprint-board__task';
/** Planning queues behind the floor's intake runs, so the plan can take a while. */
const PLAN_TIMEOUT_MS = 15 * 60 * 1000;
const POLL_MS = 500;
const AFTER_PLAN_MS = 4000;
const ENTER_KEY = 'Enter';

function startSprint(): string {
  return `document.querySelector('[aria-label=${JSON.stringify(START_LABEL)}]').click();
  await wait(${POLL_MS});
  const goalInput = document.getElementById(${JSON.stringify(GOAL_FIELD_ID)});
  setReactValue(goalInput, ${JSON.stringify(GOAL)});
  goalInput.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(ENTER_KEY)}, bubbles: true }));`;
}

/** Page script: set up the local floor, start a sprint, capture while everyone walks to the meeting table. */
export function buildSprintMeetingScript(): string {
  return pageScript(`${buildLocalFloorSetup()}
  ${startSprint()}
  await wait(${MEETING_SETTLE_MS});`);
}

/** Page script: same start, then wait until the plan produced quests on the board. */
export function buildSprintBoardScript(): string {
  return pageScript(`${buildLocalFloorSetup()}
  ${startSprint()}
  {
    const started = Date.now();
    while (Date.now() - started < ${PLAN_TIMEOUT_MS}) {
      if (document.querySelector(${JSON.stringify(TASK_ROW_SELECTOR)})) break;
      await wait(${POLL_MS});
    }
  }
  await wait(${AFTER_PLAN_MS});`);
}
