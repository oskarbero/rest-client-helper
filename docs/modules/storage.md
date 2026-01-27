# Storage Module

## Purpose

The `storage` module handles persistence of collections and environments. It manages CRUD operations for the tree-based collection structure and environment configurations, storing data in JSON files.

## Key Concepts

- **Tree Structure**: Collections can contain nested collections and requests
- **File-based Storage**: Uses JSON files for persistence (collections.json, environments.json)
- **ID Generation**: Generates unique IDs for nodes using timestamp and random string
- **Name Uniqueness**: Enforces unique names among siblings
- **Settings Inheritance**: Collections can have settings (baseUrl, auth, headers) inherited by children

## Public API

### Collections

#### `getCollectionsTree(basePath: string): Promise<CollectionNode[]>`

Gets the entire collections tree.

**Parameters:**
- `basePath`: Base directory path for storage

**Returns:** Array of root collection nodes

#### `createCollection(basePath: string, name: string, parentId?: string): Promise<CollectionNode>`

Creates a new collection.

**Parameters:**
- `basePath`: Base directory path
- `name`: Collection name
- `parentId`: Optional parent collection ID

**Returns:** Created collection node

**Throws:** Error if parent doesn't exist or name conflicts

#### `saveRequestToCollection(basePath: string, name: string, request: HttpRequest, parentId?: string, existingId?: string): Promise<CollectionNode>`

Saves a request to a collection.

**Parameters:**
- `basePath`: Base directory path
- `name`: Request name
- `request`: HTTP request object
- `parentId`: Optional parent collection ID
- `existingId`: Optional existing request ID for updates

**Returns:** Created or updated request node

#### `deleteCollectionNode(basePath: string, id: string): Promise<boolean>`

Deletes a collection node (collection or request).

**Parameters:**
- `basePath`: Base directory path
- `id`: Node ID to delete

**Returns:** true if deleted, false if not found

#### `renameCollectionNode(basePath: string, id: string, newName: string): Promise<CollectionNode | null>`

Renames a collection node.

**Parameters:**
- `basePath`: Base directory path
- `id`: Node ID to rename
- `newName`: New name

**Returns:** Renamed node or null if not found

**Throws:** Error if name conflicts

#### `moveCollectionNode(basePath: string, id: string, newParentId?: string): Promise<CollectionNode | null>`

Moves a collection node to a different parent.

**Parameters:**
- `basePath`: Base directory path
- `id`: Node ID to move
- `newParentId`: New parent ID (undefined for root)

**Returns:** Moved node or null if not found

**Throws:** Error if moving to descendant or name conflicts

#### `updateCollectionSettings(basePath: string, collectionId: string, settings: CollectionSettings): Promise<CollectionNode | null>`

Updates collection settings.

**Parameters:**
- `basePath`: Base directory path
- `collectionId`: Collection ID
- `settings`: Settings to apply

**Returns:** Updated collection node or null if not found

#### `getCollectionSettings(basePath: string, collectionId: string): Promise<CollectionSettings | null>`

Gets collection settings.

**Parameters:**
- `basePath`: Base directory path
- `collectionId`: Collection ID

**Returns:** Collection settings or null if not found

### Environments

#### `getEnvironments(basePath: string): Promise<Environment[]>`

Gets all environments.

**Parameters:**
- `basePath`: Base directory path

**Returns:** Array of environments

#### `createEnvironment(basePath: string, name: string): Promise<Environment>`

Creates a new environment.

**Parameters:**
- `basePath`: Base directory path
- `name`: Environment name

**Returns:** Created environment

**Throws:** Error if name conflicts

#### `updateEnvironment(basePath: string, id: string, name: string, variables: EnvironmentVariable[]): Promise<Environment>`

Updates an environment.

**Parameters:**
- `basePath`: Base directory path
- `id`: Environment ID
- `name`: New name
- `variables`: Environment variables

**Returns:** Updated environment

**Throws:** Error if not found or name conflicts

#### `deleteEnvironment(basePath: string, id: string): Promise<boolean>`

Deletes an environment.

**Parameters:**
- `basePath`: Base directory path
- `id`: Environment ID

**Returns:** true if deleted, false if not found

#### `duplicateEnvironment(basePath: string, sourceId: string, newName: string): Promise<Environment>`

Duplicates an environment with a new name.

**Parameters:**
- `basePath`: Base directory path
- `sourceId`: Source environment ID
- `newName`: New environment name

**Returns:** Duplicated environment

**Throws:** Error if source not found or name conflicts

#### `setActiveEnvironment(basePath: string, id: string | null): Promise<void>`

Sets the active environment.

**Parameters:**
- `basePath`: Base directory path
- `id`: Environment ID or null to clear

**Throws:** Error if environment not found

#### `getActiveEnvironment(basePath: string): Promise<Environment | null>`

Gets the currently active environment.

**Parameters:**
- `basePath`: Base directory path

**Returns:** Active environment or null

## Dependencies

- `types.ts` - CollectionNode, HttpRequest, Environment, EnvironmentVariable, CollectionSettings types
- `constants.ts` - CONFIG.FILES for file names
- `utils.ts` - findNodeById utility

## Data Flow

1. **Load**: Read JSON file from disk
2. **Parse**: Parse JSON into TypeScript objects
3. **Validate**: Validate structure, return defaults if invalid
4. **Modify**: Perform CRUD operation on in-memory structure
5. **Save**: Write updated structure back to JSON file

## Edge Cases

- **Missing files**: Returns empty arrays/objects if files don't exist
- **Corrupted files**: Returns defaults if JSON parsing fails
- **Name conflicts**: Throws error when creating/renaming with duplicate name
- **Circular moves**: Prevents moving collection into itself or descendants
- **Missing parent**: Throws error when parent doesn't exist
- **Active environment deletion**: Clears active environment when deleted
- **File I/O errors**: Logs errors, may throw if write fails

## Related Modules

- [collection-settings-resolver.md](./collection-settings-resolver.md) - Resolves collection settings hierarchy
- [variable-replacer.md](./variable-replacer.md) - Uses environments for variable replacement
