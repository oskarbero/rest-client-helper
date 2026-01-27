# OpenAPI 3 Exporter Module

## Purpose

The `openapi3-exporter` module exports CollectionNode structures to OpenAPI 3.0 specification format. This allows users to export their collections as OpenAPI specs for sharing or documentation.

## Key Concepts

- **Collection to Spec**: Converts collection tree to OpenAPI 3.0 structure
- **Path Grouping**: Groups requests by URL path
- **Method Mapping**: Maps HTTP methods to OpenAPI operation objects
- **Security Schemes**: Generates security schemes from auth configurations
- **Tag Generation**: Creates tags from collection names
- **Recursive Processing**: Processes nested collections recursively

## Public API

### `exportToOpenAPI3(collections: CollectionNode[], title?: string, version?: string): OpenAPI3Spec`

Exports CollectionNode structures to OpenAPI 3.0 specification.

**Parameters:**
- `collections`: Array of root CollectionNode objects
- `title`: Optional API title (default: 'REST Client Collection')
- `version`: Optional API version (default: '1.0.0')

**Returns:** OpenAPI 3.0 specification object

**Example:**
```typescript
import { exportToOpenAPI3 } from './openapi3-exporter';

const collections = [
  {
    id: 'collection-1',
    name: 'My API',
    type: 'collection',
    settings: {
      baseUrl: 'https://api.example.com'
    },
    children: [
      {
        id: 'request-1',
        name: 'Get Users',
        type: 'request',
        request: {
          url: '/users',
          method: 'GET',
          // ... other request fields
        }
      }
    ]
  }
];

const spec = exportToOpenAPI3(collections, 'My API', '1.0.0');
// Returns OpenAPI 3.0 specification object
```

## Dependencies

- `types.ts` - CollectionNode, HttpRequest, AuthConfig types

## Data Flow

1. **Initialize Spec**: Create base OpenAPI 3.0 structure
2. **Process Collections**: Recursively process all collections
3. **Process Requests**: For each request:
   - Extract URL path and method
   - Convert to OpenAPI operation
   - Extract parameters (query, header)
   - Convert request body
   - Convert auth to security scheme
   - Add tags from collection names
4. **Group by Path**: Group operations by URL path
5. **Generate Security Schemes**: Create security schemes from auth configs
6. **Extract Base URL**: Get baseUrl from first collection's settings
7. **Return Spec**: Return complete OpenAPI specification

## Edge Cases

- **Empty collections**: Returns spec with empty paths
- **Missing baseUrl**: servers array is undefined if no baseUrl
- **Multiple auth types**: Generates separate security schemes for each type
- **Duplicate security schemes**: Reuses same scheme name for identical auth configs
- **Nested collections**: Collection names become tags
- **Path conflicts**: Multiple requests with same path are grouped together
- **Missing request data**: Handles missing fields gracefully

## Related Modules

- [storage.md](./storage.md) - Provides collections to export
- [openapi3-parser.md](./openapi3-parser.md) - Reverse operation (import from OpenAPI)
