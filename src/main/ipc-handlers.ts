import { ipcMain, app } from 'electron';
import { sendRequest } from '../core/http-client';
import { saveState, loadState } from '../core/state-persistence';
import { 
  getCollectionsTree,
  createCollection,
  saveRequestToCollection,
  deleteCollectionNode,
  renameCollectionNode,
  moveCollectionNode
} from '../core/storage';
import { HttpRequest, HttpResponse, CollectionNode } from '../core/types';

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

  // Collection handlers (tree-based)
  ipcMain.handle('collection:getTree', async (): Promise<CollectionNode[]> => {
    return getCollectionsTree(userDataPath);
  });

  ipcMain.handle('collection:create', async (_event, name: string, parentId?: string): Promise<CollectionNode> => {
    return createCollection(userDataPath, name, parentId);
  });

  ipcMain.handle('collection:saveRequest', async (_event, name: string, request: HttpRequest, parentId?: string, existingId?: string): Promise<CollectionNode> => {
    return saveRequestToCollection(userDataPath, name, request, parentId, existingId);
  });

  ipcMain.handle('collection:delete', async (_event, id: string): Promise<boolean> => {
    return deleteCollectionNode(userDataPath, id);
  });

  ipcMain.handle('collection:rename', async (_event, id: string, newName: string): Promise<CollectionNode | null> => {
    return renameCollectionNode(userDataPath, id, newName);
  });

  ipcMain.handle('collection:move', async (_event, id: string, newParentId?: string): Promise<CollectionNode | null> => {
    return moveCollectionNode(userDataPath, id, newParentId);
  });
}
