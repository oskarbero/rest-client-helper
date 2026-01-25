import type { HttpRequest, HttpResponse, SavedRequest } from '../../core/types';

export interface ElectronAPI {
  sendRequest: (request: HttpRequest) => Promise<HttpResponse>;
  saveRequest: (request: SavedRequest) => Promise<{ success: boolean; message?: string }>;
  loadRequest: (id: string) => Promise<SavedRequest | null>;
  listRequests: () => Promise<SavedRequest[]>;
  deleteRequest: (id: string) => Promise<{ success: boolean; message?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
