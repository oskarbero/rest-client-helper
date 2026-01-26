import { contextBridge, ipcRenderer } from 'electron';
import type { HttpRequest, HttpResponse, CollectionNode } from '../core/types';

// Define the API that will be exposed to the renderer
export interface ElectronAPI {
  // HTTP requests
  sendRequest: (request: HttpRequest) => Promise<HttpResponse>;
  // Session state persistence
  saveState: (request: HttpRequest) => Promise<void>;
  loadState: () => Promise<HttpRequest>;
  // Collections (tree-based)
  getCollectionsTree: () => Promise<CollectionNode[]>;
  createCollection: (name: string, parentId?: string) => Promise<CollectionNode>;
  saveRequestToCollection: (name: string, request: HttpRequest, parentId?: string, existingId?: string) => Promise<CollectionNode>;
  deleteCollectionNode: (id: string) => Promise<boolean>;
  renameCollectionNode: (id: string, newName: string) => Promise<CollectionNode | null>;
  moveCollectionNode: (id: string, newParentId?: string) => Promise<CollectionNode | null>;
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  sendRequest: (request: HttpRequest) => ipcRenderer.invoke('request:send', request),
  saveState: (request: HttpRequest) => ipcRenderer.invoke('state:save', request),
  loadState: () => ipcRenderer.invoke('state:load'),
  getCollectionsTree: () => ipcRenderer.invoke('collection:getTree'),
  createCollection: (name: string, parentId?: string) => 
    ipcRenderer.invoke('collection:create', name, parentId),
  saveRequestToCollection: (name: string, request: HttpRequest, parentId?: string, existingId?: string) => 
    ipcRenderer.invoke('collection:saveRequest', name, request, parentId, existingId),
  deleteCollectionNode: (id: string) => ipcRenderer.invoke('collection:delete', id),
  renameCollectionNode: (id: string, newName: string) => 
    ipcRenderer.invoke('collection:rename', id, newName),
  moveCollectionNode: (id: string, newParentId?: string) => 
    ipcRenderer.invoke('collection:move', id, newParentId),
} as ElectronAPI);
