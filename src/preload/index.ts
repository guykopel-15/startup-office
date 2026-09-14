import { contextBridge, ipcRenderer } from 'electron';

import { RepoChannel } from '../shared/repo';

import type { IpcRendererEvent } from 'electron';
import type { OfficeApi, RepoApi } from '../shared/api';
import type { RepoStatus } from '../shared/repo';
import type { ApiResponse } from '../shared/response';

const repo: RepoApi = {
  load: (url: string): Promise<ApiResponse<RepoStatus>> => ipcRenderer.invoke(RepoChannel.Load, { url }),
  getStatus: (): Promise<ApiResponse<RepoStatus>> => ipcRenderer.invoke(RepoChannel.GetStatus),
  onStatus: (listener: (status: RepoStatus) => void): (() => void) => {
    const handleStatus = (_event: IpcRendererEvent, status: RepoStatus): void => listener(status);
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
