import type { HttpRequest, HttpResponse, SavedRequest } from '../../core/types';

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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
