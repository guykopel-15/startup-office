import { contextBridge } from 'electron';
import type { OfficeApi } from '../shared/api';

const api: OfficeApi = {
  version: '0.1.0',
};

contextBridge.exposeInMainWorld('office', api);
