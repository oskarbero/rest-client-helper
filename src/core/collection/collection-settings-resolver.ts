import { CollectionNode, CollectionSettings } from '../types';

/**
 * Finds the path of ancestor collection IDs from root to the parent of the given node
 * @param nodes The root collection nodes
 * @param nodeId The ID of the node to find ancestors for
 * @returns Array of collection IDs from root to parent (excluding the node itself)
 */
export function getAncestorPath(
  nodes: CollectionNode[],
  nodeId: string
): string[] {
  const path: string[] = [];

  function findPath(currentNodes: CollectionNode[], targetId: string, currentPath: string[]): boolean {
    for (const node of currentNodes) {
      if (node.id === targetId) {
        // Found the target node, return the path (excluding the node itself)
        return true;
      }
      
      if (node.type === 'collection' && node.children) {
        // Add this collection to the path if we're searching within it
        const newPath = [...currentPath];
        if (node.id !== targetId) {
          newPath.push(node.id);
        }
        
        if (findPath(node.children, targetId, newPath)) {
          // Found in children, update the path
          path.length = 0;
          path.push(...newPath);
          return true;
        }
      }
    }
    return false;
  }

  findPath(nodes, nodeId, []);
  return path;
}

/**
 * Merges multiple collection settings objects, with later settings overriding earlier ones
 * @param settingsArray Array of settings to merge (in order: parent to child)
 * @returns Merged settings object
 */
export function mergeSettings(...settingsArray: (CollectionSettings | undefined)[]): CollectionSettings {
  const merged: CollectionSettings = {};

  for (const settings of settingsArray) {
    if (!settings) continue;

    // Merge baseUrl (child overrides parent)
    if (settings.baseUrl !== undefined && settings.baseUrl !== '') {
      merged.baseUrl = settings.baseUrl;
    }

    // Merge auth (child overrides parent if child has auth type other than 'none')
    if (settings.auth && settings.auth.type !== 'none') {
      merged.auth = JSON.parse(JSON.stringify(settings.auth)); // Deep copy
    } else if (settings.auth && !merged.auth) {
      // Only use parent auth if child doesn't have one
      merged.auth = JSON.parse(JSON.stringify(settings.auth));
    }

    // Merge headers (child headers override parent headers with same key)
    if (settings.headers && settings.headers.length > 0) {
      if (!merged.headers) {
        merged.headers = [];
      }
      
      // Create a map of existing headers by key (case-insensitive)
      const headerMap = new Map<string, { key: string; value: string; enabled: boolean }>();
      merged.headers.forEach(h => {
        if (h.key) {
          headerMap.set(h.key.toLowerCase(), h);
        }
      });

      // Add/update headers from child settings
      settings.headers.forEach(h => {
        if (h.key) {
          headerMap.set(h.key.toLowerCase(), { ...h });
        }
      });

      merged.headers = Array.from(headerMap.values());
    } else if (settings.headers && !merged.headers) {
      // Only use parent headers if child doesn't have any
      merged.headers = JSON.parse(JSON.stringify(settings.headers));
    }
  }

  return merged;
}

/**
 * Resolves collection settings for a given node by checking its own settings
 * and walking up the parent chain
 * @param nodes The root collection nodes
 * @param nodeId The ID of the node to resolve settings for
 * @returns Resolved collection settings (merged from all ancestors)
 */
export function resolveCollectionSettings(
  nodes: CollectionNode[],
  nodeId: string
): CollectionSettings {
  // Find the node first
  function findNode(currentNodes: CollectionNode[], targetId: string): CollectionNode | null {
    for (const node of currentNodes) {
      if (node.id === targetId) {
        return node;
      }
      if (node.type === 'collection' && node.children) {
        const found = findNode(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  const node = findNode(nodes, nodeId);
  if (!node) {
    return {};
  }

  // Get ancestor path (collections from root to parent)
  const ancestorPath = getAncestorPath(nodes, nodeId);
  
  // Collect settings from ancestors (parent to child order)
  const settingsToMerge: (CollectionSettings | undefined)[] = [];
  
  // Add ancestor settings (from root to parent)
  for (const ancestorId of ancestorPath) {
    const ancestor = findNode(nodes, ancestorId);
    if (ancestor && ancestor.type === 'collection' && ancestor.settings) {
      settingsToMerge.push(ancestor.settings);
    }
  }
  
  // If the node itself is a collection with settings, add them last (highest priority)
  if (node.type === 'collection' && node.settings) {
    settingsToMerge.push(node.settings);
  }

  // Merge all settings (child overrides parent)
  return mergeSettings(...settingsToMerge);
}

/**
 * Finds the collection path for a request node (all collection IDs from root to the request's parent)
 * @param nodes The root collection nodes
 * @param nodeId The ID of the request node
 * @returns Array of collection IDs from root to the request's parent collection
 */
export function findCollectionPath(
  nodes: CollectionNode[],
  nodeId: string
): string[] {
  return getAncestorPath(nodes, nodeId);
}

/**
 * Finds the parent collection ID for a given node (request or collection)
 * @param nodes The root collection nodes
 * @param nodeId The ID of the node
 * @returns The parent collection ID, or null if the node is at root level
 */
export function findParentCollectionId(
  nodes: CollectionNode[],
  nodeId: string
): string | null {
  const path = getAncestorPath(nodes, nodeId);
  // Return the last collection in the path (immediate parent)
  return path.length > 0 ? path[path.length - 1] : null;
}
