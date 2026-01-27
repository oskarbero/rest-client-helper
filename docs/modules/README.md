# Core Modules Documentation

This directory contains detailed documentation for each core module in the REST Client application. The core modules are framework-agnostic business logic that can be reused across different platforms (Electron, VS Code extension, etc.).

## Module Index

- [http-client.md](./http-client.md) - HTTP request execution
- [auth-handler.md](./auth-handler.md) - Authentication header/query generation
- [variable-replacer.md](./variable-replacer.md) - Environment variable substitution
- [response-parser.md](./response-parser.md) - Response formatting and parsing
- [storage.md](./storage.md) - Collections and environments persistence
- [collection-settings-resolver.md](./collection-settings-resolver.md) - Settings inheritance system
- [openapi3-parser.md](./openapi3-parser.md) - OpenAPI 3.0 import
- [openapi3-exporter.md](./openapi3-exporter.md) - OpenAPI 3.0 export
- [env-parser.md](./env-parser.md) - .env file parsing
- [state-persistence.md](./state-persistence.md) - Application state management
- [utils.md](./utils.md) - Utility functions
- [types.md](./types.md) - TypeScript type definitions

## Module Dependencies

```
types.ts (base types)
    ├── http-client.ts
    ├── auth-handler.ts
    ├── variable-replacer.ts
    ├── response-parser.ts
    ├── storage.ts
    ├── collection-settings-resolver.ts
    ├── openapi3-parser.ts
    ├── openapi3-exporter.ts
    ├── env-parser.ts
    └── state-persistence.ts

utils.ts (utilities)
    ├── storage.ts
    └── collection-settings-resolver.ts

constants.ts (configuration)
    ├── http-client.ts
    └── storage.ts
```

## Design Principles

1. **Framework-agnostic**: Core modules have no dependencies on Electron, React, or other UI frameworks
2. **Pure functions**: Most functions are pure and easily testable
3. **Type safety**: Full TypeScript type coverage
4. **Error handling**: Graceful error handling with meaningful error messages
5. **Immutability**: Functions return new objects rather than mutating inputs
