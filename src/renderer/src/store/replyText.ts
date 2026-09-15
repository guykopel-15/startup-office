import { RunStatus } from '@shared/agents';

import type { AgentRun } from '@shared/agents';

/** How much of a result the chat and the dialog box quote before trailing off. */
export const REPLY_MAX_LENGTH = 320;
const LINE_SEPARATOR = '\n';
const ELLIPSIS = '…';
const MARKDOWN_MARKS = /[*`]+|^[#>\s]+/gm;
const BLANK_LINES = /\n{2,}/g;
const STOPPED_TEXT = 'I stopped that one.';
const FAILED_PREFIX = 'That one failed: ';
const FAILED_FALLBACK = 'something went wrong.';
const NO_RESULT_TEXT = 'Done, but I have nothing to report.';

/** Result text as a figure would say it: markdown marks gone, blank lines collapsed, cut at a code point. */
export function summarizeResult(result: string): string {
  const clean = result.replace(MARKDOWN_MARKS, '').replace(BLANK_LINES, LINE_SEPARATOR).trim();
  const characters = Array.from(clean);
  if (characters.length <= REPLY_MAX_LENGTH) return clean;
  return `${characters.slice(0, REPLY_MAX_LENGTH - ELLIPSIS.length).join('').trimEnd()}${ELLIPSIS}`;
}

/** The chat reply for a run that has ended. */
export function replyTextForRun(run: AgentRun): string {
  switch (run.status) {
    case RunStatus.Cancelled:
      return STOPPED_TEXT;
    case RunStatus.Error:
      return `${FAILED_PREFIX}${run.error?.trim() || FAILED_FALLBACK}`;
    case RunStatus.Done:
      return run.result === null || run.result.trim() === '' ? NO_RESULT_TEXT : summarizeResult(run.result);
    case RunStatus.Queued:
    case RunStatus.Running:
      return '';
  }
}
