import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('phaser', async (): Promise<object> => (await import('../test/phaserMock')).phaserMock());

import { RunMode, RunStatus } from '@shared/agents';
import { GameEvent, gameEvents } from '../game/events';
import { useRunsStore } from '../store/runsStore';
import { installOfficeMock, seedReadyFloor } from '../test/officeMock';
import { QueryWrapper } from '../test/renderWithQueryClient';
import { useAgentPanel } from './useAgentPanel';

import type { FigureClickedPayload } from '../game/events';

let floorId = '';

beforeEach((): void => {
  installOfficeMock();
  floorId = seedReadyFloor();
});

describe('useAgentPanel', (): void => {
  it('stays stable while runs stream in, and exposes the latest run of the open figure', (): void => {
    const { result } = renderHook((): ReturnType<typeof useAgentPanel> => useAgentPanel(true), { wrapper: QueryWrapper });
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

  it('no longer opens on a figure click; the dialog box owns that', (): void => {
    const { result } = renderHook((): ReturnType<typeof useAgentPanel> => useAgentPanel(true), { wrapper: QueryWrapper });
    const payload: FigureClickedPayload = { figureId: 'frontend' };
    act((): void => void gameEvents.emit(GameEvent.FigureClicked, payload));
    expect(result.current.isOpen).toBe(false);
  });
});
