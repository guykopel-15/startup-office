import { ipcMain } from 'electron';

import { StateChannel, StateErrorCode, parseSnapshot } from '../../shared/persistence';
import { errorResponse, successResponse } from '../../shared/response';
import { toErrorResponse } from './repoController';

import type { IpcMainInvokeEvent } from 'electron';
import type { LoadStateResult } from '../../shared/persistence';
import type { ApiResponse } from '../../shared/response';
import type { StateStore } from '../services/stateStore';
import type { IpcRegistrar } from './repoController';

const INVALID_SNAPSHOT = 'Expected a versioned office snapshot';

export async function handleLoadState(store: StateStore): Promise<ApiResponse<LoadStateResult>> {
  try {
    return successResponse(await store.load());
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}

/** Validates the snapshot before it touches the disk. */
export async function handleSaveState(store: StateStore, payload: unknown): Promise<ApiResponse<null>> {
  const snapshot = parseSnapshot(payload);
  if (snapshot === null) return errorResponse(StateErrorCode.InvalidInput, INVALID_SNAPSHOT);
  try {
    await store.save(snapshot);
    return successResponse(null);
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}

export function registerStateController(store: StateStore, registrar: IpcRegistrar = ipcMain): void {
  registrar.handle(StateChannel.Load, (): Promise<ApiResponse<LoadStateResult>> => handleLoadState(store));
  registrar.handle(StateChannel.Save, (_event: IpcMainInvokeEvent, payload: unknown): Promise<ApiResponse<null>> => handleSaveState(store, payload));
}
