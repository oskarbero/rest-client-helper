// Core library public API
// This module exports everything needed by the Electron main process
// and can be reused in a VS Code extension

export * from './types';
export { sendRequest } from './http-client';
export { saveState, loadState } from './state-persistence';
export { generateAuthHeaders, generateAuthQueryParam, isAuthConfigValid } from './auth-handler';
export { 
  formatResponseBody, 
  formatJson, 
  formatXml, 
  detectContentType, 
  tokenizeJson, 
  getHighlightedTokens 
} from './response-parser';
