import * as fs from 'fs';
import * as path from 'path';
import { CollectionNode, CollectionsConfig, HttpRequest, Environment, EnvironmentsConfig, EnvironmentVariable } from './types';

// Collections are stored in a single JSON file
const COLLECTIONS_FILE = 'collections.json';
// Environments are stored in a single JSON file
const ENVIRONMENTS_FILE = 'environments.json';

/**
 * Gets the path to the collections config file
 */
function getCollectionsFilePath(basePath: string): string {
  return path.join(basePath, COLLECTIONS_FILE);
}

/**
 * Generates a unique ID for a node
 */
function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Loads the collections configuration from file
 */
export async function loadCollectionsConfig(basePath: string): Promise<CollectionsConfig> {
  const filePath = getCollectionsFilePath(basePath);

  if (!fs.existsSync(filePath)) {
    // Return empty config if file doesn't exist
    return {
      version: '1.0.0',
      collections: [],
    };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(content) as CollectionsConfig;
    
    // Validate structure
    if (!config.collections || !Array.isArray(config.collections)) {
      return {
        version: config.version || '1.0.0',
        collections: [],
      };
    }

    return config;
  } catch (error) {
    console.error('Failed to load collections config:', error);
    // Return empty config on error
    return {
      version: '1.0.0',
      collections: [],
    };
  }
}

/**
 * Saves the collections configuration to file
 */
export async function saveCollectionsConfig(
  basePath: string,
  config: CollectionsConfig
): Promise<void> {
  const filePath = getCollectionsFilePath(basePath);
  
  // Ensure directory exists
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Recursively finds a node by ID in the tree
 */
function findNodeById(nodes: CollectionNode[], id: string): CollectionNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Recursively finds a node's parent and the node itself
 */
function findNodeWithParent(
  nodes: CollectionNode[],
  id: string,
  parent: CollectionNode[] | null = null
): { node: CollectionNode; parent: CollectionNode[] } | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.id === id) {
      return { node, parent: parent || nodes };
    }
    if (node.children) {
      const found = findNodeWithParent(node.children, id, node.children);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Validates that a name is unique among siblings
 */
function validateNameUniqueness(
  siblings: CollectionNode[],
  name: string,
  excludeId?: string
): boolean {
  return !siblings.some(
    (sibling) => sibling.name === name && sibling.id !== excludeId
  );
}

/**
 * Gets the entire collections tree
 */
export async function getCollectionsTree(basePath: string): Promise<CollectionNode[]> {
  const config = await loadCollectionsConfig(basePath);
  return config.collections;
}

/**
 * Creates a new collection
 */
export async function createCollection(
  basePath: string,
  name: string,
  parentId?: string
): Promise<CollectionNode> {
  const config = await loadCollectionsConfig(basePath);
  const now = new Date().toISOString();

  const newCollection: CollectionNode = {
    id: generateId(),
    name,
    type: 'collection',
    createdAt: now,
    updatedAt: now,
    children: [],
  };

  if (parentId) {
    const parentResult = findNodeWithParent(config.collections, parentId);
    if (!parentResult) {
      throw new Error(`Parent collection with id ${parentId} not found`);
    }

    const { node: parent } = parentResult;
    if (parent.type !== 'collection') {
      throw new Error('Parent must be a collection');
    }

    // Validate name uniqueness
    if (!validateNameUniqueness(parent.children || [], name)) {
      throw new Error(`A collection with name "${name}" already exists in this parent`);
    }

    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(newCollection);
    parent.updatedAt = now;
  } else {
    // Add to root
    if (!validateNameUniqueness(config.collections, name)) {
      throw new Error(`A collection with name "${name}" already exists at root level`);
    }
    config.collections.push(newCollection);
  }

  await saveCollectionsConfig(basePath, config);
  return newCollection;
}

/**
 * Saves a request to a collection
 */
export async function saveRequestToCollection(
  basePath: string,
  name: string,
  request: HttpRequest,
  parentId?: string,
  existingId?: string
): Promise<CollectionNode> {
  const config = await loadCollectionsConfig(basePath);
  const now = new Date().toISOString();

  let requestNode: CollectionNode;

  if (existingId) {
    // Update existing request
    const existing = findNodeById(config.collections, existingId);
    if (!existing) {
      throw new Error(`Request with id ${existingId} not found`);
    }
    if (existing.type !== 'request') {
      throw new Error(`Node with id ${existingId} is not a request`);
    }

    requestNode = existing;
    requestNode.name = name;
    requestNode.request = request;
    requestNode.updatedAt = now;

    // If parent changed, we need to move it
    const currentParentResult = findNodeWithParent(config.collections, existingId);
    if (currentParentResult) {
      const { node: currentParent, parent: currentParentArray } = currentParentResult;
      const currentIndex = currentParentArray.findIndex((n) => n.id === existingId);
      
      if (parentId !== currentParent?.id) {
        // Remove from current parent
        currentParentArray.splice(currentIndex, 1);
        if (currentParent && currentParent.type === 'collection') {
          currentParent.updatedAt = now;
        }

        // Add to new parent
        if (parentId) {
          const newParentResult = findNodeWithParent(config.collections, parentId);
          if (!newParentResult) {
            throw new Error(`Parent collection with id ${parentId} not found`);
          }
          const { node: newParent } = newParentResult;
          if (newParent.type !== 'collection') {
            throw new Error('Parent must be a collection');
          }
          if (!newParent.children) {
            newParent.children = [];
          }
          
          // Validate name uniqueness in new parent
          if (!validateNameUniqueness(newParent.children, name, existingId)) {
            throw new Error(`A request with name "${name}" already exists in this collection`);
          }
          
          newParent.children.push(requestNode);
          newParent.updatedAt = now;
        } else {
          // Add to root
          if (!validateNameUniqueness(config.collections, name, existingId)) {
            throw new Error(`A request with name "${name}" already exists at root level`);
          }
          config.collections.push(requestNode);
        }
      } else {
        // Same parent, just validate name uniqueness
        const siblings = currentParentArray.filter((n) => n.id !== existingId);
        if (!validateNameUniqueness(siblings, name)) {
          throw new Error(`A request with name "${name}" already exists in this collection`);
        }
      }
    }
  } else {
    // Create new request
    requestNode = {
      id: generateId(),
      name,
      type: 'request',
      createdAt: now,
      updatedAt: now,
      request,
    };

    if (parentId) {
      const parentResult = findNodeWithParent(config.collections, parentId);
      if (!parentResult) {
        throw new Error(`Parent collection with id ${parentId} not found`);
      }

      const { node: parent } = parentResult;
      if (parent.type !== 'collection') {
        throw new Error('Parent must be a collection');
      }

      // Validate name uniqueness
      if (!validateNameUniqueness(parent.children || [], name)) {
        throw new Error(`A request with name "${name}" already exists in this collection`);
      }

      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(requestNode);
      parent.updatedAt = now;
    } else {
      // Add to root
      if (!validateNameUniqueness(config.collections, name)) {
        throw new Error(`A request with name "${name}" already exists at root level`);
      }
      config.collections.push(requestNode);
    }
  }

  await saveCollectionsConfig(basePath, config);
  return requestNode;
}

/**
 * Deletes a collection node (collection or request)
 */
export async function deleteCollectionNode(
  basePath: string,
  id: string
): Promise<boolean> {
  const config = await loadCollectionsConfig(basePath);
  const result = findNodeWithParent(config.collections, id);

  if (!result) {
    return false;
  }

  const { parent } = result;
  const index = parent.findIndex((n) => n.id === id);
  
  if (index === -1) {
    return false;
  }

  parent.splice(index, 1);
  
  // Update parent's updatedAt if it's a collection
  const parentNode = result.node;
  if (parentNode && parentNode.type === 'collection') {
    parentNode.updatedAt = new Date().toISOString();
  }

  await saveCollectionsConfig(basePath, config);
  return true;
}

/**
 * Renames a collection node
 */
export async function renameCollectionNode(
  basePath: string,
  id: string,
  newName: string
): Promise<CollectionNode | null> {
  const config = await loadCollectionsConfig(basePath);
  const result = findNodeWithParent(config.collections, id);

  if (!result) {
    return null;
  }

  const { node, parent } = result;

  // Validate name uniqueness among siblings
  const siblings = parent.filter((n) => n.id !== id);
  if (!validateNameUniqueness(siblings, newName)) {
    throw new Error(`A ${node.type} with name "${newName}" already exists in this parent`);
  }

  node.name = newName;
  node.updatedAt = new Date().toISOString();

  await saveCollectionsConfig(basePath, config);
  return node;
}

/**
 * Moves a collection node to a different parent
 */
export async function moveCollectionNode(
  basePath: string,
  id: string,
  newParentId?: string
): Promise<CollectionNode | null> {
  const config = await loadCollectionsConfig(basePath);
  const result = findNodeWithParent(config.collections, id);

  if (!result) {
    return null;
  }

  const { node, parent: currentParent } = result;

  // Don't allow moving a node into itself or its descendants
  if (newParentId) {
    const isDescendant = (checkId: string, checkNode: CollectionNode): boolean => {
      if (checkNode.id === checkId) return true;
      if (checkNode.children) {
        return checkNode.children.some((child) => isDescendant(checkId, child));
      }
      return false;
    };

    if (isDescendant(newParentId, node)) {
      throw new Error('Cannot move a collection into itself or its descendants');
    }
  }

  // Remove from current parent
  const currentIndex = currentParent.findIndex((n) => n.id === id);
  if (currentIndex === -1) {
    return null;
  }

  currentParent.splice(currentIndex, 1);

  // Update current parent's updatedAt if it's a collection
  const currentParentNode = result.node;
  if (currentParentNode && currentParentNode.type === 'collection') {
    currentParentNode.updatedAt = new Date().toISOString();
  }

  // Add to new parent
  if (newParentId) {
    const newParentResult = findNodeWithParent(config.collections, newParentId);
    if (!newParentResult) {
      throw new Error(`Parent collection with id ${newParentId} not found`);
    }

    const { node: newParent } = newParentResult;
    if (newParent.type !== 'collection') {
      throw new Error('Parent must be a collection');
    }

    // Validate name uniqueness in new parent
    if (!validateNameUniqueness(newParent.children || [], node.name)) {
      throw new Error(`A ${node.type} with name "${node.name}" already exists in the target collection`);
    }

    if (!newParent.children) {
      newParent.children = [];
    }
    newParent.children.push(node);
    newParent.updatedAt = new Date().toISOString();
  } else {
    // Add to root
    if (!validateNameUniqueness(config.collections, node.name)) {
      throw new Error(`A ${node.type} with name "${node.name}" already exists at root level`);
    }
    config.collections.push(node);
  }

  node.updatedAt = new Date().toISOString();

  await saveCollectionsConfig(basePath, config);
  return node;
}

// ============================================================================
// Environment Storage Functions
// ============================================================================

/**
 * Gets the path to the environments config file
 */
function getEnvironmentsFilePath(basePath: string): string {
  return path.join(basePath, ENVIRONMENTS_FILE);
}

/**
 * Loads the environments configuration from file
 */
export async function loadEnvironmentsConfig(basePath: string): Promise<EnvironmentsConfig> {
  const filePath = getEnvironmentsFilePath(basePath);

  if (!fs.existsSync(filePath)) {
    // Return empty config if file doesn't exist
    return {
      version: '1.0.0',
      environments: [],
    };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(content) as EnvironmentsConfig;
    
    // Validate structure
    if (!config.environments || !Array.isArray(config.environments)) {
      return {
        version: config.version || '1.0.0',
        environments: [],
        activeEnvironmentId: config.activeEnvironmentId,
      };
    }

    return config;
  } catch (error) {
    console.error('Failed to load environments config:', error);
    // Return empty config on error
    return {
      version: '1.0.0',
      environments: [],
    };
  }
}

/**
 * Saves the environments configuration to file
 */
export async function saveEnvironmentsConfig(
  basePath: string,
  config: EnvironmentsConfig
): Promise<void> {
  const filePath = getEnvironmentsFilePath(basePath);
  
  // Ensure directory exists
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Gets all environments
 */
export async function getEnvironments(basePath: string): Promise<Environment[]> {
  const config = await loadEnvironmentsConfig(basePath);
  return config.environments;
}

/**
 * Creates a new environment
 */
export async function createEnvironment(
  basePath: string,
  name: string
): Promise<Environment> {
  const config = await loadEnvironmentsConfig(basePath);
  const now = new Date().toISOString();

  // Validate name uniqueness
  if (config.environments.some(env => env.name === name)) {
    throw new Error(`An environment with name "${name}" already exists`);
  }

  const newEnvironment: Environment = {
    id: generateId(),
    name,
    variables: [],
    createdAt: now,
    updatedAt: now,
  };

  config.environments.push(newEnvironment);
  await saveEnvironmentsConfig(basePath, config);
  return newEnvironment;
}

/**
 * Updates an environment
 */
export async function updateEnvironment(
  basePath: string,
  id: string,
  name: string,
  variables: EnvironmentVariable[]
): Promise<Environment> {
  const config = await loadEnvironmentsConfig(basePath);
  const environment = config.environments.find(env => env.id === id);

  if (!environment) {
    throw new Error(`Environment with id ${id} not found`);
  }

  // Validate name uniqueness (excluding current environment)
  if (config.environments.some(env => env.name === name && env.id !== id)) {
    throw new Error(`An environment with name "${name}" already exists`);
  }

  environment.name = name;
  environment.variables = variables;
  environment.updatedAt = new Date().toISOString();

  await saveEnvironmentsConfig(basePath, config);
  return environment;
}

/**
 * Deletes an environment
 */
export async function deleteEnvironment(
  basePath: string,
  id: string
): Promise<boolean> {
  const config = await loadEnvironmentsConfig(basePath);
  const index = config.environments.findIndex(env => env.id === id);

  if (index === -1) {
    return false;
  }

  config.environments.splice(index, 1);
  
  // Clear active environment if it was deleted
  if (config.activeEnvironmentId === id) {
    config.activeEnvironmentId = undefined;
  }

  await saveEnvironmentsConfig(basePath, config);
  return true;
}

/**
 * Sets the active environment
 */
export async function setActiveEnvironment(
  basePath: string,
  id: string | null
): Promise<void> {
  const config = await loadEnvironmentsConfig(basePath);

  if (id !== null) {
    // Validate that the environment exists
    if (!config.environments.some(env => env.id === id)) {
      throw new Error(`Environment with id ${id} not found`);
    }
  }

  config.activeEnvironmentId = id || undefined;
  await saveEnvironmentsConfig(basePath, config);
}

/**
 * Gets the currently active environment
 */
export async function getActiveEnvironment(
  basePath: string
): Promise<Environment | null> {
  const config = await loadEnvironmentsConfig(basePath);

  if (!config.activeEnvironmentId) {
    return null;
  }

  const environment = config.environments.find(
    env => env.id === config.activeEnvironmentId
  );

  return environment || null;
}
