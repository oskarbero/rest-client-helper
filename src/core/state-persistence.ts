import * as fs from 'fs';
import * as path from 'path';
import { HttpRequest, createEmptyRequest } from './types';

const STATE_FILE_NAME = 'app-state.json';

interface AppState {
  request: HttpRequest;
  lastSaved: string;
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
export async function saveState(userDataPath: string, request: HttpRequest): Promise<void> {
  const state: AppState = {
    request,
    lastSaved: new Date().toISOString(),
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
 * Returns the default empty request if no state exists or loading fails
 */
export async function loadState(userDataPath: string): Promise<HttpRequest> {
  const filePath = getStateFilePath(userDataPath);

  try {
    const data = await fs.promises.readFile(filePath, 'utf-8');
    const state: AppState = JSON.parse(data);
    
    // Validate and return the request, merging with defaults for any missing fields
    return {
      ...createEmptyRequest(),
      ...state.request,
    };
  } catch (error) {
    // File doesn't exist or is invalid - return default state
    return createEmptyRequest();
  }
}
