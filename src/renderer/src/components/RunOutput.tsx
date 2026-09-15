import { useEffect, useRef } from 'react';

import { RunStatus } from '@shared/agents';

import type React from 'react';
import type { AgentRun } from '@shared/agents';

interface RunOutputProps {
  run: AgentRun | null;
  history: readonly AgentRun[];
}

const EMPTY_HINT = 'No runs yet. Read the repo, or ask something.';
const STATUS_LABELS: Readonly<Record<RunStatus, string>> = {
  [RunStatus.Queued]: 'queued',
  [RunStatus.Running]: 'working',
  [RunStatus.Done]: 'done',
  [RunStatus.Error]: 'failed',
  [RunStatus.Cancelled]: 'stopped',
};
const HISTORY_LABEL = 'Earlier runs';
const HISTORY_LIMIT = 5;
const SEPARATOR = ' · ';

/** Status and turns only: the CLI's cost figure is an API-equivalent estimate, not a charge on a subscription. */
function summary(run: AgentRun): string {
  const parts = [STATUS_LABELS[run.status]];
  if (run.turns !== null) parts.push(`${run.turns} turns`);
  return parts.join(SEPARATOR);
}

/** The streamed output of the latest run, kept scrolled to the bottom, plus a short history. */
export function RunOutput({ run, history }: RunOutputProps): React.JSX.Element {
  const logRef = useRef<HTMLDivElement>(null);
  const lineCount = run?.lines.length ?? 0;

  useEffect((): void => {
    const log = logRef.current;
    if (log !== null) log.scrollTop = log.scrollHeight;
  }, [lineCount, run?.result]);

  if (run === null) return <p className="run-output__empty">{EMPTY_HINT}</p>;
  const earlier = history.filter((candidate: AgentRun): boolean => candidate.id !== run.id).slice(-HISTORY_LIMIT).reverse();
  return (
    <div className="run-output">
      <div className={`run-output__status run-output__status--${run.status}`} role="status">
        {summary(run)}
      </div>
      <div className="run-output__log" ref={logRef} aria-live="polite">
        {run.lines.map((line: string, index: number): React.JSX.Element => (
          <div key={index} className={line.startsWith('▸') ? 'run-output__tool' : 'run-output__line'}>
            {line}
          </div>
        ))}
        {run.result !== null && <div className="run-output__result">{run.result}</div>}
        {run.error !== null && <div className="run-output__error">{run.error}</div>}
      </div>
      {earlier.length > 0 && (
        <details className="run-output__history">
          <summary>
            {HISTORY_LABEL} ({earlier.length})
          </summary>
          <ul>
            {earlier.map((item: AgentRun): React.JSX.Element => (
              <li key={item.id}>
                {summary(item)}
                {SEPARATOR}
                {item.prompt.split('\n').pop()}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
