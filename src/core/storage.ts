import * as fs from 'fs';
import * as path from 'path';
import { SavedRequest, HttpRequest } from './types';

// Collections are stored as individual JSON files in the collections directory
const COLLECTIONS_DIR = 'collections';

/**
 * Ensures the collections directory exists
 */
function ensureCollectionsDir(basePath: string): string {
  const collectionsPath = path.join(basePath, COLLECTIONS_DIR);
  if (!fs.existsSync(collectionsPath)) {
    fs.mkdirSync(collectionsPath, { recursive: true });
  }
  return collectionsPath;
}

/**
 * Generates a unique ID for a request
 */
function generateId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sanitizes a filename to be safe for the filesystem
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, '_').substring(0, 50);
}

/**
 * Gets the file path for a saved request
 */
function getRequestFilePath(collectionsPath: string, id: string): string {
  return path.join(collectionsPath, `${id}.json`);
}

/**
 * Saves a request to a file
 */
export async function saveRequest(
  basePath: string,
  name: string,
  request: HttpRequest,
  existingId?: string
): Promise<SavedRequest> {
  const collectionsPath = ensureCollectionsDir(basePath);
  
  const now = new Date().toISOString();
  const id = existingId || generateId();
  
  // Get existing request to preserve createdAt
  const existing = existingId ? await loadRequest(basePath, existingId) : null;
  
  const savedRequest: SavedRequest = {
    id,
    name,
    request,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const filePath = getRequestFilePath(collectionsPath, id);
  fs.writeFileSync(filePath, JSON.stringify(savedRequest, null, 2), 'utf-8');

  return savedRequest;
}

/**
 * Loads a single request by ID
 */
export async function loadRequest(
  basePath: string,
  id: string
): Promise<SavedRequest | null> {
  const collectionsPath = ensureCollectionsDir(basePath);
  const filePath = getRequestFilePath(collectionsPath, id);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as SavedRequest;
  } catch {
    return null;
  }
}

/**
 * Lists all saved requests
 */
export async function listRequests(basePath: string): Promise<SavedRequest[]> {
  const collectionsPath = ensureCollectionsDir(basePath);

  const files = fs.readdirSync(collectionsPath).filter(f => f.endsWith('.json'));
  const requests: SavedRequest[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(collectionsPath, file), 'utf-8');
      const request = JSON.parse(content) as SavedRequest;
      requests.push(request);
    } catch {
      // Skip invalid files
      console.error(`Failed to parse ${file}`);
    }
  }

  // Sort by updatedAt descending (most recent first)
  return requests.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Deletes a saved request
 */
export async function deleteRequest(basePath: string, id: string): Promise<boolean> {
  const collectionsPath = ensureCollectionsDir(basePath);
  const filePath = getRequestFilePath(collectionsPath, id);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Renames a saved request
 */
export async function renameRequest(
  basePath: string,
  id: string,
  newName: string
): Promise<SavedRequest | null> {
  const existing = await loadRequest(basePath, id);
  if (!existing) {
    return null;
  }

  existing.name = newName;
  existing.updatedAt = new Date().toISOString();

  const collectionsPath = ensureCollectionsDir(basePath);
  const filePath = getRequestFilePath(collectionsPath, id);
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8');

  return existing;
}

