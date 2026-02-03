# Architecture Overview

## Project Structure

The REST Client is built with Electron, React, and TypeScript, following a clear separation of concerns:

```
src/
├── core/           # Framework-agnostic business logic (reusable)
├── main/           # Electron main process (IPC handlers, window management)
└── renderer/       # React UI components
```

## Architecture Layers

### Core Layer (`src/core/`)

The core layer contains all business logic that is framework-agnostic and can be reused across different platforms (Electron, VS Code extension, etc.). This layer has **no dependencies on Electron, React, or other UI frameworks**.

**Directory Structure:**
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
│   └── response-parser.ts
├── variables/            # Variable replacement
│   ├── variable-replacer.ts
│   └── env-parser.ts
├── collection/           # Collection management
│   ├── storage.ts
│   ├── collection-settings-resolver.ts
│   └── path-grouping.ts
├── import-export/        # Import/export formats
│   ├── postman-parser.ts
│   ├── openapi3-parser.ts
│   └── openapi3-exporter.ts
├── persistence/          # App state persistence
│   └── state-persistence.ts
└── git/                  # Git sync functionality
    └── collection-git-sync.ts
```

**Design Principles:**
- Pure functions where possible
- No Electron imports — fetch is injected via `setFetch()`
- No side effects (except file I/O in storage)
- Full TypeScript type coverage
- Single barrel export (`import from '@core'`)
- Easily testable

**Fetch Injection:**

The HTTP client uses an injectable fetch implementation to decouple core from Electron:

```typescript
// In Electron main process (src/main/index.ts)
import { net } from 'electron';
import { setFetch } from '../core';

app.whenReady().then(() => {
  setFetch(net.fetch.bind(net) as typeof globalThis.fetch);
});
```

This allows the same core module to work in VS Code extensions or other environments by providing a different fetch implementation.

### Main Process (`src/main/`)

The Electron main process handles:
- Window creation and management
- IPC (Inter-Process Communication) handlers
- File system operations
- Bridge between renderer and core modules

**Key Files:**
- `index.ts` - Window creation and app lifecycle
- `ipc-handlers.ts` - IPC request handlers
- `preload.ts` - Context bridge for secure IPC

**IPC Pattern:**
```
Renderer Process          Main Process           Core Module
     |                        |                        |
     |-- IPC invoke --------->|                        |
     |                        |-- function call ------>|
     |                        |<-- return value -------|
     |<-- IPC response -------|                        |
```

### Renderer Process (`src/renderer/`)

The React-based UI layer that:
- Renders the user interface
- Handles user interactions
- Communicates with main process via IPC
- Manages local component state

**Key Components:**
- `App.tsx` - Main application component
- `components/RequestPanel/` - Request configuration UI
- `components/ResponsePanel/` - Response display UI
- `components/Sidebar/` - Collections and environments UI

## Data Flow

### Request Execution Flow

```
User Input (Renderer)
    ↓
IPC: request:send
    ↓
Main Process: ipc-handlers.ts
    ↓
Core: resolveRequestWithCollectionSettings
    ↓ (resolves variables, applies collection settings)
Core: sendRequest
    ↓ (executes HTTP request)
Core: formatResponseBody
    ↓ (formats response)
IPC Response
    ↓
Renderer: Display Response
```

### Collection Management Flow

```
User Action (Renderer)
    ↓
IPC: collection:*
    ↓
Main Process: ipc-handlers.ts
    ↓
Core: storage.ts
    ↓ (file I/O)
JSON File (collections.json)
    ↓
IPC Response
    ↓
Renderer: Update UI
```

### Environment Variable Flow

```
User Action (Renderer)
    ↓
IPC: environment:*
    ↓
Main Process: ipc-handlers.ts
    ↓
Core: storage.ts
    ↓ (file I/O)
JSON File (environments.json)
    ↓
IPC Response
    ↓
Renderer: Update UI
    ↓
When sending request:
Core: resolveRequestVariables
    ↓ (replaces {{variables}})
Core: sendRequest
```

## IPC Communication

### IPC Channels

**Request Channels:**
- `request:send` - Send HTTP request

**State Channels:**
- `state:save` - Save application state
- `state:load` - Load application state

**Collection Channels:**
- `collection:getTree` - Get collections tree
- `collection:create` - Create collection
- `collection:saveRequest` - Save request to collection
- `collection:delete` - Delete collection node
- `collection:rename` - Rename collection node
- `collection:move` - Move collection node
- `collection:getSettings` - Get collection settings
- `collection:updateSettings` - Update collection settings

**Environment Channels:**
- `environment:getAll` - Get all environments
- `environment:create` - Create environment
- `environment:update` - Update environment
- `environment:delete` - Delete environment
- `environment:duplicate` - Duplicate environment
- `environment:setActive` - Set active environment
- `environment:getActive` - Get active environment

**OpenAPI Channels:**
- `openapi:import` - Import OpenAPI specification

### IPC Security

- Uses `contextBridge` to expose safe API to renderer
- All file system operations happen in main process
- No direct Node.js access from renderer process

## State Management

### Application State

Stored in `app-state.json`:
- Current request configuration
- Active request ID
- Expanded collection nodes

### Collections State

Stored in `collections.json`:
- Tree structure of collections and requests
- Collection settings (baseUrl, auth, headers)

### Environments State

Stored in `environments.json`:
- List of environments
- Environment variables
- Active environment ID

## File Storage

All user data is stored in Electron's `userData` directory:
- `collections.json` - Collections and requests
- `environments.json` - Environments and variables
- `app-state.json` - Application state

## Collection Settings Inheritance

Collection settings are inherited through the parent chain:

```
Root Collection (baseUrl: https://api.example.com)
    ↓
Sub Collection (headers: [X-Custom: value])
    ↓
Request (inherits: baseUrl + headers)
```

Settings resolution:
1. Start from root collection
2. Walk down to request's parent
3. Merge settings (child overrides parent)
4. Apply to request

## Error Handling

- **Network Errors**: Returned as HttpResponse with status 0
- **File I/O Errors**: Logged, return defaults or throw
- **Validation Errors**: Thrown with descriptive messages
- **IPC Errors**: Propagated to renderer, displayed to user

## Testing Strategy

- **Unit Tests**: Core modules are fully unit tested
- **Integration Tests**: IPC handlers can be tested with mocked core functions
- **E2E Tests**: Can be added for full user flows

See [TESTING.md](./TESTING.md) for detailed testing information.

## Future Considerations

- **VS Code Extension**: Core modules are ready for reuse — inject `globalThis.fetch` and provide storage paths
- **Web Version**: Core modules can be used in web version (with different storage backend)
- **Plugin System**: Architecture supports future plugin system
- **Multi-window**: IPC pattern supports multiple windows

## Core Module Reusability

The core module is designed to be fully reusable outside of Electron. To use it in another environment:

1. **Provide a fetch implementation** via `setFetch()` at startup
2. **Provide base paths** for file storage operations (collections, environments, state)
3. **Import from the barrel** only: `import { ... } from '@core'`

See [`src/core/README.md`](../src/core/README.md) for detailed integration guidelines.
