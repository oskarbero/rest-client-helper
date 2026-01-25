import { ipcMain, app } from 'electron';
import { sendRequest } from '../core/http-client';
import { saveState, loadState } from '../core/state-persistence';
import { HttpRequest, HttpResponse } from '../core/types';

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

  // Placeholder handlers for future milestones (collections)
  ipcMain.handle('request:save', async (_event, _request: unknown) => {
    // Will be implemented in Milestone 7
    return { success: false, message: 'Not implemented yet' };
  });

  ipcMain.handle('request:load', async (_event, _id: string) => {
    // Will be implemented in Milestone 7
    return null;
  });

  ipcMain.handle('request:list', async () => {
    // Will be implemented in Milestone 7
    return [];
  });

  ipcMain.handle('request:delete', async (_event, _id: string) => {
    // Will be implemented in Milestone 7
    return { success: false, message: 'Not implemented yet' };
  });
}
