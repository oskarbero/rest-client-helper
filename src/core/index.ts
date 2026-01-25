// Core library public API
// This module exports everything needed by the Electron main process
// and can be reused in a VS Code extension

export * from './types';
export { sendRequest } from './http-client';
export { saveState, loadState } from './state-persistence';
