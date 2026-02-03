# Core Module

The `core` module contains all business logic for the REST client that is independent of any UI framework or platform. It is designed to be reusable across different hosts:

- **Electron desktop app** (current)
- **VS Code extension** (future)
- **CLI tool** (future)

## Package Boundary Rules

### What core MUST NOT do:
1. **Import from `main` or `renderer`** - Core has no knowledge of Electron main process, renderer, or React components
2. **Use Electron APIs directly** - No `require('electron')`, no `net`, `dialog`, `app`, etc.
3. **Access UI state** - No React hooks, no DOM APIs, no window object
4. **Make assumptions about the runtime** - Must work in Node.js, Electron, and browser contexts

### What core CAN do:
1. **Use Node.js built-ins** - `fs`, `path`, `crypto`, etc. (hosts provide polyfills if needed)
2. **Use `process.env`** - For proxy configuration and environment detection
3. **Use `globalThis.fetch`** - Or an injected fetch via `setFetch()`
4. **Define types and interfaces** - All shared types live here
5. **Implement pure business logic** - Parsing, validation, transformation

## Directory Structure

```
src/core/
├── index.ts              # Public API barrel (single entry point)
├── types.ts              # All shared TypeScript types
├── constants.ts          # Application constants
├── utils.ts              # Pure utility functions
├── http/                 # HTTP request/response handling
│   ├── fetch-provider.ts # Injectable fetch abstraction
│   ├── http-client.ts    # Request execution
│   ├── auth-handler.ts   # Auth header generation
│   └── response-parser.ts # Response formatting/tokenization
├── variables/            # Variable replacement
│   ├── variable-replacer.ts
│   └── env-parser.ts     # .env file parsing
├── collection/           # Collection management
│   ├── storage.ts        # Collection/environment persistence
│   ├── collection-settings-resolver.ts
│   └── path-grouping.ts  # URL path grouping
├── import-export/        # Import/export formats
│   ├── postman-parser.ts
│   ├── openapi3-parser.ts
│   └── openapi3-exporter.ts
├── persistence/          # App state persistence
│   └── state-persistence.ts
└── git/                  # Git sync functionality
    └── collection-git-sync.ts
```

## Usage by Hosts

### Electron Main Process

```typescript
import { app, net } from 'electron';
import { setFetch, sendRequest } from '../core';

app.whenReady().then(() => {
  // Register Electron's proxy-aware fetch
  setFetch(net.fetch.bind(net) as typeof globalThis.fetch);
  
  // Now sendRequest() will use Electron's net.fetch
});
```

### VS Code Extension (example)

```typescript
import { setFetch, sendRequest } from './core';

export function activate(context: vscode.ExtensionContext) {
  // Use global fetch (or a custom implementation)
  setFetch(globalThis.fetch);
  
  // Core functions are now ready to use
}
```

## Fetch Provider

The HTTP client uses an injectable fetch implementation via `setFetch()`:

- **`setFetch(fn)`** - Register a custom fetch function (call at app startup)
- **`getFetch()`** - Get the current fetch (custom or globalThis.fetch)
- **`clearFetch()`** - Reset to default (for testing)
- **`hasCustomFetch()`** - Check if custom fetch is registered

If no custom fetch is set, core falls back to `globalThis.fetch`.

## File I/O Pattern

All file operations accept a `basePath` parameter:

```typescript
// Storage functions take basePath as first argument
await loadCollectionsConfig(userDataPath);
await saveState(userDataPath, request);
```

The host provides the appropriate path:
- Electron: `app.getPath('userData')`
- VS Code: `context.globalStorageUri.fsPath`
- Tests: temp directory

## Importing from Core

All consumers should import from the barrel only:

```typescript
// Good - import from barrel
import { sendRequest, HttpRequest, setFetch } from '@core';

// Bad - don't import from internal paths
import { sendRequest } from '@core/http/http-client';
```

This ensures internal refactoring doesn't break consumers.
