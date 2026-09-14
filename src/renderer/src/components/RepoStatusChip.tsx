import { IDLE_REPO_STATUS, RepoState } from '@shared/repo';
import { selectActiveFloor, useFloorsStore } from '../store/floorsStore';

import type React from 'react';
import type { RepoStatus } from '@shared/repo';

const NO_REPO_LABEL = 'No floor';
const STATE_LABELS: Readonly<Record<RepoState, string>> = {
  [RepoState.Idle]: 'no repository yet',
  [RepoState.Cloning]: 'cloning',
  [RepoState.Ready]: 'ready',
  [RepoState.Error]: 'failed',
};

function chipText(status: RepoStatus): string {
  if (status.state === RepoState.Idle || status.fullName === null) return NO_REPO_LABEL;
  return status.fullName;
}

function chipTitle(status: RepoStatus): string {
  const detail = status.message === null ? '' : `: ${status.message}`;
  return `${chipText(status)} (${STATE_LABELS[status.state]})${detail}`;
}

/** Navbar chip for the active floor's repository: a colored dot and the name; the name hides on narrow windows. */
export function RepoStatusChip(): React.JSX.Element {
  const status = useFloorsStore((state): RepoStatus => selectActiveFloor(state)?.repoStatus ?? IDLE_REPO_STATUS);
  return (
    <div className={`repo-chip repo-chip--${status.state}`} title={chipTitle(status)} role="status" aria-live="polite" aria-label={chipTitle(status)}>
      <span className="repo-chip__dot" aria-hidden="true" />
      <span className="repo-chip__text">{chipText(status)}</span>
    </div>
  );
}
