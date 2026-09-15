import { BrowserWindow, dialog, ipcMain } from 'electron';

import { RepoChannel, RepoErrorCode } from '../../shared/repo';
import { ServiceError, errorResponse, successResponse } from '../../shared/response';

import type { IpcMainInvokeEvent } from 'electron';
import type { RepoStatus, RepoStatusEvent } from '../../shared/repo';
import type { ApiResponse } from '../../shared/response';
import type { RepoService } from '../services/repoService';

/** `repo:load` payload. */
export interface LoadRepoDto {
  floorId: string;
  url: string;
}

/** `repo:useLocal` payload. */
export interface UseLocalRepoDto {
  floorId: string;
  path: string;
}

/** `repo:getStatus` payload. */
export interface FloorDto {
  floorId: string;
}

/** The subset of ipcMain the controller needs; injected so tests can capture handlers. */
export interface IpcRegistrar {
  handle: (channel: string, listener: (event: IpcMainInvokeEvent, payload: unknown) => unknown) => void;
}

/** Native folder picker, injected so tests never open a dialog. */
export type FolderPicker = () => Promise<string | null>;

const UNKNOWN_ERROR_CODE = 'UNKNOWN';
const INVALID_LOAD_DTO = 'Expected { floorId: string, url: string }';
const INVALID_LOCAL_DTO = 'Expected { floorId: string, path: string }';
const INVALID_FLOOR_DTO = 'Expected { floorId: string }';
const FOLDER_PICKER_TITLE = 'Choose the repository folder';

function stringField(payload: unknown, key: string): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

/** Validation happens before anything reaches the handlers. */
export function parseLoadRepoDto(payload: unknown): LoadRepoDto | null {
  const floorId = stringField(payload, 'floorId');
  const url = stringField(payload, 'url');
  return floorId === null || url === null ? null : { floorId, url };
}

export function parseUseLocalRepoDto(payload: unknown): UseLocalRepoDto | null {
  const floorId = stringField(payload, 'floorId');
  const path = stringField(payload, 'path');
  return floorId === null || path === null ? null : { floorId, path };
}

export function parseFloorDto(payload: unknown): FloorDto | null {
  const floorId = stringField(payload, 'floorId');
  return floorId === null ? null : { floorId };
}

/** Turns a thrown error into the standard error response. */
export function toErrorResponse(error: unknown): ApiResponse<never> {
  if (error instanceof ServiceError) return errorResponse(error.code, error.message);
  return errorResponse(UNKNOWN_ERROR_CODE, error instanceof Error ? error.message : String(error));
}

function broadcast(event: RepoStatusEvent): void {
  BrowserWindow.getAllWindows()
    .filter((window: BrowserWindow): boolean => !window.isDestroyed())
    .forEach((window: BrowserWindow): void => window.webContents.send(RepoChannel.StatusChanged, event));
}

async function pickFolderNatively(): Promise<string | null> {
  const result = await dialog.showOpenDialog({ title: FOLDER_PICKER_TITLE, properties: ['openDirectory'] });
  return result.canceled ? null : (result.filePaths[0] ?? null);
}

export async function handleLoadRepo(service: RepoService, payload: unknown): Promise<ApiResponse<RepoStatus>> {
  const dto = parseLoadRepoDto(payload);
  if (dto === null) return errorResponse(RepoErrorCode.InvalidUrl, INVALID_LOAD_DTO);
  try {
    return successResponse(await service.load(dto.floorId, dto.url));
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}

export async function handleUseLocalRepo(service: RepoService, payload: unknown): Promise<ApiResponse<RepoStatus>> {
  const dto = parseUseLocalRepoDto(payload);
  if (dto === null) return errorResponse(RepoErrorCode.InvalidPath, INVALID_LOCAL_DTO);
  try {
    return successResponse(await service.useLocal(dto.floorId, dto.path));
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}

export function handleGetStatus(service: RepoService, payload: unknown): ApiResponse<RepoStatus> {
  const dto = parseFloorDto(payload);
  if (dto === null) return errorResponse(RepoErrorCode.InvalidPath, INVALID_FLOOR_DTO);
  return successResponse(service.getStatus(dto.floorId));
}

/** Request/response only; the service does the work. */
export function registerRepoController(service: RepoService, registrar: IpcRegistrar = ipcMain, pickFolder: FolderPicker = pickFolderNatively): void {
  registrar.handle(RepoChannel.GetStatus, (_event: IpcMainInvokeEvent, payload: unknown): ApiResponse<RepoStatus> => handleGetStatus(service, payload));
  registrar.handle(RepoChannel.Load, (_event: IpcMainInvokeEvent, payload: unknown): Promise<ApiResponse<RepoStatus>> => handleLoadRepo(service, payload));
  registrar.handle(RepoChannel.UseLocal, (_event: IpcMainInvokeEvent, payload: unknown): Promise<ApiResponse<RepoStatus>> => handleUseLocalRepo(service, payload));
  registrar.handle(RepoChannel.PickFolder, async (): Promise<ApiResponse<string | null>> => successResponse(await pickFolder()));
  service.onStatus(broadcast);
}
