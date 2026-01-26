import { ipcMain, app } from 'electron';
import { sendRequest } from '../core/http-client';
import { saveState, loadState } from '../core/state-persistence';
import { 
  getCollectionsTree,
  createCollection,
  saveRequestToCollection,
  deleteCollectionNode,
  renameCollectionNode,
  moveCollectionNode,
  getEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  setActiveEnvironment,
  getActiveEnvironment
} from '../core/storage';
import { HttpRequest, HttpResponse, CollectionNode, Environment, EnvironmentVariable } from '../core/types';

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

  // Environment handlers
  ipcMain.handle('environment:getAll', async (): Promise<Environment[]> => {
    return getEnvironments(userDataPath);
  });

  ipcMain.handle('environment:create', async (_event, name: string): Promise<Environment> => {
    return createEnvironment(userDataPath, name);
  });

  ipcMain.handle('environment:update', async (_event, id: string, name: string, variables: EnvironmentVariable[]): Promise<Environment> => {
    return updateEnvironment(userDataPath, id, name, variables);
  });

  ipcMain.handle('environment:delete', async (_event, id: string): Promise<boolean> => {
    return deleteEnvironment(userDataPath, id);
  });

  ipcMain.handle('environment:setActive', async (_event, id: string | null): Promise<void> => {
    return setActiveEnvironment(userDataPath, id);
  });

  ipcMain.handle('environment:getActive', async (): Promise<Environment | null> => {
    return getActiveEnvironment(userDataPath);
  });
}
