import { TOOL_NOTE_PREFIX } from '../../shared/agents';

/** Pure parser for `claude --output-format stream-json` lines. */
export interface StreamText {
  kind: 'text';
  text: string;
}

export interface StreamToolUse {
  kind: 'tool';
  /** Short note such as "▸ Read src/index.ts". */
  text: string;
}

export interface StreamResult {
  kind: 'result';
  result: string | null;
  isError: boolean;
  costUsd: number | null;
  turns: number | null;
}

export type StreamItem = StreamText | StreamToolUse | StreamResult;

const TOOL_INPUT_KEYS: readonly string[] = ['file_path', 'pattern', 'path', 'command', 'query'];
const MAX_TOOL_INPUT_LENGTH = 80;

interface ContentBlock {
  type?: unknown;
  text?: unknown;
  name?: unknown;
  input?: unknown;
}

function describeToolInput(input: unknown): string {
  if (typeof input !== 'object' || input === null) return '';
  const record = input as Record<string, unknown>;
  const key = TOOL_INPUT_KEYS.find((candidate: string): boolean => typeof record[candidate] === 'string');
  if (key === undefined) return '';
  return String(record[key]).slice(0, MAX_TOOL_INPUT_LENGTH);
}

function fromContentBlock(block: ContentBlock): StreamItem | null {
  if (block.type === 'text' && typeof block.text === 'string' && block.text.trim() !== '') return { kind: 'text', text: block.text };
  if (block.type === 'tool_use' && typeof block.name === 'string') return { kind: 'tool', text: `${TOOL_NOTE_PREFIX} ${block.name} ${describeToolInput(block.input)}`.trim() };
  return null;
}

function fromResult(record: Record<string, unknown>): StreamResult {
  return {
    kind: 'result',
    result: typeof record['result'] === 'string' ? record['result'] : null,
    isError: record['is_error'] === true,
    costUsd: typeof record['total_cost_usd'] === 'number' ? record['total_cost_usd'] : null,
    turns: typeof record['num_turns'] === 'number' ? record['num_turns'] : null,
  };
}

/** Turns one JSON line into the items the office cares about; anything else (hooks, rate limits, init) is dropped. */
export function parseStreamLine(line: string): StreamItem[] {
  let record: Record<string, unknown>;
  try {
    record = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return [];
  }
  if (record['type'] === 'result') return [fromResult(record)];
  if (record['type'] !== 'assistant') return [];
  const message = record['message'] as { content?: unknown } | undefined;
  const content = Array.isArray(message?.content) ? (message.content as ContentBlock[]) : [];
  return content.map(fromContentBlock).filter((item: StreamItem | null): item is StreamItem => item !== null);
}
