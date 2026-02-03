# Core Modules Documentation

This directory contains detailed documentation for each core module in the REST Client application. The core modules are framework-agnostic business logic that can be reused across different platforms (Electron, VS Code extension, etc.).

## Module Index

### HTTP (`src/core/http/`)
- [fetch-provider.md](./fetch-provider.md) - Injectable fetch abstraction
- [http-client.md](./http-client.md) - HTTP request execution
- [auth-handler.md](./auth-handler.md) - Authentication header/query generation
- [response-parser.md](./response-parser.md) - Response formatting and parsing

### Variables (`src/core/variables/`)
- [variable-replacer.md](./variable-replacer.md) - Environment variable substitution
- [env-parser.md](./env-parser.md) - .env file parsing

### Collection (`src/core/collection/`)
- [storage.md](./storage.md) - Collections and environments persistence
- [collection-settings-resolver.md](./collection-settings-resolver.md) - Settings inheritance system

### Import/Export (`src/core/import-export/`)
- [openapi3-parser.md](./openapi3-parser.md) - OpenAPI 3.0 import
- [openapi3-exporter.md](./openapi3-exporter.md) - OpenAPI 3.0 export

### Persistence (`src/core/persistence/`)
- [state-persistence.md](./state-persistence.md) - Application state management

### Root Modules (`src/core/`)
- [utils.md](./utils.md) - Utility functions
- [types.md](./types.md) - TypeScript type definitions

## Directory Structure

```
src/core/
├── index.ts              # Public API barrel (single entry point)
├── types.ts              # All shared TypeScript types
├── constants.ts          # Application constants
├── utils.ts              # Pure utility functions
├── http/                 # HTTP request/response handling
├── variables/            # Variable replacement
├── collection/           # Collection management
├── import-export/        # Import/export formats
├── persistence/          # App state persistence
└── git/                  # Git sync functionality
```

## Module Dependencies

```
types.ts (base types)
    └── all modules

fetch-provider.ts (fetch injection)
    └── http-client.ts

http-client.ts
    ├── auth-handler.ts
    ├── constants.ts
    └── utils.ts

utils.ts (utilities)
    ├── storage.ts
    └── collection-settings-resolver.ts

constants.ts (configuration)
    ├── http-client.ts
    └── storage.ts
```

## Importing from Core

All consumers should import from the barrel only:

```typescript
// Good - import from barrel
import { sendRequest, HttpRequest, setFetch } from '@core';

// Bad - don't import from internal paths
import { sendRequest } from '@core/http/http-client';
```

## Design Principles

1. **Framework-agnostic**: Core modules have no dependencies on Electron, React, or other UI frameworks
2. **Injectable fetch**: HTTP client uses `setFetch()` for fetch injection — no direct Electron imports
3. **Pure functions**: Most functions are pure and easily testable
4. **Type safety**: Full TypeScript type coverage
5. **Error handling**: Graceful error handling with meaningful error messages
6. **Immutability**: Functions return new objects rather than mutating inputs
7. **Single barrel**: All exports go through `src/core/index.ts`
