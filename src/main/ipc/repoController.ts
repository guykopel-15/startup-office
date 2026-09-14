import { BrowserWindow, ipcMain } from 'electron';

import { RepoChannel, RepoErrorCode } from '../../shared/repo';
import { ServiceError, errorResponse, successResponse } from '../../shared/response';

import type { RepoStatus } from '../../shared/repo';
import type { ApiResponse } from '../../shared/response';
import type { RepoService } from '../services/repoService';

/** The payload the renderer sends to `repo:load`. */
export interface LoadRepoDto {
  url: string;
}

const UNKNOWN_ERROR_CODE = 'UNKNOWN';
const INVALID_DTO_MESSAGE = 'Expected { url: string }';

/** Validation happens before anything reaches the handler. */
export function parseLoadRepoDto(payload: unknown): LoadRepoDto | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const url = (payload as { url?: unknown }).url;
  if (typeof url !== 'string') return null;
  return { url };
}

/** Turns a thrown error into the standard error response. */
export function toErrorResponse(error: unknown): ApiResponse<never> {
  if (error instanceof ServiceError) return errorResponse(error.code, error.message);
  return errorResponse(UNKNOWN_ERROR_CODE, error instanceof Error ? error.message : String(error));
}

function broadcast(status: RepoStatus): void {
  BrowserWindow.getAllWindows().forEach((window: BrowserWindow): void => window.webContents.send(RepoChannel.StatusChanged, status));
}

/** Request/response only; the service does the work. */
export function registerRepoController(service: RepoService): void {
  ipcMain.handle(RepoChannel.GetStatus, (): ApiResponse<RepoStatus> => successResponse(service.getStatus()));
  ipcMain.handle(RepoChannel.Load, async (_event, payload: unknown): Promise<ApiResponse<RepoStatus>> => {
    const dto = parseLoadRepoDto(payload);
    if (dto === null) return errorResponse(RepoErrorCode.InvalidUrl, INVALID_DTO_MESSAGE);
    try {
      return successResponse(await service.load(dto.url));
    } catch (error: unknown) {
      return toErrorResponse(error);
    }
  });
  service.onStatus(broadcast);
}
