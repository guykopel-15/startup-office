/** Small text helpers shared by speech bubbles, chat replies and forms. */

export const ELLIPSIS = '…';
export const LINE_SEPARATOR = '\n';
export const WORD_SEPARATOR = ' ';
const WHITESPACE = /\s+/g;
/** Emphasis and code marks anywhere, heading and quote marks at the start of a line. */
const MARKDOWN_MARKS = /[*`]+|^[#>\s]+/gm;

export function isBlank(text: string): boolean {
  return text.trim() === '';
}

/** Cuts by code point so an emoji at the edge is dropped whole, never split. */
export function truncate(text: string, maxLength: number): string {
  const characters = Array.from(text);
  if (characters.length <= maxLength) return text;
  return `${characters.slice(0, maxLength - ELLIPSIS.length).join('').trimEnd()}${ELLIPSIS}`;
}

/** Strips markdown marks from every line; keeps underscores and comparisons as they read fine aloud. */
export function stripMarkdown(text: string): string {
  return text.replace(MARKDOWN_MARKS, '');
}

/** One line of speech: markdown gone, whitespace squeezed. */
export function cleanLine(line: string): string {
  return stripMarkdown(line).replace(WHITESPACE, WORD_SEPARATOR).trim();
}
