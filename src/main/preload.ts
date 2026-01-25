import { contextBridge, ipcRenderer } from 'electron';
import type { HttpRequest, HttpResponse, SavedRequest } from '../core/types';

// Define the API that will be exposed to the renderer
export interface ElectronAPI {
  // HTTP requests
  sendRequest: (request: HttpRequest) => Promise<HttpResponse>;
  // Session state persistence
  saveState: (request: HttpRequest) => Promise<void>;
  loadState: () => Promise<HttpRequest>;
  // Collections (saved requests)
  saveToCollection: (name: string, request: HttpRequest, existingId?: string) => Promise<SavedRequest>;
  loadFromCollection: (id: string) => Promise<SavedRequest | null>;
  listCollection: () => Promise<SavedRequest[]>;
  deleteFromCollection: (id: string) => Promise<boolean>;
  renameInCollection: (id: string, newName: string) => Promise<SavedRequest | null>;
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  sendRequest: (request: HttpRequest) => ipcRenderer.invoke('request:send', request),
  saveState: (request: HttpRequest) => ipcRenderer.invoke('state:save', request),
  loadState: () => ipcRenderer.invoke('state:load'),
  saveToCollection: (name: string, request: HttpRequest, existingId?: string) => 
    ipcRenderer.invoke('collection:save', name, request, existingId),
  loadFromCollection: (id: string) => ipcRenderer.invoke('collection:load', id),
  listCollection: () => ipcRenderer.invoke('collection:list'),
  deleteFromCollection: (id: string) => ipcRenderer.invoke('collection:delete', id),
  renameInCollection: (id: string, newName: string) => ipcRenderer.invoke('collection:rename', id, newName),
} as ElectronAPI);
