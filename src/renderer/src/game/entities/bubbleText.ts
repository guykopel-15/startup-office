import { RunStatus, TOOL_NOTE_PREFIX } from '@shared/agents';

import type { AgentRun } from '@shared/agents';

const TOOL_VERBS: Readonly<Record<string, string>> = { Read: 'Reading', Grep: 'Searching', Glob: 'Listing', Bash: 'Running', Edit: 'Editing', Write: 'Writing', MultiEdit: 'Editing' };
/** Emphasis and code marks anywhere, heading and quote marks at the start of the line. */
const MARKDOWN_MARKS = /[*`]+|^[#>\s]+/g;
const WHITESPACE = /\s+/g;
const PATH_SEPARATOR = '/';
const WORD_SEPARATOR = ' ';
const LINE_SEPARATOR = '\n';
const ELLIPSIS = '…';
export const BUBBLE_MAX_LENGTH = 56;
const STOPPED_TEXT = 'Stopped.';
const FAILED_PREFIX = 'Hmm, ';
const FAILED_FALLBACK = 'something went wrong.';

/** Strips markdown and squeezes whitespace so a line reads as speech. */
export function cleanLine(line: string): string {
  return line.replace(MARKDOWN_MARKS, '').replace(WHITESPACE, WORD_SEPARATOR).trim();
}

/** Cuts by code point so an emoji at the edge is dropped whole, never split. */
export function truncate(text: string, maxLength: number = BUBBLE_MAX_LENGTH): string {
  const characters = Array.from(text);
  if (characters.length <= maxLength) return text;
  return `${characters.slice(0, maxLength - ELLIPSIS.length).join('').trimEnd()}${ELLIPSIS}`;
}

/** "/Users/me/repo/src/index.ts" reads as "index.ts"; words without a slash are untouched. */
function shortenPath(word: string): string {
  if (!word.includes(PATH_SEPARATOR)) return word;
  return word.split(PATH_SEPARATOR).filter((part: string): boolean => part !== '').pop() ?? word;
}

/** "▸ Read src/index.ts" becomes "Reading index.ts"; other lines are cleaned and truncated. */
export function bubbleTextForLine(line: string): string {
  if (!line.startsWith(TOOL_NOTE_PREFIX)) return truncate(cleanLine(line));
  const [tool = '', ...rest] = line.slice(TOOL_NOTE_PREFIX.length).trim().split(WORD_SEPARATOR);
  const verb = TOOL_VERBS[tool] ?? tool;
  const words = [verb, ...rest.map(shortenPath)].filter((word: string): boolean => word !== '');
  return truncate(words.join(WORD_SEPARATOR));
}

function firstNonEmptyLine(text: string): string {
  return text.split(LINE_SEPARATOR).map(cleanLine).find((candidate: string): boolean => candidate !== '') ?? '';
}

function lastNonEmptyLine(lines: readonly string[]): string {
  return lines.map(bubbleTextForLine).reverse().find((candidate: string): boolean => candidate !== '') ?? '';
}

function textForRun(run: AgentRun): string {
  switch (run.status) {
    case RunStatus.Cancelled:
      return STOPPED_TEXT;
    case RunStatus.Error:
      return truncate(`${FAILED_PREFIX}${cleanLine(run.error ?? '') || FAILED_FALLBACK}`);
    case RunStatus.Done:
      return run.result === null ? lastNonEmptyLine(run.lines) : truncate(firstNonEmptyLine(run.result));
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
