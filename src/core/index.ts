// Core library public API
// This module exports everything needed by the Electron main process
// and can be reused in a VS Code extension

export * from './types';
export { CONFIG } from './constants';
export { findNodeById, isValidUrl, deepEqual } from './utils';

export { sendRequest, generateAuthHeaders, generateAuthQueryParam, isAuthConfigValid, createEmptyAuth } from './http';
export {
  formatResponseBody,
  formatJson,
  formatXml,
  detectContentType,
  tokenizeJson,
  getHighlightedTokens,
} from './http';
export type { Token, TokenType } from './http';
export { setFetch, clearFetch, getFetch, hasCustomFetch } from './http';
export type { FetchFunction } from './http';

export { saveState, loadState } from './persistence';
export type { AppState, LoadedAppState } from './persistence';

export {
  replaceVariables,
  resolveRequestVariables,
  resolveRequestWithCollectionSettings,
  parseEnvFile,
} from './variables';

export {
  loadCollectionsConfig,
  saveCollectionsConfig,
  getCollectionsTree,
  createCollection,
  saveRequestToCollection,
  deleteCollectionNode,
  renameCollectionNode,
  moveCollectionNode,
  updateCollectionSettings,
  getCollectionSettings,
  loadEnvironmentsConfig,
  saveEnvironmentsConfig,
  getEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  duplicateEnvironment,
  setActiveEnvironment,
  getActiveEnvironment,
  getAncestorPath,
  mergeSettings,
  resolveCollectionSettings,
  findCollectionPath,
  findParentCollectionId,
  groupRequestsByPath,
  flattenPathGroup,
} from './collection';
export type { PathGroup } from './collection';

export { parsePostmanCollection, parseOpenAPI3, exportToOpenAPI3 } from './import-export';

export {
  getOrCloneRepo,
  pushCollectionSubtree,
  syncCollectionToRemote,
  pullCollectionFromRemote,
} from './git';
export type { GitSyncResult, GitPullResult } from './git';
