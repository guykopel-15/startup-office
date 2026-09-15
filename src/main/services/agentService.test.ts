// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { vi } from 'vitest';

import { AgentErrorCode, MAX_CONCURRENT_RUNS, RunMode, RunStatus } from '../../shared/agents';
import { AgentService } from './agentService';
import { buildClaudeArguments } from './claudeRunner';

import type { AgentEvent, StartRunInput } from '../../shared/agents';
import type { ClaudeRunner, RunningClaude } from './claudeRunner';
import type { StreamItem } from './claudeStream';

const INPUT: StartRunInput = { floorId: 'f', figureId: 'frontend', cwd: '/tmp', prompt: 'look around', mode: RunMode.ReadOnly };
let binaryDirectory = '';
let fakeBinary = '';

beforeEach(async (): Promise<void> => {
  binaryDirectory = await mkdtemp(join(tmpdir(), 'claude-'));
  fakeBinary = join(binaryDirectory, 'claude');
  await writeFile(fakeBinary, '#!/bin/sh\necho 1.0.0\n', { mode: 0o755 });
});

afterEach(async (): Promise<void> => {
  await rm(binaryDirectory, { recursive: true, force: true });
});

/** A runner whose sessions finish when the test releases them. */
function controllableRunner(): { runner: ClaudeRunner; release: (index: number, items?: StreamItem[]) => void; started: number } {
  const resolvers: ((code: number | null) => void)[] = [];
  const handlers: ((item: StreamItem) => void)[] = [];
  const state = { started: 0 };
  const runner: ClaudeRunner = (_input: StartRunInput, _binary: string, onItem: (item: StreamItem) => void): RunningClaude => {
    const index = state.started;
    state.started += 1;
    handlers.push(onItem);
    return {
      finished: new Promise<number | null>((resolve: (code: number | null) => void): void => {
        resolvers.push(resolve);
      }),
      cancel: (): void => {
        resolvers[index]?.(null);
      },
    };
  };
  const release = (index: number, items: StreamItem[] = []): void => {
    items.forEach((item: StreamItem): void => handlers[index]?.(item));
    resolvers[index]?.(0);
  };
  return { runner, release, get started(): number { return state.started; } };
}

describe('AgentService', () => {
  it('reports claude as unavailable when no binary can be found', async (): Promise<void> => {
    const service = new AgentService(undefined, '/nonexistent', controllableRunner().runner, []);
    expect((await service.check()).isAvailable).toBe(false);
    await expect(service.start(INPUT)).rejects.toMatchObject({ code: AgentErrorCode.ClaudeNotFound });
  });

  it('finds the binary on PATH and reports its version', async (): Promise<void> => {
    const service = new AgentService(undefined, binaryDirectory, controllableRunner().runner, []);
    expect(await service.check()).toMatchObject({ isAvailable: true, version: '1.0.0', path: fakeBinary });
  });

  it('streams chunks and finishes with the result, cost and turns', async (): Promise<void> => {
    const control = controllableRunner();
    const service = new AgentService(fakeBinary, undefined, control.runner);
    const events: AgentEvent[] = [];
    service.onEvent((event: AgentEvent): void => {
      events.push(event);
    });
    const runId = await service.start(INPUT);
    control.release(0, [
      { kind: 'text', text: 'Reading.' },
      { kind: 'result', result: 'Report.', isError: false, costUsd: 0.5, turns: 4 },
    ]);
    await vi.waitFor((): void => expect(events.some((event: AgentEvent): boolean => event.type === 'done')).toBe(true));
    expect(events.map((event: AgentEvent): string => event.type)).toEqual(['status', 'status', 'chunk', 'done']);
    expect(events[3]).toMatchObject({ runId, status: RunStatus.Done, result: 'Report.', costUsd: 0.5, turns: 4 });
  });

  it('runs at most the concurrency cap at once and starts the rest as slots free up', async (): Promise<void> => {
    const control = controllableRunner();
    const service = new AgentService(fakeBinary, undefined, control.runner);
    const total = MAX_CONCURRENT_RUNS + 2;
    for (let index = 0; index < total; index += 1) await service.start(INPUT);
    expect(control.started).toBe(MAX_CONCURRENT_RUNS);
    control.release(0);
    await vi.waitFor((): void => expect(control.started).toBe(MAX_CONCURRENT_RUNS + 1));
  });

  it('cancels a queued run without starting it and marks a running one cancelled', async (): Promise<void> => {
    const control = controllableRunner();
    const service = new AgentService(fakeBinary, undefined, control.runner);
    const done: AgentEvent[] = [];
    service.onEvent((event: AgentEvent): void => {
      if (event.type === 'done') done.push(event);
    });
    const ids: string[] = [];
    for (let index = 0; index < MAX_CONCURRENT_RUNS + 1; index += 1) ids.push(await service.start(INPUT));
    const queuedId = ids[ids.length - 1] as string;
    service.cancel(queuedId);
    expect(done).toEqual([expect.objectContaining({ runId: queuedId, status: RunStatus.Cancelled })]);
    const runningId = ids[0] as string;
    service.cancel(runningId);
    await vi.waitFor((): void => expect(done).toHaveLength(2));
    expect(done[1]).toMatchObject({ runId: runningId, status: RunStatus.Cancelled });
    expect((): void => service.cancel('run-999')).toThrow();
  });
});

describe('buildClaudeArguments', () => {
  it('locks read-only runs to read tools and lets edit runs accept edits', (): void => {
    const readOnly = buildClaudeArguments(INPUT);
    expect(readOnly).toContain('stream-json');
    expect(readOnly).toContain('Read');
    expect(readOnly).not.toContain('Edit');
    expect(buildClaudeArguments({ ...INPUT, mode: RunMode.Edit })).toContain('acceptEdits');
  });
});
