import { RunStatus } from '@shared/agents';
import { LINE_SEPARATOR, isBlank, stripMarkdown, truncate } from '@shared/text';

import type { AgentRun } from '@shared/agents';

/** How much of a result the chat and the dialog box quote before trailing off. */
export const REPLY_MAX_LENGTH = 320;
const BLANK_LINES = /\n{2,}/g;
const STOPPED_TEXT = 'I stopped that one.';
const FAILED_PREFIX = 'That one failed: ';
const FAILED_FALLBACK = 'something went wrong.';
const NO_RESULT_TEXT = 'Done, but I have nothing to report.';

/** Result text as a figure would say it: markdown marks gone, blank lines collapsed, cut at a code point. */
export function summarizeResult(result: string): string {
  return truncate(stripMarkdown(result).replace(BLANK_LINES, LINE_SEPARATOR).trim(), REPLY_MAX_LENGTH);
}

/** The chat reply for a run that has ended. */
export function replyTextForRun(run: AgentRun): string {
  switch (run.status) {
    case RunStatus.Cancelled:
      return STOPPED_TEXT;
    case RunStatus.Error:
      return `${FAILED_PREFIX}${run.error?.trim() || FAILED_FALLBACK}`;
    case RunStatus.Done:
      return run.result === null || isBlank(run.result) ? NO_RESULT_TEXT : summarizeResult(run.result);
    case RunStatus.Queued:
    case RunStatus.Running:
      return '';
  }
}
