import { contextBridge, ipcRenderer } from 'electron';

import { RepoChannel } from '../shared/repo';

import type { IpcRendererEvent } from 'electron';
import type { OfficeApi, RepoApi } from '../shared/api';
import type { RepoStatus, RepoStatusEvent } from '../shared/repo';
import type { ApiResponse } from '../shared/response';

const repo: RepoApi = {
  load: (floorId: string, url: string): Promise<ApiResponse<RepoStatus>> => ipcRenderer.invoke(RepoChannel.Load, { floorId, url }),
  useLocal: (floorId: string, path: string): Promise<ApiResponse<RepoStatus>> => ipcRenderer.invoke(RepoChannel.UseLocal, { floorId, path }),
  getStatus: (floorId: string): Promise<ApiResponse<RepoStatus>> => ipcRenderer.invoke(RepoChannel.GetStatus, { floorId }),
  pickFolder: (): Promise<ApiResponse<string | null>> => ipcRenderer.invoke(RepoChannel.PickFolder),
  onStatus: (listener: (event: RepoStatusEvent) => void): (() => void) => {
    const handleStatus = (_event: IpcRendererEvent, event: RepoStatusEvent): void => listener(event);
    ipcRenderer.on(RepoChannel.StatusChanged, handleStatus);
    return (): void => {
      ipcRenderer.removeListener(RepoChannel.StatusChanged, handleStatus);
    };
  },
};

const api: OfficeApi = {
  version: __APP_VERSION__,
  platform: process.platform,
  repo,
};

contextBridge.exposeInMainWorld('office', api);
