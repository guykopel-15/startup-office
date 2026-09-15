import { RunMode, RunStatus } from '@shared/agents';
import { BUBBLE_MAX_LENGTH, bubbleTextForLine, bubbleTextForRun, cleanLine, truncate } from './bubbleText';

import type { AgentRun } from '@shared/agents';

const RUN: AgentRun = { id: 'r', floorId: 'f', figureId: 'x', prompt: 'p', mode: RunMode.ReadOnly, status: RunStatus.Running, lines: [], result: null, error: null, costUsd: null, turns: null, startedAt: '', endedAt: null };

describe('bubble text', () => {
  it('cleans markdown, truncates long lines and turns tool notes into verbs', (): void => {
    expect(cleanLine('**Top 3 risks**   here')).toBe('Top 3 risks here');
    expect(truncate('a'.repeat(100))).toHaveLength(BUBBLE_MAX_LENGTH);
    expect(bubbleTextForLine('▸ Read src/index.ts')).toBe('Reading src/index.ts');
    expect(bubbleTextForLine('▸ Grep TODO')).toBe('Searching TODO');
  });

  it('picks the last line while running, the first result line when done, and the error when failed', (): void => {
    expect(bubbleTextForRun(null)).toBeNull();
    expect(bubbleTextForRun({ ...RUN, lines: ['first', '▸ Glob **/*.ts'] })).toBe('Listing **/*.ts');
    expect(bubbleTextForRun({ ...RUN, status: RunStatus.Done, result: '\n# Report\nAll good.' })).toBe('Report');
    expect(bubbleTextForRun({ ...RUN, status: RunStatus.Error, error: 'exit 1' })).toBe('Hmm, exit 1');
    expect(bubbleTextForRun({ ...RUN, status: RunStatus.Cancelled })).toBe('Stopped.');
  });
});
