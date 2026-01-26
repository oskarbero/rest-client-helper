import type { HttpRequest, HttpResponse, CollectionNode } from '../../core/types';

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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
