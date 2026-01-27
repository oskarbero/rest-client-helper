# State Persistence Module

## Purpose

The `state-persistence` module handles saving and loading application state. It persists the current request, active request ID, and expanded collection nodes to disk for session restoration.

## Key Concepts

- **Session State**: Saves current request and UI state
- **Auto-save**: State is saved automatically during use
- **Default State**: Returns default state if file doesn't exist or is corrupted
- **JSON Storage**: Uses JSON file for persistence (app-state.json)

## Public API

### `saveState(userDataPath: string, request: HttpRequest, currentRequestId?: string | null, expandedNodes?: Set<string>): Promise<void>`

Saves the current application state to disk.

**Parameters:**
- `userDataPath`: Base directory path for storage
- `request`: Current HTTP request
- `currentRequestId`: Optional ID of currently selected request
- `expandedNodes`: Optional set of expanded collection node IDs

**Example:**
```typescript
import { saveState } from './state-persistence';

await saveState(
  '/path/to/user/data',
  currentRequest,
  'request-123',
  new Set(['collection-1', 'collection-2'])
);
```

### `loadState(userDataPath: string): Promise<LoadedAppState>`

Loads the application state from disk.

**Parameters:**
- `userDataPath`: Base directory path for storage

**Returns:** LoadedAppState object with request, currentRequestId, and expandedNodes

**Example:**
```typescript
import { loadState } from './state-persistence';

const state = await loadState('/path/to/user/data');
console.log(state.request.url); // Last saved request URL
console.log(state.currentRequestId); // Last selected request ID
console.log(state.expandedNodes); // Array of expanded node IDs
```

## Dependencies

- `types.ts` - HttpRequest, createEmptyRequest

## Data Flow

1. **Save State**:
   - Create AppState object with request, currentRequestId, expandedNodes, lastSaved timestamp
   - Write to app-state.json file
   - Handle write errors

2. **Load State**:
   - Read app-state.json file
   - Parse JSON
   - Merge with defaults for missing fields
   - Return LoadedAppState object

## Edge Cases

- **Missing file**: Returns default state (empty request, null currentRequestId, empty expandedNodes)
- **Corrupted file**: Returns default state if JSON parsing fails
- **Partial state**: Merges saved state with defaults for missing fields
- **File I/O errors**: Logs errors, may throw if write fails
- **Null currentRequestId**: Handles null explicitly (different from undefined)

## Related Modules

- [storage.md](./storage.md) - Similar file-based persistence pattern
- [http-client.md](./http-client.md) - Uses saved request for restoration
