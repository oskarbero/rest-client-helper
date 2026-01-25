import { contextBridge, ipcRenderer } from 'electron';
import type { HttpRequest, HttpResponse, SavedRequest } from '../core/types';

// Define the API that will be exposed to the renderer
export interface ElectronAPI {
  sendRequest: (request: HttpRequest) => Promise<HttpResponse>;
  saveRequest: (request: SavedRequest) => Promise<{ success: boolean; message?: string }>;
  loadRequest: (id: string) => Promise<SavedRequest | null>;
  listRequests: () => Promise<SavedRequest[]>;
  deleteRequest: (id: string) => Promise<{ success: boolean; message?: string }>;
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  sendRequest: (request: HttpRequest) => ipcRenderer.invoke('request:send', request),
  saveRequest: (request: SavedRequest) => ipcRenderer.invoke('request:save', request),
  loadRequest: (id: string) => ipcRenderer.invoke('request:load', id),
  listRequests: () => ipcRenderer.invoke('request:list'),
  deleteRequest: (id: string) => ipcRenderer.invoke('request:delete', id),
} as ElectronAPI);
