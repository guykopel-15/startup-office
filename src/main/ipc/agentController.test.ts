// @vitest-environment node
import { vi } from 'vitest';

import { AgentChannel, AgentErrorCode, RunMode } from '../../shared/agents';
import { ServiceError } from '../../shared/response';
import { handleCancelRun, handleStartRun, parseRunIdDto, parseStartRunDto, registerAgentController } from './agentController';

import type { AgentService } from '../services/agentService';
import type { IpcRegistrar } from './repoController';

vi.mock('electron', (): Record<string, unknown> => ({ BrowserWindow: { getAllWindows: (): unknown[] => [] }, dialog: { showOpenDialog: vi.fn() }, ipcMain: { handle: vi.fn() } }));

const VALID = { floorId: 'f', figureId: 'x', cwd: '/tmp', prompt: 'hi', mode: RunMode.ReadOnly };

function fakeService(overrides: Partial<Record<'start' | 'cancel' | 'check', unknown>> = {}): AgentService {
  return { start: vi.fn().mockResolvedValue('run-1'), cancel: vi.fn(), check: vi.fn(), onEvent: vi.fn(), ...overrides } as unknown as AgentService;
}

describe('DTO parsing', () => {
  it('accepts a complete start input and rejects bad modes or empty prompts', (): void => {
    expect(parseStartRunDto(VALID)).toEqual({ ...VALID, isPriority: false });
    expect(parseStartRunDto({ ...VALID, isPriority: true })).toMatchObject({ isPriority: true });
    expect(parseStartRunDto({ ...VALID, isPriority: 'yes' })).toBeNull();
    expect(parseStartRunDto({ ...VALID, mode: 'yolo' })).toBeNull();
    expect(parseStartRunDto({ ...VALID, prompt: '  ' })).toBeNull();
    expect(parseStartRunDto(null)).toBeNull();
    expect(parseRunIdDto({ runId: 'run-1' })).toBe('run-1');
    expect(parseRunIdDto({})).toBeNull();
  });
});

describe('handlers', () => {
  it('validate before calling the service and wrap results', async (): Promise<void> => {
    const service = fakeService();
    expect(await handleStartRun(service, {})).toMatchObject({ isOk: false, error: { code: AgentErrorCode.InvalidInput } });
    expect(service.start).not.toHaveBeenCalled();
    expect(await handleStartRun(service, VALID)).toEqual({ isOk: true, data: 'run-1' });
    expect(handleCancelRun(service, { runId: 'run-1' })).toEqual({ isOk: true, data: null });
    const failing = fakeService({ cancel: vi.fn().mockImplementation((): void => { throw new ServiceError(AgentErrorCode.UnknownRun, 'nope'); }) });
    expect(handleCancelRun(failing, { runId: 'run-9' })).toEqual({ isOk: false, error: { code: AgentErrorCode.UnknownRun, message: 'nope' } });
  });
});

describe('registerAgentController', () => {
  it('registers the three channels and subscribes to events', (): void => {
    const registrar: IpcRegistrar = { handle: vi.fn() };
    const service = fakeService();
    registerAgentController(service, registrar);
    const channels = (registrar.handle as ReturnType<typeof vi.fn>).mock.calls.map((call: unknown[]): unknown => call[0]);
    expect(channels).toEqual([AgentChannel.Check, AgentChannel.Start, AgentChannel.Cancel]);
    expect(service.onEvent).toHaveBeenCalledTimes(1);
  });
});
