import { RunMode, RunStatus } from '@shared/agents';
import { BUBBLE_MAX_LENGTH, bubbleTextForLine, bubbleTextForRun, cleanLine, nextBubbleText, truncate } from './bubbleText';

import type { AgentRun } from '@shared/agents';

const RUN: AgentRun = { id: 'r', floorId: 'f', figureId: 'x', prompt: 'p', mode: RunMode.ReadOnly, status: RunStatus.Running, lines: [], result: null, error: null, costUsd: null, turns: null, startedAt: '', endedAt: null };
const ELLIPSIS = '…';

describe('cleanLine and truncate', () => {
  it('strips emphasis, code marks and leading heading marks but keeps underscores and comparisons', (): void => {
    expect(cleanLine('**Top 3 risks**   here')).toBe('Top 3 risks here');
    expect(cleanLine('# Report')).toBe('Report');
    expect(cleanLine('> quoted')).toBe('quoted');
    expect(cleanLine('`snake_case` and a > b')).toBe('snake_case and a > b');
  });

  it('truncates on code points with an ellipsis', (): void => {
    const long = 'a'.repeat(100);
    expect(truncate(long)).toBe(`${'a'.repeat(BUBBLE_MAX_LENGTH - 1)}${ELLIPSIS}`);
    expect(truncate('short')).toBe('short');
    expect(truncate('ab ', 3)).toBe('ab ');
    expect(Array.from(truncate(`${'😀'.repeat(60)}`))).toHaveLength(BUBBLE_MAX_LENGTH);
  });
});

describe('bubbleTextForLine', () => {
  it('turns tool notes into verbs and shortens paths to their last segment', (): void => {
    expect(bubbleTextForLine('▸ Read /Users/me/repo/src/index.ts')).toBe('Reading index.ts');
    expect(bubbleTextForLine('▸ Grep TODO')).toBe('Searching TODO');
    expect(bubbleTextForLine('▸ Glob **/*.ts')).toBe('Listing *.ts');
    expect(bubbleTextForLine('▸ Bash ls -R docs/')).toBe('Running ls -R docs');
    expect(bubbleTextForLine('▸ ')).toBe('');
  });
});

describe('bubbleTextForRun', () => {
  it('returns null when there is nothing to say', (): void => {
    expect(bubbleTextForRun(null)).toBeNull();
    expect(bubbleTextForRun(RUN)).toBeNull();
    expect(bubbleTextForRun({ ...RUN, lines: ['   ', '```', '▸ '] })).toBeNull();
    expect(bubbleTextForRun({ ...RUN, status: RunStatus.Done, result: ' \n\n' })).toBeNull();
  });

  it('picks the last non-empty line while running and the first result line when done', (): void => {
    expect(bubbleTextForRun({ ...RUN, lines: ['first', '▸ Glob src', '   '] })).toBe('Listing src');
    expect(bubbleTextForRun({ ...RUN, status: RunStatus.Done, result: '\n# Report\nAll good.' })).toBe('Report');
    expect(bubbleTextForRun({ ...RUN, status: RunStatus.Done, result: null, lines: ['last words'] })).toBe('last words');
  });

  it('speaks the error, a fallback when it is empty, and Stopped. when cancelled', (): void => {
    expect(bubbleTextForRun({ ...RUN, status: RunStatus.Error, error: 'exit 1' })).toBe('Hmm, exit 1');
    expect(bubbleTextForRun({ ...RUN, status: RunStatus.Error, error: null })).toBe('Hmm, something went wrong.');
    expect(bubbleTextForRun({ ...RUN, status: RunStatus.Cancelled })).toBe('Stopped.');
  });
});

describe('nextBubbleText', () => {
  it('returns the text only when it differs from the last one said', (): void => {
    const run: AgentRun = { ...RUN, lines: ['hello'] };
    expect(nextBubbleText(undefined, run)).toBe('hello');
    expect(nextBubbleText('hello', run)).toBeNull();
    expect(nextBubbleText('hello', { ...run, lines: ['hello', 'again'] })).toBe('again');
    expect(nextBubbleText('hello', null)).toBeNull();
  });
});
