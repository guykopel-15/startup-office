import { RunStatus, TOOL_NOTE_PREFIX } from '@shared/agents';
import { LINE_SEPARATOR, WORD_SEPARATOR, cleanLine, truncate } from '@shared/text';

import type { AgentRun } from '@shared/agents';

const TOOL_VERBS: Readonly<Record<string, string>> = { Read: 'Reading', Grep: 'Searching', Glob: 'Listing', Bash: 'Running', Edit: 'Editing', Write: 'Writing', MultiEdit: 'Editing' };
const WHITESPACE = /\s+/g;
const PATH_SEPARATOR = '/';
export const BUBBLE_MAX_LENGTH = 56;
const STOPPED_TEXT = 'Stopped.';
const FAILED_PREFIX = 'Hmm, ';
const FAILED_FALLBACK = 'something went wrong.';
const CODE_FENCE = '```';

/** "/Users/me/repo/src/index.ts" reads as "index.ts"; words without a slash are untouched. */
function shortenPath(word: string): string {
  if (!word.includes(PATH_SEPARATOR)) return word;
  return word.split(PATH_SEPARATOR).filter((part: string): boolean => part !== '').pop() ?? word;
}

/** "▸ Read src/index.ts" becomes "Reading index.ts"; other lines are cleaned and truncated. */
export function bubbleTextForLine(line: string): string {
  if (!line.startsWith(TOOL_NOTE_PREFIX)) return truncate(cleanLine(line), BUBBLE_MAX_LENGTH);
  const [tool = '', ...rest] = line.slice(TOOL_NOTE_PREFIX.length).trim().split(WORD_SEPARATOR);
  const verb = TOOL_VERBS[tool] ?? tool;
  const words = [verb, ...rest.map(shortenPath)].filter((word: string): boolean => word !== '');
  return truncate(words.join(WORD_SEPARATOR).replace(WHITESPACE, WORD_SEPARATOR).trim(), BUBBLE_MAX_LENGTH);
}

/** Code fence lines are skipped: "```json" is not something to say. */
function firstNonEmptyLine(text: string): string {
  return (
    text
      .split(LINE_SEPARATOR)
      .filter((candidate: string): boolean => !candidate.trim().startsWith(CODE_FENCE))
      .map(cleanLine)
      .find((candidate: string): boolean => candidate !== '') ?? ''
  );
}

function lastNonEmptyLine(lines: readonly string[]): string {
  return lines.map(bubbleTextForLine).reverse().find((candidate: string): boolean => candidate !== '') ?? '';
}

function textForRun(run: AgentRun): string {
  switch (run.status) {
    case RunStatus.Cancelled:
      return STOPPED_TEXT;
    case RunStatus.Error:
      return truncate(`${FAILED_PREFIX}${cleanLine(run.error ?? '') || FAILED_FALLBACK}`, BUBBLE_MAX_LENGTH);
    case RunStatus.Done:
      return run.result === null ? lastNonEmptyLine(run.lines) : truncate(firstNonEmptyLine(run.result), BUBBLE_MAX_LENGTH);
    case RunStatus.Queued:
    case RunStatus.Running:
      return lastNonEmptyLine(run.lines);
  }
}

/** What the figure says right now for its latest run, or null when there is nothing to say. */
export function bubbleTextForRun(run: AgentRun | null): string | null {
  if (run === null) return null;
  const text = textForRun(run);
  return text === '' ? null : text;
}

/** The bubble to show next, or null when the run has nothing new to say since `lastText`. */
export function nextBubbleText(lastText: string | undefined, run: AgentRun | null): string | null {
  const text = bubbleTextForRun(run);
  return text === null || text === lastText ? null : text;
}
