import { ipcMain, app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { sendRequest } from '../core/http-client';
import { saveState, loadState, LoadedAppState } from '../core/state-persistence';
import { 
  getCollectionsTree,
  createCollection,
  saveRequestToCollection,
  deleteCollectionNode,
  renameCollectionNode,
  moveCollectionNode,
  updateCollectionSettings,
  getCollectionSettings,
  getEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  duplicateEnvironment,
  setActiveEnvironment,
  getActiveEnvironment,
  loadEnvironmentsConfig,
  saveEnvironmentsConfig,
  loadCollectionsConfig,
  saveCollectionsConfig
} from '../core/storage';
import { HttpRequest, HttpResponse, CollectionNode, Environment, EnvironmentVariable, CollectionSettings } from '../core/types';
import { parseOpenAPI3 } from '../core/openapi3-parser';
import { exportToOpenAPI3 } from '../core/openapi3-exporter';
import { findNodeById } from '../core/utils';
import { syncCollectionToRemote, GitSyncResult } from '../core/collection-git-sync';

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
  ipcMain.handle('state:save', async (
    _event,
    request: HttpRequest,
    currentRequestId?: string | null,
    expandedNodes?: string[]
  ): Promise<void> => {
    const expandedNodesSet = expandedNodes ? new Set(expandedNodes) : undefined;
    await saveState(userDataPath, request, currentRequestId, expandedNodesSet);
  });

  ipcMain.handle('state:load', async (): Promise<LoadedAppState> => {
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

  ipcMain.handle('collection:getSettings', async (_event, collectionId: string): Promise<CollectionSettings | null> => {
    return getCollectionSettings(userDataPath, collectionId);
  });

  ipcMain.handle('collection:updateSettings', async (_event, collectionId: string, settings: CollectionSettings): Promise<CollectionNode | null> => {
    return updateCollectionSettings(userDataPath, collectionId, settings);
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

  ipcMain.handle('environment:duplicate', async (_event, sourceId: string, newName: string): Promise<Environment> => {
    return duplicateEnvironment(userDataPath, sourceId, newName);
  });

  ipcMain.handle('environment:setActive', async (_event, id: string | null): Promise<void> => {
    return setActiveEnvironment(userDataPath, id);
  });

  ipcMain.handle('environment:getActive', async (): Promise<Environment | null> => {
    return getActiveEnvironment(userDataPath);
  });

  // Link environment to .env file
  ipcMain.handle('environment:linkEnvFile', async (_event, environmentId: string): Promise<{ filePath: string; lastModified: string } | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Select .env file to link',
      filters: [
        { name: 'Environment Files', extensions: ['env'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const stats = await fs.promises.stat(filePath);
    const lastModified = stats.mtime.toISOString();

    // Update environment with file path and modified date
    const config = await loadEnvironmentsConfig(userDataPath);
    const environment = config.environments.find(env => env.id === environmentId);
    
    if (!environment) {
      throw new Error(`Environment with id ${environmentId} not found`);
    }

    environment.envFilePath = filePath;
    environment.envFileLastModified = lastModified;
    environment.updatedAt = new Date().toISOString();

    await saveEnvironmentsConfig(userDataPath, config);

    return { filePath, lastModified };
  });

  // Unlink environment from .env file
  ipcMain.handle('environment:unlinkEnvFile', async (_event, environmentId: string): Promise<void> => {
    const config = await loadEnvironmentsConfig(userDataPath);
    const environment = config.environments.find(env => env.id === environmentId);
    
    if (!environment) {
      throw new Error(`Environment with id ${environmentId} not found`);
    }

    environment.envFilePath = undefined;
    environment.envFileLastModified = undefined;
    environment.updatedAt = new Date().toISOString();

    await saveEnvironmentsConfig(userDataPath, config);
  });

  // Read variables from .env file
  ipcMain.handle('environment:readVariablesFromFile', async (_event, filePath: string): Promise<EnvironmentVariable[]> => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const { parseEnvFile } = await import('../core/env-parser');
      return parseEnvFile(content);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to read file';
      throw new Error(`Failed to read .env file: ${errorMessage}`);
    }
  });

  // Get environment with variables loaded from file if linked
  // Merges file variables with user-defined variables (user vars override file vars)
  ipcMain.handle('environment:getWithVariables', async (_event, environmentId: string): Promise<Environment | null> => {
    const environments = await getEnvironments(userDataPath);
    const environment = environments.find(env => env.id === environmentId);
    
    if (!environment) {
      return null;
    }

    // If environment is linked to a file, merge file variables with user-defined variables
    if (environment.envFilePath) {
      try {
        const { parseEnvFile } = await import('../core/env-parser');
        const content = await fs.promises.readFile(environment.envFilePath, 'utf-8');
        const fileVariables = parseEnvFile(content);
        
        // Create a map starting with file variables
        const mergedVarsMap = new Map<string, EnvironmentVariable>();
        fileVariables.forEach(v => {
          if (v.key && v.key.trim()) {
            mergedVarsMap.set(v.key.trim(), v);
          }
        });
        
        // User-defined variables override file variables (user vars take precedence)
        environment.variables.forEach(v => {
          if (v.key && v.key.trim()) {
            mergedVarsMap.set(v.key.trim(), v);
          }
        });
        
        // Convert back to array
        const mergedVariables = Array.from(mergedVarsMap.values());
        
        // Return environment with merged variables (file vars + user vars, user vars take precedence)
        return {
          ...environment,
          variables: mergedVariables,
        };
      } catch (error) {
        // If file read fails, return environment with stored variables (fallback)
        console.error('Failed to read .env file, using stored variables:', error);
        return environment;
      }
    }

    // Not linked to file, return as-is with stored variables
    return environment;
  });

  // OpenAPI 3 import/export handlers
  ipcMain.handle('openapi3:import', async (): Promise<CollectionNode[]> => {
    const result = await dialog.showOpenDialog({
      title: 'Import OpenAPI 3 Specification',
      filters: [
        { name: 'OpenAPI Files', extensions: ['json', 'yaml', 'yml'] },
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'YAML Files', extensions: ['yaml', 'yml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return [];
    }

    const filePath = result.filePaths[0];
    const content = await fs.promises.readFile(filePath, 'utf-8');

    // Parse file content (JSON or YAML)
    let spec: any;
    const fileExt = filePath.toLowerCase();
    if (fileExt.endsWith('.yaml') || fileExt.endsWith('.yml')) {
      // Try to load js-yaml dynamically
      try {
        const yaml = await import('js-yaml');
        spec = yaml.load(content);
      } catch (error) {
        throw new Error('YAML parsing requires js-yaml package. Please install it: npm install js-yaml @types/js-yaml');
      }
    } else {
      // JSON
      try {
        spec = JSON.parse(content);
      } catch (error) {
        throw new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Validate OpenAPI version
    if (!spec.openapi || !spec.openapi.startsWith('3.')) {
      throw new Error('This file does not appear to be an OpenAPI 3.0 specification');
    }

    // Parse OpenAPI spec to CollectionNodes
    const importedNodes = parseOpenAPI3(spec);

    // Save imported collections to storage
    const config = await loadCollectionsConfig(userDataPath);
    
    // Add imported collections to existing collections
    for (const node of importedNodes) {
      config.collections.push(node);
    }

    await saveCollectionsConfig(userDataPath, config);

    return importedNodes;
  });

  ipcMain.handle('openapi3:export', async (_event, collectionIds?: string[]): Promise<void> => {
    const config = await loadCollectionsConfig(userDataPath);
    
    let collectionsToExport: CollectionNode[] = [];
    
    if (collectionIds && collectionIds.length > 0) {
      // Export specific collections
      for (const id of collectionIds) {
        const node = findNodeById(config.collections, id);
        if (node) {
          collectionsToExport.push(node);
        }
      }
    } else {
      // Export all collections
      collectionsToExport = config.collections;
    }

    if (collectionsToExport.length === 0) {
      throw new Error('No collections selected for export');
    }

    // Determine title and version from first collection
    const title = collectionsToExport[0]?.name || 'REST Client Collection';
    const version = '1.0.0';

    // Export to OpenAPI 3 format
    const spec = exportToOpenAPI3(collectionsToExport, title, version);

    // Show save dialog
    const result = await dialog.showSaveDialog({
      title: 'Export OpenAPI 3 Specification',
      defaultPath: `${title.replace(/[^a-z0-9]/gi, '_')}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return;
    }

    // Write file
    await fs.promises.writeFile(result.filePath, JSON.stringify(spec, null, 2), 'utf-8');
  });

  // Git sync handler for collections
  ipcMain.handle('collection:syncToRemote', async (_event, collectionId: string): Promise<GitSyncResult> => {
    // Load the collections tree
    const config = await loadCollectionsConfig(userDataPath);
    
    // Find the collection node
    const collectionNode = findNodeById(config.collections, collectionId);
    
    if (!collectionNode) {
      return {
        success: false,
        message: `Collection with id "${collectionId}" not found`,
      };
    }
    
    if (collectionNode.type !== 'collection') {
      return {
        success: false,
        message: 'Can only sync collections, not individual requests',
      };
    }
    
    // Check if git remote is configured
    const gitRemote = collectionNode.settings?.gitRemote;
    if (!gitRemote?.url) {
      return {
        success: false,
        message: 'No Git remote URL configured for this collection. Please configure it in collection settings.',
      };
    }
    
    // Determine branch (default to 'main')
    const branch = gitRemote.branch || 'main';
    
    // Check if this is the first sync (no existing syncFileName)
    const existingFileName = gitRemote.syncFileName;
    const isFirstSync = !existingFileName;
    
    // Cache directory for this collection's repo
    const gitCacheDir = path.join(userDataPath, 'git-cache', collectionId);
    
    // Perform the sync
    const result = await syncCollectionToRemote(
      collectionNode,
      gitRemote.url,
      branch,
      gitCacheDir,
      existingFileName,
      isFirstSync
    );
    
    // If successful, update settings with lastSyncedAt and syncFileName
    if (result.success) {
      const updatedSettings: CollectionSettings = {
        ...collectionNode.settings,
        gitRemote: {
          ...gitRemote,
          syncFileName: result.fileName, // Store the filename for future syncs
        },
        lastSyncedAt: new Date().toISOString(),
      };
      await updateCollectionSettings(userDataPath, collectionId, updatedSettings);
    }
    
    return result;
  });
}
