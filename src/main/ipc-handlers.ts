import { ipcMain, app } from 'electron';
import { sendRequest } from '../core/http-client';
import { saveState, loadState } from '../core/state-persistence';
import { saveRequest, loadRequest, listRequests, deleteRequest, renameRequest } from '../core/storage';
import { HttpRequest, HttpResponse, SavedRequest } from '../core/types';

/**
 * Registers all IPC handlers for communication between renderer and main process
 */
export function registerIpcHandlers(): void {
  const userDataPath = app.getPath('userData');

  // Handle HTTP request
  ipcMain.handle('request:send', async (_event, request: HttpRequest): Promise<HttpResponse> => {
    return sendRequest(request);
  });

  // State persistence handlers
  ipcMain.handle('state:save', async (_event, request: HttpRequest): Promise<void> => {
    await saveState(userDataPath, request);
  });

  ipcMain.handle('state:load', async (): Promise<HttpRequest> => {
    return loadState(userDataPath);
  });

  // Collection handlers
  ipcMain.handle('collection:save', async (_event, name: string, request: HttpRequest, existingId?: string): Promise<SavedRequest> => {
    return saveRequest(userDataPath, name, request, existingId);
  });

  ipcMain.handle('collection:load', async (_event, id: string): Promise<SavedRequest | null> => {
    return loadRequest(userDataPath, id);
  });

  ipcMain.handle('collection:list', async (): Promise<SavedRequest[]> => {
    return listRequests(userDataPath);
  });

  ipcMain.handle('collection:delete', async (_event, id: string): Promise<boolean> => {
    return deleteRequest(userDataPath, id);
  });

  ipcMain.handle('collection:rename', async (_event, id: string, newName: string): Promise<SavedRequest | null> => {
    return renameRequest(userDataPath, id, newName);
  });
}
