import { contextBridge, ipcRenderer } from 'electron';

import { AgentChannel } from '../shared/agents';
import { RepoChannel } from '../shared/repo';

import type { IpcRendererEvent } from 'electron';
import type { AgentEvent, ClaudeAvailability, StartRunInput } from '../shared/agents';
import type { AgentsApi, OfficeApi, RepoApi } from '../shared/api';
import type { RepoStatus, RepoStatusEvent } from '../shared/repo';
import type { ApiResponse } from '../shared/response';

/** Subscribes to a push channel and returns the unsubscribe function. */
function subscribe<Payload>(channel: string, listener: (payload: Payload) => void): () => void {
  const handle = (_event: IpcRendererEvent, payload: Payload): void => listener(payload);
  ipcRenderer.on(channel, handle);
  return (): void => {
    ipcRenderer.removeListener(channel, handle);
  };
}

const repo: RepoApi = {
  load: (floorId: string, url: string): Promise<ApiResponse<RepoStatus>> => ipcRenderer.invoke(RepoChannel.Load, { floorId, url }),
  useLocal: (floorId: string, path: string): Promise<ApiResponse<RepoStatus>> => ipcRenderer.invoke(RepoChannel.UseLocal, { floorId, path }),
  getStatus: (floorId: string): Promise<ApiResponse<RepoStatus>> => ipcRenderer.invoke(RepoChannel.GetStatus, { floorId }),
  pickFolder: (): Promise<ApiResponse<string | null>> => ipcRenderer.invoke(RepoChannel.PickFolder),
  onStatus: (listener: (event: RepoStatusEvent) => void): (() => void) => subscribe(RepoChannel.StatusChanged, listener),
};

const agents: AgentsApi = {
  check: (): Promise<ApiResponse<ClaudeAvailability>> => ipcRenderer.invoke(AgentChannel.Check),
  start: (input: StartRunInput): Promise<ApiResponse<string>> => ipcRenderer.invoke(AgentChannel.Start, input),
  cancel: (runId: string): Promise<ApiResponse<null>> => ipcRenderer.invoke(AgentChannel.Cancel, { runId }),
  onEvent: (listener: (event: AgentEvent) => void): (() => void) => subscribe(AgentChannel.Event, listener),
};

const api: OfficeApi = {
  version: __APP_VERSION__,
  platform: process.platform,
  repo,
  agents,
};

contextBridge.exposeInMainWorld('office', api);
