import { contextBridge, ipcRenderer } from 'electron';
import type { HttpRequest, HttpResponse, CollectionNode, Environment, EnvironmentVariable, CollectionSettings } from '../core/types';
import type { LoadedAppState } from '../core/state-persistence';

// Define the API that will be exposed to the renderer
export interface ElectronAPI {
  // HTTP requests
  sendRequest: (request: HttpRequest) => Promise<HttpResponse>;
  // Session state persistence
  saveState: (request: HttpRequest, currentRequestId?: string | null, expandedNodes?: string[]) => Promise<void>;
  loadState: () => Promise<LoadedAppState>;
  // Collections (tree-based)
  getCollectionsTree: () => Promise<CollectionNode[]>;
  createCollection: (name: string, parentId?: string) => Promise<CollectionNode>;
  saveRequestToCollection: (name: string, request: HttpRequest, parentId?: string, existingId?: string) => Promise<CollectionNode>;
  deleteCollectionNode: (id: string) => Promise<boolean>;
  renameCollectionNode: (id: string, newName: string) => Promise<CollectionNode | null>;
  moveCollectionNode: (id: string, newParentId?: string) => Promise<CollectionNode | null>;
  getCollectionSettings: (collectionId: string) => Promise<CollectionSettings | null>;
  updateCollectionSettings: (collectionId: string, settings: CollectionSettings) => Promise<CollectionNode | null>;
  // Environments
  getEnvironments: () => Promise<Environment[]>;
  createEnvironment: (name: string) => Promise<Environment>;
  updateEnvironment: (id: string, name: string, variables: EnvironmentVariable[]) => Promise<Environment>;
  deleteEnvironment: (id: string) => Promise<boolean>;
  duplicateEnvironment: (sourceId: string, newName: string) => Promise<Environment>;
  setActiveEnvironment: (id: string | null) => Promise<void>;
  getActiveEnvironment: () => Promise<Environment | null>;
  linkEnvironmentToEnvFile: (environmentId: string) => Promise<{ filePath: string; lastModified: string } | null>;
  unlinkEnvironmentFromEnvFile: (environmentId: string) => Promise<void>;
  readVariablesFromEnvFile: (filePath: string) => Promise<EnvironmentVariable[]>;
  getEnvironmentWithVariables: (environmentId: string) => Promise<Environment | null>;
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  sendRequest: (request: HttpRequest) => ipcRenderer.invoke('request:send', request),
  saveState: (request: HttpRequest, currentRequestId?: string | null, expandedNodes?: string[]) => 
    ipcRenderer.invoke('state:save', request, currentRequestId, expandedNodes),
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
  getCollectionSettings: (collectionId: string) => 
    ipcRenderer.invoke('collection:getSettings', collectionId),
  updateCollectionSettings: (collectionId: string, settings: CollectionSettings) => 
    ipcRenderer.invoke('collection:updateSettings', collectionId, settings),
  // Environments
  getEnvironments: () => ipcRenderer.invoke('environment:getAll'),
  createEnvironment: (name: string) => ipcRenderer.invoke('environment:create', name),
  updateEnvironment: (id: string, name: string, variables: EnvironmentVariable[]) => 
    ipcRenderer.invoke('environment:update', id, name, variables),
  deleteEnvironment: (id: string) => ipcRenderer.invoke('environment:delete', id),
  duplicateEnvironment: (sourceId: string, newName: string) => 
    ipcRenderer.invoke('environment:duplicate', sourceId, newName),
  setActiveEnvironment: (id: string | null) => ipcRenderer.invoke('environment:setActive', id),
  getActiveEnvironment: () => ipcRenderer.invoke('environment:getActive'),
  linkEnvironmentToEnvFile: (environmentId: string) => ipcRenderer.invoke('environment:linkEnvFile', environmentId),
  unlinkEnvironmentFromEnvFile: (environmentId: string) => ipcRenderer.invoke('environment:unlinkEnvFile', environmentId),
  readVariablesFromEnvFile: (filePath: string) => ipcRenderer.invoke('environment:readVariablesFromFile', filePath),
  getEnvironmentWithVariables: (environmentId: string) => ipcRenderer.invoke('environment:getWithVariables', environmentId),
} as ElectronAPI);
