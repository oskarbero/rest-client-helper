import type { HttpRequest, HttpResponse, CollectionNode, Environment, EnvironmentVariable } from '../../core/types';

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
  // Environments
  getEnvironments: () => Promise<Environment[]>;
  createEnvironment: (name: string) => Promise<Environment>;
  updateEnvironment: (id: string, name: string, variables: EnvironmentVariable[]) => Promise<Environment>;
  deleteEnvironment: (id: string) => Promise<boolean>;
  duplicateEnvironment: (sourceId: string, newName: string) => Promise<Environment>;
  setActiveEnvironment: (id: string | null) => Promise<void>;
  getActiveEnvironment: () => Promise<Environment | null>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
