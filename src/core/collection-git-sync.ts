/**
 * Git sync module for collections
 * Handles cloning, fetching, and pushing collection data to Git remotes
 */

import path from 'path';
import fs from 'fs';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import { CollectionNode } from './types';

export interface GitSyncResult {
  success: boolean;
  message: string;
  commitHash?: string;
  fileName?: string; // The filename used for the collection in the repo
}

export interface GitPullResult {
  success: boolean;
  message: string;
  collection?: CollectionNode; // The pulled collection data
}

/**
 * Sanitizes a collection name for use as a filename
 * Removes/replaces characters that are invalid in filenames
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid filename characters
    .replace(/\s+/g, '_')          // Replace whitespace with underscores
    .replace(/-+/g, '-')           // Collapse multiple dashes
    .replace(/_+/g, '_')           // Collapse multiple underscores
    .replace(/^[-_]+|[-_]+$/g, '') // Trim leading/trailing dashes and underscores
    .toLowerCase()
    .slice(0, 100);                // Limit length
}

/**
 * Generates a filename for the collection
 * Format: {collection-name}.json (for subsequent syncs)
 * Format: {collection-name}_{timestamp}.json (for first sync)
 */
function generateCollectionFileName(collectionName: string, isFirstSync: boolean): string {
  const sanitized = sanitizeFileName(collectionName);
  const baseName = sanitized || 'collection';
  
  if (isFirstSync) {
    // Use a compact timestamp: YYYYMMDD_HHmmss
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .slice(0, 15); // YYYYMMDD_HHmmss
    return `${baseName}_${timestamp}.json`;
  }
  
  return `${baseName}.json`;
}

/**
 * Ensures the git cache directory exists
 */
async function ensureCacheDir(cacheDir: string): Promise<void> {
  await fs.promises.mkdir(cacheDir, { recursive: true });
}

/**
 * Check if a directory is a git repository
 */
async function isGitRepo(dirPath: string): Promise<boolean> {
  try {
    const gitDir = path.join(dirPath, '.git');
    const stats = await fs.promises.stat(gitDir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get the remote URL of a git repository
 */
async function getRemoteUrl(git: SimpleGit): Promise<string | null> {
  try {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(r => r.name === 'origin');
    return origin?.refs?.fetch || origin?.refs?.push || null;
  } catch {
    return null;
  }
}

/**
 * Normalize Git URL for comparison (handles both HTTPS and SSH formats)
 */
function normalizeGitUrl(url: string): string {
  // Remove trailing .git if present
  let normalized = url.replace(/\.git$/, '');
  
  // Convert SSH URLs to a comparable format
  // git@github.com:user/repo -> github.com/user/repo
  const sshMatch = normalized.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    normalized = `${sshMatch[1]}/${sshMatch[2]}`;
  }
  
  // Remove protocol from HTTPS URLs
  // https://github.com/user/repo -> github.com/user/repo
  normalized = normalized.replace(/^https?:\/\//, '');
  
  // Remove authentication from URL if present
  normalized = normalized.replace(/^[^@]+@/, '');
  
  return normalized.toLowerCase();
}

/**
 * Check if two Git URLs point to the same repository
 */
function isSameRepo(url1: string, url2: string): boolean {
  return normalizeGitUrl(url1) === normalizeGitUrl(url2);
}

/**
 * Maps common Git error messages to user-friendly messages
 * Returns null if no specific mapping is found
 */
function mapGitErrorToFriendlyMessage(errorMessage: string): string | null {
  if (errorMessage.includes('Authentication failed') || errorMessage.includes('could not read Username')) {
    return 'Authentication failed. Please check your Git credentials (ensure Git credential helper is configured or SSH keys are set up).';
  }
  
  if (errorMessage.includes('Could not resolve host') || errorMessage.includes('unable to access')) {
    return 'Network error: Unable to connect to the remote repository. Please check your internet connection.';
  }
  
  if (errorMessage.includes('non-fast-forward') || errorMessage.includes('rejected')) {
    return 'Push rejected: The remote has changes that are not in your local copy. Please pull changes first.';
  }
  
  if (errorMessage.includes('Permission denied')) {
    return 'Permission denied: You do not have write access to this repository.';
  }
  
  return null;
}

/**
 * Gets or clones a repository to the cache directory
 * If the cache already exists with the same remote, performs a fetch instead
 */
export async function getOrCloneRepo(
  remoteUrl: string,
  branch: string,
  cacheDir: string
): Promise<{ git: SimpleGit; path: string }> {
  await ensureCacheDir(path.dirname(cacheDir));

  const gitOptions: Partial<SimpleGitOptions> = {
    baseDir: cacheDir,
    binary: 'git',
    maxConcurrentProcesses: 1,
    trimmed: true,
  };

  // Check if cache directory exists and is a git repo
  if (await isGitRepo(cacheDir)) {
    const git = simpleGit(gitOptions);
    const existingRemote = await getRemoteUrl(git);

    // If it's the same repo, fetch and checkout
    if (existingRemote && isSameRepo(existingRemote, remoteUrl)) {
      try {
        await git.fetch('origin', branch);
        await git.checkout(branch);
        await git.pull('origin', branch, { '--rebase': 'true' });
        return { git, path: cacheDir };
      } catch (error) {
        // If fetch/pull fails, try resetting to remote
        try {
          await git.fetch('origin', branch);
          await git.reset(['--hard', `origin/${branch}`]);
          return { git, path: cacheDir };
        } catch {
          // If all else fails, remove and re-clone
          await fs.promises.rm(cacheDir, { recursive: true, force: true });
        }
      }
    } else {
      // Different repo, remove and clone
      await fs.promises.rm(cacheDir, { recursive: true, force: true });
    }
  }

  // Clone the repository
  await ensureCacheDir(cacheDir);
  const git = simpleGit({ ...gitOptions, baseDir: path.dirname(cacheDir) });
  
  try {
    await git.clone(remoteUrl, path.basename(cacheDir), ['--branch', branch, '--single-branch']);
  } catch (error) {
    // Branch might not exist, try cloning without branch specification
    // and then create the branch
    try {
      await git.clone(remoteUrl, path.basename(cacheDir));
      const clonedGit = simpleGit({ ...gitOptions, baseDir: cacheDir });
      
      // Check if the branch exists remotely
      const branches = await clonedGit.branch(['-r']);
      const remoteBranch = `origin/${branch}`;
      
      if (branches.all.includes(remoteBranch)) {
        await clonedGit.checkout(branch);
      } else {
        // Create and checkout new branch
        await clonedGit.checkoutLocalBranch(branch);
      }
      
      return { git: clonedGit, path: cacheDir };
    } catch (cloneError) {
      const errorMessage = cloneError instanceof Error ? cloneError.message : 'Unknown error';
      throw new Error(`Failed to clone repository: ${errorMessage}`);
    }
  }

  return { git: simpleGit({ ...gitOptions, baseDir: cacheDir }), path: cacheDir };
}

/**
 * Serializes a collection node to a clean JSON format for storage
 * Removes internal fields that shouldn't be synced
 */
function serializeCollectionForSync(node: CollectionNode): CollectionNode {
  // Deep clone and clean the node
  const cleanNode: CollectionNode = {
    id: node.id,
    name: node.name,
    type: node.type,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };

  if (node.type === 'collection') {
    if (node.settings) {
      // Copy settings but exclude gitRemote and lastSyncedAt (those are local)
      const { gitRemote, lastSyncedAt, ...syncableSettings } = node.settings;
      if (Object.keys(syncableSettings).length > 0) {
        cleanNode.settings = syncableSettings;
      }
    }
    if (node.children && node.children.length > 0) {
      cleanNode.children = node.children.map(child => serializeCollectionForSync(child));
    }
  }

  if (node.type === 'request' && node.request) {
    cleanNode.request = node.request;
  }

  return cleanNode;
}

/**
 * Pushes a collection subtree to the git repository
 */
export async function pushCollectionSubtree(
  collectionNode: CollectionNode,
  repoPath: string,
  git: SimpleGit,
  fileName: string = 'collection.json'
): Promise<GitSyncResult> {
  try {
    // Serialize the collection
    const cleanCollection = serializeCollectionForSync(collectionNode);
    const jsonContent = JSON.stringify(cleanCollection, null, 2);

    // Write to file in repo
    const filePath = path.join(repoPath, fileName);
    await fs.promises.writeFile(filePath, jsonContent, 'utf-8');

    // Check if there are any changes
    const status = await git.status();
    
    if (status.files.length === 0) {
      return {
        success: true,
        message: 'No changes to sync - collection is already up to date',
      };
    }

    // Stage the file
    await git.add(fileName);

    // Commit with a descriptive message
    const timestamp = new Date().toISOString();
    const commitMessage = `Sync collection "${collectionNode.name}" from REST Client\n\nSynced at: ${timestamp}`;
    const commitResult = await git.commit(commitMessage);

    // Push to remote
    await git.push('origin', 'HEAD');

    return {
      success: true,
      message: `Successfully synced collection "${collectionNode.name}"`,
      commitHash: commitResult.commit,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Map common Git errors to user-friendly messages
    const friendlyMessage = mapGitErrorToFriendlyMessage(errorMessage);
    
    return {
      success: false,
      message: friendlyMessage || `Failed to sync: ${errorMessage}`,
    };
  }
}

/**
 * Main sync function - orchestrates the clone/fetch and push operations
 * @param collectionNode - The collection to sync
 * @param remoteUrl - Git remote URL
 * @param branch - Git branch name
 * @param cacheDir - Local cache directory for the repo
 * @param existingFileName - If provided, use this filename (for subsequent syncs). If not provided, generates a new timestamped filename.
 */
export async function syncCollectionToRemote(
  collectionNode: CollectionNode,
  remoteUrl: string,
  branch: string,
  cacheDir: string,
  existingFileName?: string
): Promise<GitSyncResult> {
  try {
    // Get or clone the repository
    const { git, path: repoPath } = await getOrCloneRepo(remoteUrl, branch, cacheDir);

    // Determine the filename to use:
    // - If existingFileName is provided, use it (subsequent sync)
    // - Otherwise, generate a new timestamped filename (first sync)
    const isFirstSync = !existingFileName;
    const fileName = existingFileName || generateCollectionFileName(collectionNode.name, isFirstSync);
    
    console.log(`[Git Sync] Collection: "${collectionNode.name}", isFirstSync: ${isFirstSync}, fileName: "${fileName}"`);

    // Push the collection
    const result = await pushCollectionSubtree(collectionNode, repoPath, git, fileName);

    // Include the filename in the result so it can be stored
    return {
      ...result,
      fileName,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Pulls a collection from the remote repository
 * @param remoteUrl - Git remote URL
 * @param branch - Git branch name
 * @param cacheDir - Local cache directory for the repo
 * @param syncFileName - The filename to read from the repo
 * @returns The collection data from the remote
 */
export async function pullCollectionFromRemote(
  remoteUrl: string,
  branch: string,
  cacheDir: string,
  syncFileName: string
): Promise<GitPullResult> {
  try {
    // Get or clone the repository (this will also fetch latest changes)
    const { git, path: repoPath } = await getOrCloneRepo(remoteUrl, branch, cacheDir);

    // Force pull to get the latest changes
    try {
      await git.fetch('origin', branch);
      await git.reset(['--hard', `origin/${branch}`]);
    } catch (fetchError) {
      // If reset fails, try just pulling
      try {
        await git.pull('origin', branch, { '--force': null });
      } catch {
        // Continue anyway, we might have the file from clone
      }
    }

    // Read the collection file
    const filePath = path.join(repoPath, syncFileName);
    
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const collection = JSON.parse(content) as CollectionNode;
      
      // Validate basic structure
      if (!collection.id || !collection.name || !collection.type) {
        return {
          success: false,
          message: 'Invalid collection file format: missing required fields (id, name, type)',
        };
      }
      
      console.log(`[Git Pull] Successfully pulled collection "${collection.name}" from ${syncFileName}`);
      
      return {
        success: true,
        message: `Successfully pulled collection "${collection.name}" from remote`,
        collection,
      };
    } catch (readError) {
      if ((readError as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          success: false,
          message: `Collection file "${syncFileName}" not found in the remote repository. Has it been pushed yet?`,
        };
      }
      
      const errorMessage = readError instanceof Error ? readError.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to read collection file: ${errorMessage}`,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Map common Git errors to user-friendly messages
    const friendlyMessage = mapGitErrorToFriendlyMessage(errorMessage);
    
    return {
      success: false,
      message: friendlyMessage || `Failed to pull from remote: ${errorMessage}`,
    };
  }
}
