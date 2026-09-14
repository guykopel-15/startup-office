import { contextBridge } from 'electron';
import type { OfficeApi } from '../shared/api';

const api: OfficeApi = {
  version: '1.0.4',
  platform: process.platform,
};

contextBridge.exposeInMainWorld('office', api);
