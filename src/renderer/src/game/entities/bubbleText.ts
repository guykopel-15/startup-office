import { RunStatus } from '@shared/agents';

import type { AgentRun } from '@shared/agents';

const TOOL_NOTE_PREFIX = '▸';
const TOOL_VERBS: Readonly<Record<string, string>> = { Read: 'Reading', Grep: 'Searching', Glob: 'Listing', Bash: 'Running', Edit: 'Editing', Write: 'Writing', MultiEdit: 'Editing' };
const MARKDOWN_MARKS = /[*_`#>]+/g;
const WHITESPACE = /\s+/g;
const ELLIPSIS = '…';
export const BUBBLE_MAX_LENGTH = 56;
const STOPPED_TEXT = 'Stopped.';
const FAILED_PREFIX = 'Hmm, ';

/** Strips markdown and squeezes whitespace so a line reads as speech. */
export function cleanLine(line: string): string {
  return line.replace(MARKDOWN_MARKS, '').replace(WHITESPACE, ' ').trim();
}

export function truncate(text: string, maxLength: number = BUBBLE_MAX_LENGTH): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - ELLIPSIS.length).trimEnd()}${ELLIPSIS}`;
}

/** "▸ Read src/index.ts" becomes "Reading src/index.ts"; other lines are cleaned and truncated. */
export function bubbleTextForLine(line: string): string {
  if (!line.startsWith(TOOL_NOTE_PREFIX)) return truncate(cleanLine(line));
  const [tool = '', ...rest] = line.slice(TOOL_NOTE_PREFIX.length).trim().split(' ');
  const verb = TOOL_VERBS[tool] ?? tool;
  return truncate(`${verb} ${rest.join(' ')}`.replace(WHITESPACE, ' ').trim());
}

/** What the figure says right now for its latest run, or null when there is nothing to say. */
export function bubbleTextForRun(run: AgentRun | null): string | null {
  if (run === null) return null;
  if (run.status === RunStatus.Cancelled) return STOPPED_TEXT;
  if (run.status === RunStatus.Error) return truncate(`${FAILED_PREFIX}${cleanLine(run.error ?? '')}`);
  if (run.status === RunStatus.Done && run.result !== null) return truncate(cleanLine(run.result.split('\n').find((candidate: string): boolean => cleanLine(candidate) !== '') ?? ''));
  const lastLine = run.lines[run.lines.length - 1];
  return lastLine === undefined ? null : bubbleTextForLine(lastLine);
}
