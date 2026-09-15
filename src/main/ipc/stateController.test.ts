// @vitest-environment node
import { vi } from 'vitest';

import { SNAPSHOT_VERSION, StateChannel, StateErrorCode } from '../../shared/persistence';
import { ServiceError } from '../../shared/response';
import { handleLoadState, handleSaveState, registerStateController } from './stateController';

import type { Snapshot } from '../../shared/persistence';
import type { StateStore } from '../services/stateStore';
import type { IpcRegistrar } from './repoController';

vi.mock('electron', (): Record<string, unknown> => ({ BrowserWindow: { getAllWindows: (): unknown[] => [] }, dialog: { showOpenDialog: vi.fn() }, ipcMain: { handle: vi.fn() } }));

const SNAPSHOT: Snapshot = { version: SNAPSHOT_VERSION, savedAt: 'now', floors: [], activeFloorId: null, tasks: [], messages: [], sprints: [], intakeStartedFloorIds: [], settings: { isMuted: false } };

function fakeStore(): StateStore {
  return { load: vi.fn().mockResolvedValue({ snapshot: SNAPSHOT, warning: null }), save: vi.fn().mockResolvedValue(undefined) } as unknown as StateStore;
}

describe('state controller', (): void => {
  it('loads, validates before saving, and wraps errors', async (): Promise<void> => {
    const store = fakeStore();
    expect(await handleLoadState(store)).toEqual({ isOk: true, data: { snapshot: SNAPSHOT, warning: null } });
    expect(await handleSaveState(store, { version: 2 })).toMatchObject({ isOk: false, error: { code: StateErrorCode.InvalidInput } });
    expect(store.save).not.toHaveBeenCalled();
    expect(await handleSaveState(store, SNAPSHOT)).toEqual({ isOk: true, data: null });
    vi.mocked(store.save).mockRejectedValueOnce(new ServiceError(StateErrorCode.WriteFailed, 'disk full'));
    expect(await handleSaveState(store, SNAPSHOT)).toEqual({ isOk: false, error: { code: StateErrorCode.WriteFailed, message: 'disk full' } });
  });

  it('registers both channels', (): void => {
    const registrar: IpcRegistrar = { handle: vi.fn() };
    registerStateController(fakeStore(), registrar);
    expect(vi.mocked(registrar.handle).mock.calls.map(([channel]: [string, unknown]): string => channel)).toEqual([StateChannel.Load, StateChannel.Save]);
  });
});
