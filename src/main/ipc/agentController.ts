import { BrowserWindow, ipcMain } from 'electron';

import { AgentChannel, AgentErrorCode, RunMode } from '../../shared/agents';
import { errorResponse, successResponse } from '../../shared/response';
import { toErrorResponse } from './repoController';

import type { IpcMainInvokeEvent } from 'electron';
import type { AgentEvent, ClaudeAvailability, StartRunInput } from '../../shared/agents';
import type { ApiResponse } from '../../shared/response';
import type { AgentService } from '../services/agentService';
import type { IpcRegistrar } from './repoController';

const INVALID_START_DTO = 'Expected { floorId, figureId, cwd, prompt: string, mode: readOnly | edit, isPriority?: boolean }';
const INVALID_RUN_DTO = 'Expected { runId: string }';
const RUN_MODES: readonly string[] = Object.values(RunMode);

function stringField(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' ? value : null;
}

/** Validation happens before anything reaches the handlers. */
export function parseStartRunDto(payload: unknown): StartRunInput | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const record = payload as Record<string, unknown>;
  const floorId = stringField(record, 'floorId');
  const figureId = stringField(record, 'figureId');
  const cwd = stringField(record, 'cwd');
  const prompt = stringField(record, 'prompt');
  const mode = stringField(record, 'mode');
  if (floorId === null || figureId === null || cwd === null || prompt === null || mode === null || !RUN_MODES.includes(mode)) return null;
  if (prompt.trim() === '') return null;
  const isPriority = record['isPriority'];
  if (isPriority !== undefined && typeof isPriority !== 'boolean') return null;
  return { floorId, figureId, cwd, prompt, mode: mode as RunMode, isPriority: isPriority === true };
}

export function parseRunIdDto(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  return stringField(payload as Record<string, unknown>, 'runId');
}

function broadcast(event: AgentEvent): void {
  BrowserWindow.getAllWindows()
    .filter((window: BrowserWindow): boolean => !window.isDestroyed())
    .forEach((window: BrowserWindow): void => window.webContents.send(AgentChannel.Event, event));
}

export async function handleStartRun(service: AgentService, payload: unknown): Promise<ApiResponse<string>> {
  const input = parseStartRunDto(payload);
  if (input === null) return errorResponse(AgentErrorCode.InvalidInput, INVALID_START_DTO);
  try {
    return successResponse(await service.start(input));
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}

export function handleCancelRun(service: AgentService, payload: unknown): ApiResponse<null> {
  const runId = parseRunIdDto(payload);
  if (runId === null) return errorResponse(AgentErrorCode.InvalidInput, INVALID_RUN_DTO);
  try {
    service.cancel(runId);
    return successResponse(null);
  } catch (error: unknown) {
    return toErrorResponse(error);
  }
}

/** Request/response only; the service does the work. */
export function registerAgentController(service: AgentService, registrar: IpcRegistrar = ipcMain): void {
  registrar.handle(AgentChannel.Check, async (): Promise<ApiResponse<ClaudeAvailability>> => successResponse(await service.check()));
  registrar.handle(AgentChannel.Start, (_event: IpcMainInvokeEvent, payload: unknown): Promise<ApiResponse<string>> => handleStartRun(service, payload));
  registrar.handle(AgentChannel.Cancel, (_event: IpcMainInvokeEvent, payload: unknown): ApiResponse<null> => handleCancelRun(service, payload));
  service.onEvent(broadcast);
}
