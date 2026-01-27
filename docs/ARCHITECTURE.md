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

The core layer contains all business logic that is framework-agnostic and can be reused across different platforms (Electron, VS Code extension, etc.). This layer has no dependencies on Electron, React, or other UI frameworks.

**Key Modules:**
- `http-client.ts` - HTTP request execution
- `auth-handler.ts` - Authentication handling
- `variable-replacer.ts` - Environment variable substitution
- `response-parser.ts` - Response formatting
- `storage.ts` - Data persistence
- `collection-settings-resolver.ts` - Settings inheritance
- `openapi3-parser.ts` / `openapi3-exporter.ts` - OpenAPI import/export
- `env-parser.ts` - .env file parsing
- `state-persistence.ts` - Application state management

**Design Principles:**
- Pure functions where possible
- No side effects (except file I/O in storage)
- Full TypeScript type coverage
- Easily testable

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

- **VS Code Extension**: Core modules can be reused in VS Code extension
- **Web Version**: Core modules can be used in web version (with different storage)
- **Plugin System**: Architecture supports future plugin system
- **Multi-window**: IPC pattern supports multiple windows
