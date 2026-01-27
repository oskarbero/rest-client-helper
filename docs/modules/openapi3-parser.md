# OpenAPI 3 Parser Module

## Purpose

The `openapi3-parser` module parses OpenAPI 3.0 specifications and converts them into CollectionNode structures that can be imported into the REST Client.

## Key Concepts

- **Specification Parsing**: Reads OpenAPI 3.0 JSON/YAML specifications
- **Request Generation**: Converts OpenAPI operations to HttpRequest objects
- **Organization**: Organizes requests by tags or path prefixes
- **Parameter Extraction**: Extracts query, header, and path parameters
- **Security Conversion**: Converts OpenAPI security schemes to AuthConfig
- **Base URL Extraction**: Extracts base URL from servers array

## Public API

### `parseOpenAPI3(spec: OpenAPI3Spec): CollectionNode[]`

Parses an OpenAPI 3.0 specification and converts it to CollectionNode structures.

**Parameters:**
- `spec`: OpenAPI 3.0 specification object

**Returns:** Array of root CollectionNode objects

**Example:**
```typescript
import { parseOpenAPI3 } from './openapi3-parser';

const spec = {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0'
  },
  servers: [{ url: 'https://api.example.com' }],
  paths: {
    '/users': {
      get: {
        operationId: 'getUsers',
        summary: 'Get all users',
        tags: ['Users']
      }
    }
  }
};

const collections = parseOpenAPI3(spec);
// Returns: Array with root collection containing the parsed requests
```

## Dependencies

- `types.ts` - CollectionNode, HttpRequest, AuthConfig, KeyValuePair types

## Data Flow

1. **Extract Base URL**: Get first server URL from servers array
2. **Create Root Collection**: Create root collection with API title and baseUrl
3. **Process Paths**: Iterate through all paths in the specification
4. **Process Operations**: For each HTTP method in a path:
   - Extract operation details (operationId, summary, parameters, requestBody, security)
   - Convert to HttpRequest object
   - Extract parameters (query, header, path)
   - Convert requestBody to RequestBody
   - Convert security to AuthConfig
5. **Organize by Tags**: Group requests by tags, create tag collections
6. **Fallback Organization**: If no tags, organize by path prefix
7. **Return Collections**: Return array of root collections

## Edge Cases

- **Missing info.title**: Uses 'Imported API' as default name
- **No servers**: baseUrl is undefined if no servers specified
- **No tags**: Falls back to path-based organization
- **Multiple tags**: Uses first tag for organization
- **Path parameters**: Path parameters are extracted but not yet substituted in URL
- **Missing operationId**: Uses summary, then method + path as request name
- **OAuth2 security**: Treated as bearer token (simplified)
- **Multiple security schemes**: Uses first security scheme

## Related Modules

- [storage.md](./storage.md) - Saves parsed collections
- [openapi3-exporter.md](./openapi3-exporter.md) - Reverse operation (export to OpenAPI)
