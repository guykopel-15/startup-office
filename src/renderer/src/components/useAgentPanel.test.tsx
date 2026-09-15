import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

vi.mock('phaser', () => ({ default: { Events: { EventEmitter: class { on(): void {} off(): void {} } } } }));

import { RunMode, RunStatus } from '@shared/agents';
import { DEFAULT_FIGURES } from '@shared/figures';
import { FloorSourceKind } from '@shared/floors';
import { useFloorsStore } from '../store/floorsStore';
import { useRunsStore } from '../store/runsStore';
import { useAgentPanel } from './useAgentPanel';

import type React from 'react';
import type { Figure } from '@shared/figures';

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

beforeEach((): void => {
  window.office = { version: 'test', platform: 'darwin', repo: { load: vi.fn(), useLocal: vi.fn(), getStatus: vi.fn(), pickFolder: vi.fn(), onStatus: vi.fn().mockReturnValue((): void => undefined) }, agents: { check: vi.fn(), start: vi.fn().mockResolvedValue({ isOk: true, data: 'run-1' }), cancel: vi.fn().mockResolvedValue({ isOk: true, data: null }), onEvent: vi.fn().mockReturnValue((): void => undefined) } };
  useFloorsStore.setState({ floors: [], activeFloorId: null });
  useRunsStore.setState({ runs: [], intakeStartedFloorIds: [] });
  const floor = useFloorsStore.getState().createFloor({ name: 'Test', source: { kind: FloorSourceKind.Local, path: '/tmp/x' } });
  useFloorsStore.getState().setRepoStatus(floor.id, { state: 'ready', url: null, fullName: 'x', path: '/tmp/x', message: null } as never);
  useFloorsStore.getState().appendFigure(floor.id, DEFAULT_FIGURES[0] as Figure);
});

describe('useAgentPanel', () => {
  it('stays stable while runs stream in, and exposes the latest run of the open figure', (): void => {
    const { result } = renderHook((): ReturnType<typeof useAgentPanel> => useAgentPanel(true), { wrapper });
    const floorId = useFloorsStore.getState().activeFloorId as string;
    act((): void => result.current.selectFigure('frontend'));
    expect(result.current.isOpen).toBe(true);
    act((): void => {
      useRunsStore.getState().registerRun({ id: 'run-1', floorId, figureId: 'frontend', prompt: 'p', mode: RunMode.ReadOnly });
      useRunsStore.getState().applyEvent({ type: 'status', runId: 'run-1', status: RunStatus.Running });
    });
    for (let index = 0; index < 20; index += 1) {
      act((): void => useRunsStore.getState().applyEvent({ type: 'chunk', runId: 'run-1', text: `line ${index}` }));
    }
    expect(result.current.latestRun?.lines).toHaveLength(20);
    expect(result.current.isBusy).toBe(true);
    expect(result.current.canRun).toBe(false);
  });
});
