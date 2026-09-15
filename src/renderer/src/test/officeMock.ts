import { vi } from 'vitest';

import { DEFAULT_FIGURES } from '@shared/figures';
import { FloorSourceKind } from '@shared/floors';
import { RepoState } from '@shared/repo';
import { useFloorsStore } from '../store/floorsStore';
import { useRunsStore } from '../store/runsStore';
import { useSprintsStore } from '../store/sprintsStore';
import { useTasksStore } from '../store/tasksStore';

import type { AgentEvent } from '@shared/agents';
import type { Figure } from '@shared/figures';
import type { RepoStatus } from '@shared/repo';
import type { ChatMessage } from '@shared/tasks';

export const MOCK_RUN_ID = 'run-1';
export const MOCK_REPO_PATH = '/tmp/x';
const MOCK_REPO_NAME = 'x';
const READY_REPO: RepoStatus = { state: RepoState.Ready, url: null, fullName: MOCK_REPO_NAME, path: MOCK_REPO_PATH, message: null };

/** The bridge every renderer test gets: resolved calls, and the captured event listener to fire runs. */
export interface OfficeMock {
  emitAgentEvent: (event: AgentEvent) => void;
}

/** Installs `window.office` with resolving stubs; returns a way to fire agent events at the app. */
export function installOfficeMock(): OfficeMock {
  let listener: ((event: AgentEvent) => void) | null = null;
  const onEvent = vi.fn((handler: (event: AgentEvent) => void): (() => void) => {
    listener = handler;
    return (): void => undefined;
  });
  window.office = {
    version: 'test',
    platform: 'darwin',
    repo: { load: vi.fn(), useLocal: vi.fn(), getStatus: vi.fn(), pickFolder: vi.fn(), onStatus: vi.fn().mockReturnValue((): void => undefined) },
    agents: { check: vi.fn(), start: vi.fn().mockResolvedValue({ isOk: true, data: MOCK_RUN_ID }), cancel: vi.fn().mockResolvedValue({ isOk: true, data: null }), onEvent },
  };
  return { emitAgentEvent: (event: AgentEvent): void => listener?.(event) };
}

/** Resets every store and seeds one ready local floor with `figures`; returns its id. */
export function seedReadyFloor(figures: readonly Figure[] = DEFAULT_FIGURES.slice(0, 1)): string {
  useFloorsStore.setState({ floors: [], activeFloorId: null });
  useRunsStore.setState({ runs: [], intakeStartedFloorIds: [] });
  useTasksStore.setState({ tasks: [], messages: [] });
  useSprintsStore.setState({ sprints: [] });
  const floor = useFloorsStore.getState().createFloor({ name: 'Test', source: { kind: FloorSourceKind.Local, path: MOCK_REPO_PATH } });
  useFloorsStore.getState().setRepoStatus(floor.id, READY_REPO);
  figures.forEach((figure: Figure): void => useFloorsStore.getState().appendFigure(floor.id, figure));
  return floor.id;
}

export function messageTexts(): string[] {
  return useTasksStore.getState().messages.map((message: ChatMessage): string => message.text);
}

export function lastMessageText(): string | undefined {
  const texts = messageTexts();
  return texts[texts.length - 1];
}
