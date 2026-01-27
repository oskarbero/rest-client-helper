# Types Module

## Purpose

The `types` module defines all TypeScript interfaces and types used throughout the application. It serves as the central type definition file.

## Key Concepts

- **Type Safety**: Comprehensive type definitions for all data structures
- **Request/Response Types**: HTTP request and response structures
- **Collection Types**: Tree-based collection structure
- **Environment Types**: Environment variable management
- **Auth Types**: Authentication configuration types

## Public API

### Core Types

#### `HttpMethod`
Type for HTTP methods: `'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'`

#### `BodyType`
Type for body content types: `'none' | 'json' | 'text' | 'form-data'`

#### `AuthType`
Type for authorization types: `'none' | 'basic' | 'bearer' | 'api-key'`

#### `HttpRequest`
Complete HTTP request configuration:
```typescript
interface HttpRequest {
  url: string;
  method: HttpMethod;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
}
```

#### `HttpResponse`
HTTP response from the server:
```typescript
interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  duration: number;
  size: number;
}
```

#### `CollectionNode`
Tree node for collections and requests:
```typescript
interface CollectionNode {
  id: string;
  name: string;
  type: 'collection' | 'request';
  createdAt: string;
  updatedAt: string;
  children?: CollectionNode[]; // For collections
  settings?: CollectionSettings; // For collections
  request?: HttpRequest; // For requests
}
```

#### `Environment`
Environment configuration:
```typescript
interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  createdAt: string;
  updatedAt: string;
  envFilePath?: string;
  envFileLastModified?: string;
}
```

#### `CollectionSettings`
Settings that can be inherited by child requests and collections:
```typescript
interface CollectionSettings {
  baseUrl?: string;
  auth?: AuthConfig;
  headers?: KeyValuePair[];
}
```

### Utility Functions

#### `createEmptyRequest(): HttpRequest`

Creates a default/empty request for initialization.

**Returns:** HttpRequest with empty/default values

**Example:**
```typescript
import { createEmptyRequest } from './types';

const request = createEmptyRequest();
// Returns: {
//   url: '',
//   method: 'GET',
//   headers: [],
//   queryParams: [],
//   body: { type: 'none', content: '' },
//   auth: { type: 'none' }
// }
```

## Dependencies

None (base types module)

## Data Flow

Types are used throughout the application for:
- Function parameters and return types
- Data structure definitions
- Type checking and validation
- IDE autocomplete and IntelliSense

## Edge Cases

- **Optional fields**: Many fields are optional to support partial updates
- **Union types**: Types like `'collection' | 'request'` ensure type safety
- **Date strings**: All dates are stored as ISO string format
- **Empty defaults**: createEmptyRequest provides safe defaults

## Related Modules

All modules depend on types.ts for their type definitions.
