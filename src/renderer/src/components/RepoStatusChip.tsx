import { IDLE_REPO_STATUS, RepoState } from '@shared/repo';
import { useRepoStatus } from '../api/repoQueries';

import type React from 'react';
import type { RepoStatus } from '@shared/repo';

const NO_REPO_LABEL = 'No repo';
const STATE_LABELS: Readonly<Record<RepoState, string>> = {
  [RepoState.Idle]: 'no repository loaded',
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

/** Navbar chip: a colored dot for the state and the repo name; the name hides on narrow windows. */
export function RepoStatusChip(): React.JSX.Element {
  const { data } = useRepoStatus();
  const status: RepoStatus = data ?? IDLE_REPO_STATUS;
  return (
    <div className={`repo-chip repo-chip--${status.state}`} title={chipTitle(status)} role="status" aria-live="polite" aria-label={chipTitle(status)}>
      <span className="repo-chip__dot" aria-hidden="true" />
      <span className="repo-chip__text">{chipText(status)}</span>
    </div>
  );
}
