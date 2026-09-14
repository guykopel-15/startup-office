import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { RepoState } from '@shared/repo';
import { RepoStatusChip } from './RepoStatusChip';

import type React from 'react';
import type { RepoStatus } from '@shared/repo';

const READY: RepoStatus = { state: RepoState.Ready, url: 'https://github.com/a/b.git', fullName: 'a/b', path: '/tmp/a__b', message: null };

describe('RepoStatusChip', () => {
  it('fetches the status from main on mount instead of trusting the placeholder', async (): Promise<void> => {
    const getStatus = vi.fn().mockResolvedValue({ isOk: true, data: READY });
    window.office = { version: 'test', platform: 'darwin', repo: { load: vi.fn(), getStatus, onStatus: vi.fn().mockReturnValue((): void => undefined) } };
    const tree: React.ReactNode = (
      <QueryClientProvider client={new QueryClient()}>
        <RepoStatusChip />
      </QueryClientProvider>
    );
    render(tree);
    expect(screen.getByRole('status')).toHaveTextContent('No repo');
    expect(await screen.findByText('a/b')).toBeInTheDocument();
    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').className).toContain('repo-chip--ready');
  });
});
