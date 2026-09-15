import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { RenderResult } from '@testing-library/react';

/** Wraps a tree in a fresh QueryClient, for components and hooks that use the main-process queries. */
export function QueryWrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

export function renderWithQueryClient(ui: React.ReactElement): RenderResult {
  return render(ui, { wrapper: QueryWrapper });
}
