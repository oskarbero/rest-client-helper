import * as fs from 'fs';
import * as path from 'path';
import { HttpRequest, createEmptyRequest } from '../types';
import { CONFIG } from '../constants';

const STATE_FILE_NAME = CONFIG.FILES.STATE;

export interface AppState {
  request: HttpRequest;
  lastSaved: string;
  currentRequestId?: string | null;
  expandedNodes?: string[];
}

export interface LoadedAppState {
  request: HttpRequest;
  currentRequestId: string | null;
  expandedNodes: string[];
}

/**
 * Gets the path to the state file
 */
function getStateFilePath(userDataPath: string): string {
  return path.join(userDataPath, STATE_FILE_NAME);
}

/**
 * Saves the current application state to disk
 */
export async function saveState(
  userDataPath: string,
  request: HttpRequest,
  currentRequestId?: string | null,
  expandedNodes?: Set<string>
): Promise<void> {
  const state: AppState = {
    request,
    lastSaved: new Date().toISOString(),
    currentRequestId: currentRequestId ?? null,
    expandedNodes: expandedNodes ? Array.from(expandedNodes) : [],
  };

  const filePath = getStateFilePath(userDataPath);
  
  try {
    await fs.promises.writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save state:', error);
    throw error;
  }
}

/**
 * Loads the application state from disk
 * Returns the full state object with defaults if no state exists or loading fails
 */
export async function loadState(userDataPath: string): Promise<LoadedAppState> {
  const filePath = getStateFilePath(userDataPath);

  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    const state: AppState = JSON.parse(data);
    
    // Validate and return the full state, merging with defaults for any missing fields
    return {
      request: {
        ...createEmptyRequest(),
        ...state.request,
      },
      currentRequestId: state.currentRequestId ?? null,
      expandedNodes: state.expandedNodes ?? [],
    };
  } catch (error) {
    // File doesn't exist or is invalid - return default state
    return {
      request: createEmptyRequest(),
      currentRequestId: null,
      expandedNodes: [],
    };
  }
}
