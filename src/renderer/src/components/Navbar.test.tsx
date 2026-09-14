import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { Navbar } from './Navbar';

import type React from 'react';

function renderNavbar(onAddFigure = vi.fn(), onLoadRepo = vi.fn()): void {
  window.office = { version: 'test', platform: 'darwin', repo: { load: vi.fn(), getStatus: vi.fn().mockResolvedValue({ ok: true, data: { state: 'idle', url: null, fullName: null, path: null, message: null } }), onStatus: vi.fn().mockReturnValue((): void => undefined) } };
  const client = new QueryClient();
  const tree: React.ReactNode = (
    <QueryClientProvider client={client}>
      <Navbar onAddFigure={onAddFigure} onLoadRepo={onLoadRepo} />
    </QueryClientProvider>
  );
  render(tree);
}

describe('Navbar', () => {
  it('shows the app title', () => {
    renderNavbar();
    expect(screen.getByText('Startup Office')).toBeInTheDocument();
  });

  it('opens the two dialogs from their buttons and shows the repo chip', () => {
    const handleAddFigure = vi.fn();
    const handleLoadRepo = vi.fn();
    renderNavbar(handleAddFigure, handleLoadRepo);
    fireEvent.click(screen.getByRole('button', { name: 'Load repo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add figure' }));
    expect(handleLoadRepo).toHaveBeenCalledTimes(1);
    expect(handleAddFigure).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('No repo');
  });
});
