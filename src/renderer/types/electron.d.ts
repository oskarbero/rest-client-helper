import type {
  HttpRequest,
  HttpResponse,
  CollectionNode,
  Environment,
  EnvironmentVariable,
  CollectionSettings,
  GitSyncResult,
  GitPullResult,
} from '@core';

export type { GitSyncResult, GitPullResult } from '@core';

export interface ElectronAPI {
  // HTTP requests
  sendRequest: (request: HttpRequest) => Promise<HttpResponse>;
  // Session state persistence
  saveState: (request: HttpRequest, currentRequestId?: string | null, expandedNodes?: string[]) => Promise<void>;
  loadState: () => Promise<any>;
  // Collections (tree-based)
  getCollectionsTree: () => Promise<CollectionNode[]>;
  createCollection: (name: string, parentId?: string) => Promise<CollectionNode>;
  saveRequestToCollection: (name: string, request: HttpRequest, parentId?: string, existingId?: string) => Promise<CollectionNode>;
  deleteCollectionNode: (id: string) => Promise<boolean>;
  renameCollectionNode: (id: string, newName: string) => Promise<CollectionNode | null>;
  moveCollectionNode: (id: string, newParentId?: string) => Promise<CollectionNode | null>;
  getCollectionSettings: (collectionId: string) => Promise<CollectionSettings | null>;
  updateCollectionSettings: (collectionId: string, settings: CollectionSettings) => Promise<CollectionNode | null>;
  // Collection Git sync
  syncCollectionToRemote: (collectionId: string) => Promise<GitSyncResult>;
  pullCollectionFromRemote: (collectionId: string) => Promise<GitPullResult>;
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
  // OpenAPI 3 import/export
  importOpenAPI3: () => Promise<CollectionNode[]>;
  exportOpenAPI3: (collectionIds?: string[]) => Promise<void>;
  // Postman collection import
  importPostman: () => Promise<CollectionNode[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
