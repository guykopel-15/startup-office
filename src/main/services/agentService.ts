import { AgentErrorCode, MAX_CONCURRENT_RUNS, RunStatus } from '../../shared/agents';
import { createLogger } from '../../shared/logger';
import { ServiceError } from '../../shared/response';
import { FALLBACK_LOCATIONS, checkClaude, resolveClaudeBinary, runClaude } from './claudeRunner';

import type { AgentEvent, ClaudeAvailability, StartRunInput } from '../../shared/agents';
import type { ClaudeRunner, RunningClaude } from './claudeRunner';
import type { StreamItem } from './claudeStream';

export type AgentEventListener = (event: AgentEvent) => void;

interface QueuedRun {
  id: string;
  input: StartRunInput;
  running: RunningClaude | null;
  isCancelled: boolean;
}

const logger = createLogger('agents');
const RUN_ID_PREFIX = 'run-';
const CANCELLED_MESSAGE = 'Stopped by the CEO';
const NON_ZERO_EXIT_MESSAGE = 'claude exited with code';
const NOT_FOUND_MESSAGE = 'Claude Code (`claude`) was not found on this machine';

/** Queues `claude` sessions, runs a few at a time, and streams their output as events. */
export class AgentService {
  private readonly runs = new Map<string, QueuedRun>();
  private readonly queue: QueuedRun[] = [];
  private readonly listeners = new Set<AgentEventListener>();
  private readonly runner: ClaudeRunner;
  private readonly binaryOverride: string | undefined;
  private readonly pathVariable: string | undefined;
  private readonly fallbackLocations: readonly string[];
  private binary: string | null = null;
  private activeCount = 0;
  private nextRunNumber = 1;

  constructor(binaryOverride: string | undefined, pathVariable: string | undefined, runner: ClaudeRunner = runClaude, fallbackLocations: readonly string[] = FALLBACK_LOCATIONS) {
    this.binaryOverride = binaryOverride;
    this.pathVariable = pathVariable;
    this.runner = runner;
    this.fallbackLocations = fallbackLocations;
  }

  onEvent(listener: AgentEventListener): () => void {
    this.listeners.add(listener);
    return (): void => {
      this.listeners.delete(listener);
    };
  }

  /** Locates the binary and proves it runs. Cached path is reused by later runs. */
  async check(): Promise<ClaudeAvailability> {
    this.binary = await resolveClaudeBinary(this.binaryOverride, this.pathVariable, this.fallbackLocations);
    return checkClaude(this.binary);
  }

  /** Queues a run and returns its id at once; output arrives through events. */
  async start(input: StartRunInput): Promise<string> {
    if (this.binary === null) this.binary = await resolveClaudeBinary(this.binaryOverride, this.pathVariable, this.fallbackLocations);
    if (this.binary === null) throw new ServiceError(AgentErrorCode.ClaudeNotFound, NOT_FOUND_MESSAGE);
    const run: QueuedRun = { id: `${RUN_ID_PREFIX}${this.nextRunNumber}`, input, running: null, isCancelled: false };
    this.nextRunNumber += 1;
    this.runs.set(run.id, run);
    // Priority runs go ahead of ordinary ones but behind earlier priority runs, so two meetings keep their order.
    const firstOrdinary = this.queue.findIndex((queued: QueuedRun): boolean => queued.input.isPriority !== true);
    if (input.isPriority === true && firstOrdinary !== -1) this.queue.splice(firstOrdinary, 0, run);
    else this.queue.push(run);
    this.emit({ type: 'status', runId: run.id, status: RunStatus.Queued });
    this.pump();
    return run.id;
  }

  cancel(runId: string): void {
    const run = this.runs.get(runId);
    if (run === undefined) throw new ServiceError(AgentErrorCode.UnknownRun, `Unknown run ${runId}`);
    run.isCancelled = true;
    if (run.running !== null) return run.running.cancel();
    const index = this.queue.indexOf(run);
    if (index !== -1) this.queue.splice(index, 1);
    this.finish(run, RunStatus.Cancelled, null, CANCELLED_MESSAGE, null, null);
  }

  private pump(): void {
    while (this.activeCount < MAX_CONCURRENT_RUNS && this.queue.length > 0) {
      const run = this.queue.shift();
      if (run !== undefined) void this.execute(run);
    }
  }

  private async execute(run: QueuedRun): Promise<void> {
    if (this.binary === null) return;
    this.activeCount += 1;
    this.emit({ type: 'status', runId: run.id, status: RunStatus.Running });
    let last: { result: string | null; isError: boolean; costUsd: number | null; turns: number | null } = { result: null, isError: false, costUsd: null, turns: null };
    const handleItem = (item: StreamItem): void => {
      if (item.kind === 'result') last = item;
      else this.emit({ type: 'chunk', runId: run.id, text: item.text });
    };
    try {
      run.running = this.runner(run.input, this.binary, handleItem);
      const code = await run.running.finished;
      this.settle(run, code, last);
    } catch (error: unknown) {
      logger.error('claude run failed', { runId: run.id, error });
      this.finish(run, RunStatus.Error, null, error instanceof Error ? error.message : String(error), null, null);
    }
    this.activeCount -= 1;
    this.pump();
  }

  private settle(run: QueuedRun, code: number | null, last: { result: string | null; isError: boolean; costUsd: number | null; turns: number | null }): void {
    if (run.isCancelled) return this.finish(run, RunStatus.Cancelled, last.result, CANCELLED_MESSAGE, last.costUsd, last.turns);
    if (code !== 0 || last.isError) return this.finish(run, RunStatus.Error, last.result, last.result ?? `${NON_ZERO_EXIT_MESSAGE} ${String(code)}`, last.costUsd, last.turns);
    this.finish(run, RunStatus.Done, last.result, null, last.costUsd, last.turns);
  }

  private finish(run: QueuedRun, status: RunStatus, result: string | null, error: string | null, costUsd: number | null, turns: number | null): void {
    this.runs.delete(run.id);
    this.emit({ type: 'done', runId: run.id, status, result, error, costUsd, turns });
  }

  private emit(event: AgentEvent): void {
    this.listeners.forEach((listener: AgentEventListener): void => {
      try {
        listener(event);
      } catch (error: unknown) {
        logger.error('agent listener failed', error);
      }
    });
  }
}
