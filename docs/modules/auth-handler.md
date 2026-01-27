# Auth Handler Module

## Purpose

The `auth-handler` module generates authentication headers and query parameters based on authentication configuration. It supports Basic, Bearer, and API Key authentication methods.

## Key Concepts

- **Header Generation**: Creates Authorization headers for Basic and Bearer auth
- **Query Parameter Generation**: Creates query params for API Key auth when configured
- **Base64 Encoding**: Uses browser-compatible `btoa` for Basic auth encoding
- **Validation**: Provides validation function to check if auth config is complete

## Public API

### `generateAuthHeaders(auth: AuthConfig): Record<string, string>`

Generates authentication headers based on the auth configuration.

**Parameters:**
- `auth`: Authentication configuration object

**Returns:** Object with header key-value pairs

**Example:**
```typescript
import { generateAuthHeaders } from './auth-handler';

// Basic auth
const basicAuth = {
  type: 'basic',
  basic: {
    username: 'user',
    password: 'pass'
  }
};
const headers = generateAuthHeaders(basicAuth);
// Returns: { Authorization: 'Basic dXNlcjpwYXNz' }

// Bearer token
const bearerAuth = {
  type: 'bearer',
  bearer: { token: 'my-token' }
};
const headers = generateAuthHeaders(bearerAuth);
// Returns: { Authorization: 'Bearer my-token' }

// API Key in header
const apiKeyAuth = {
  type: 'api-key',
  apiKey: {
    key: 'X-API-Key',
    value: 'secret',
    addTo: 'header'
  }
};
const headers = generateAuthHeaders(apiKeyAuth);
// Returns: { 'X-API-Key': 'secret' }
```

### `generateAuthQueryParam(auth: AuthConfig): KeyValuePair | null`

Generates query parameter for API Key auth when configured to add to query.

**Parameters:**
- `auth`: Authentication configuration object

**Returns:** KeyValuePair object or null if not applicable

**Example:**
```typescript
import { generateAuthQueryParam } from './auth-handler';

const apiKeyAuth = {
  type: 'api-key',
  apiKey: {
    key: 'api_key',
    value: 'secret',
    addTo: 'query'
  }
};
const param = generateAuthQueryParam(apiKeyAuth);
// Returns: { key: 'api_key', value: 'secret', enabled: true }
```

### `isAuthConfigValid(auth: AuthConfig): boolean`

Validates if the auth configuration is complete for its type.

**Parameters:**
- `auth`: Authentication configuration object

**Returns:** true if valid, false otherwise

**Example:**
```typescript
import { isAuthConfigValid } from './auth-handler';

const auth = {
  type: 'bearer',
  bearer: { token: 'my-token' }
};
const isValid = isAuthConfigValid(auth); // true

const invalidAuth = {
  type: 'bearer',
  bearer: { token: '' }
};
const isValid = isAuthConfigValid(invalidAuth); // false
```

### `createEmptyAuth(): AuthConfig`

Creates a default/empty auth configuration.

**Returns:** AuthConfig with type 'none'

## Dependencies

- `types.ts` - AuthConfig, KeyValuePair types

## Data Flow

1. **Input**: AuthConfig object with type and corresponding config
2. **Type Check**: Switch on auth.type
3. **Generation**: 
   - Basic: Encode username:password as base64, create Authorization header
   - Bearer: Create Authorization header with token
   - API Key: Create header or query param based on addTo setting
4. **Output**: Headers object or query param object

## Edge Cases

- **Empty credentials**: Basic auth returns empty object if both username and password are empty
- **Empty token**: Bearer auth returns empty object if token is empty
- **Missing API key name**: API Key auth returns empty object if key is empty
- **None auth type**: Returns empty object
- **API Key in query**: generateAuthHeaders returns empty, use generateAuthQueryParam instead

## Related Modules

- [http-client.md](./http-client.md) - Uses auth headers/params in requests
- [variable-replacer.md](./variable-replacer.md) - Variables in auth config are replaced before use
