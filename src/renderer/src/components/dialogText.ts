import { RunStatus } from '@shared/agents';
import { bubbleTextForRun } from '../game/entities/bubbleText';
import { replyTextForRun } from '../store/replyText';

import type { AgentRun } from '@shared/agents';
import type { Figure } from '@shared/figures';

const GREETING_PREFIX = "Hi boss! I'm ";
const GREETING_INFIX = ', the ';
const GREETING_SUFFIX = '. What do you need?';
const QUEUED_TEXT = "I'm in the queue, boss. I'll get to it in a moment.";
const WORKING_PREFIX = 'On it, boss. ';
const WORKING_FALLBACK = 'Give me a minute.';

/** What the figure says when the dialog box opens, from its latest run. */
export function dialogGreeting(figure: Figure, latestRun: AgentRun | null): string {
  if (latestRun === null) return `${GREETING_PREFIX}${figure.name}${GREETING_INFIX}${figure.job.toLowerCase()}${GREETING_SUFFIX}`;
  switch (latestRun.status) {
    case RunStatus.Queued:
      return QUEUED_TEXT;
    case RunStatus.Running:
      return `${WORKING_PREFIX}${bubbleTextForRun(latestRun) ?? WORKING_FALLBACK}`;
    case RunStatus.Done:
    case RunStatus.Error:
    case RunStatus.Cancelled:
      return replyTextForRun(latestRun);
  }
}
