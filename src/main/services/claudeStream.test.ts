// @vitest-environment node
import { parseStreamLine } from './claudeStream';

describe('parseStreamLine', () => {
  it('extracts assistant text and tool notes', (): void => {
    const line = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Looking around.' }, { type: 'tool_use', name: 'Read', input: { file_path: 'src/index.ts' } }] } });
    expect(parseStreamLine(line)).toEqual([
      { kind: 'text', text: 'Looking around.' },
      { kind: 'tool', text: '▸ Read src/index.ts' },
    ]);
  });

  it('extracts the final result with cost and turns', (): void => {
    const line = JSON.stringify({ type: 'result', result: 'All good.', is_error: false, total_cost_usd: 0.12, num_turns: 3 });
    expect(parseStreamLine(line)).toEqual([{ kind: 'result', result: 'All good.', isError: false, costUsd: 0.12, turns: 3 }]);
  });

  it('drops system, rate-limit and malformed lines', (): void => {
    expect(parseStreamLine(JSON.stringify({ type: 'system', subtype: 'init' }))).toEqual([]);
    expect(parseStreamLine(JSON.stringify({ type: 'rate_limit_event' }))).toEqual([]);
    expect(parseStreamLine('not json')).toEqual([]);
  });
});
