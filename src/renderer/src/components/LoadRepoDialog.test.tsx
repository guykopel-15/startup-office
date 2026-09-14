import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { IDLE_REPO_STATUS, RepoState } from '@shared/repo';
import { LoadRepoDialog } from './LoadRepoDialog';

import type React from 'react';
import type { RepoApi } from '@shared/api';

const READY = { state: RepoState.Ready, url: 'https://github.com/a/b.git', fullName: 'a/b', path: '/tmp/a__b', message: null };

function renderDialog(repo: Partial<RepoApi>, onClose: () => void = vi.fn()): void {
  window.office = {
    version: 'test',
    platform: 'darwin',
    repo: { load: vi.fn(), getStatus: vi.fn().mockResolvedValue({ isOk: true, data: IDLE_REPO_STATUS }), onStatus: vi.fn().mockReturnValue((): void => undefined), ...repo },
  };
  const tree: React.ReactNode = (
    <QueryClientProvider client={new QueryClient()}>
      <LoadRepoDialog isOpen onClose={onClose} />
    </QueryClientProvider>
  );
  render(tree);
}

describe('LoadRepoDialog', () => {
  it('validates the URL before calling main', async (): Promise<void> => {
    const user = userEvent.setup();
    const load = vi.fn();
    renderDialog({ load });
    await user.type(screen.getByLabelText('GitHub URL'), 'not a url{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Paste a GitHub repository URL');
    expect(load).not.toHaveBeenCalled();
  });

  it('clones on Enter and closes on success', async (): Promise<void> => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const load = vi.fn().mockResolvedValue({ isOk: true, data: READY });
    renderDialog({ load }, onClose);
    await user.type(screen.getByLabelText('GitHub URL'), 'https://github.com/a/b{Enter}');
    await waitFor((): void => expect(onClose).toHaveBeenCalledTimes(1));
    expect(load).toHaveBeenCalledWith('https://github.com/a/b');
  });

  it('shows the git error from main and clears it when the URL changes', async (): Promise<void> => {
    const user = userEvent.setup();
    const load = vi.fn().mockResolvedValue({ isOk: false, error: { code: 'REPO_CLONE_FAILED', message: 'fatal: repository not found' } });
    renderDialog({ load });
    await user.type(screen.getByLabelText('GitHub URL'), 'https://github.com/a/missing');
    await user.click(screen.getByRole('button', { name: 'Clone' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('fatal: repository not found');
    await user.type(screen.getByLabelText('GitHub URL'), 'x');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
