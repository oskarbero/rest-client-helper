# Variable Replacer Module

## Purpose

The `variable-replacer` module handles environment variable substitution in HTTP requests. It replaces `{{variable}}` placeholders with actual values from the active environment, and resolves collection settings with variable replacement.

## Key Concepts

- **Variable Syntax**: Uses `{{variable_name}}` pattern for variable placeholders
- **Field Replacement**: Replaces variables in URL, headers, query params, body, and auth fields
- **Collection Settings**: Merges collection settings (baseUrl, headers, auth) with request
- **Base URL Prepending**: Prepends collection baseUrl to request URL
- **Settings Inheritance**: Collection settings can be inherited from parent collections

## Public API

### `replaceVariables(text: string, variables: Record<string, string>): string`

Replaces variables in a text string using `{{variable_name}}` syntax.

**Parameters:**
- `text`: Text containing variables to replace
- `variables`: Record of variable names to values

**Returns:** Text with variables replaced

**Example:**
```typescript
import { replaceVariables } from './variable-replacer';

const text = 'Hello {{name}}, welcome to {{app}}!';
const variables = {
  name: 'John',
  app: 'REST Client'
};
const result = replaceVariables(text, variables);
// Returns: 'Hello John, welcome to REST Client!'
```

### `resolveRequestVariables(request: HttpRequest, activeEnvironment: Environment | null): HttpRequest`

Resolves all variables in an HTTP request using the active environment.

**Parameters:**
- `request`: The request to resolve variables in
- `activeEnvironment`: The active environment (null if none)

**Returns:** A new request with all variables replaced

**Example:**
```typescript
import { resolveRequestVariables } from './variable-replacer';

const request = {
  url: 'https://{{baseUrl}}/api/{{endpoint}}',
  method: 'GET',
  headers: [
    { key: 'Authorization', value: 'Bearer {{token}}', enabled: true }
  ],
  // ... other fields
};

const environment = {
  id: 'env-1',
  name: 'Production',
  variables: [
    { key: 'baseUrl', value: 'api.example.com' },
    { key: 'endpoint', value: 'users' },
    { key: 'token', value: 'secret-token' }
  ],
  // ... other fields
};

const resolved = resolveRequestVariables(request, environment);
// resolved.url = 'https://api.example.com/api/users'
// resolved.headers[0].value = 'Bearer secret-token'
```

### `resolveRequestWithCollectionSettings(request: HttpRequest, collectionSettings: CollectionSettings, activeEnvironment: Environment | null): HttpRequest`

Resolves a request with collection settings and environment variables.

**Parameters:**
- `request`: The request to resolve
- `collectionSettings`: The collection settings to apply
- `activeEnvironment`: The active environment (null if none)

**Returns:** A new request with collection settings and variables applied

**Example:**
```typescript
import { resolveRequestWithCollectionSettings } from './variable-replacer';

const request = {
  url: '/users',
  method: 'GET',
  // ... other fields
};

const collectionSettings = {
  baseUrl: 'https://{{baseUrl}}',
  headers: [
    { key: 'X-API-Version', value: '{{apiVersion}}', enabled: true }
  ],
  auth: {
    type: 'bearer',
    bearer: { token: '{{token}}' }
  }
};

const environment = {
  // ... environment with baseUrl, apiVersion, token variables
};

const resolved = resolveRequestWithCollectionSettings(
  request,
  collectionSettings,
  environment
);
// resolved.url = 'https://api.example.com/users' (baseUrl prepended)
// resolved.headers includes X-API-Version with resolved value
// resolved.auth includes bearer token with resolved value
```

## Dependencies

- `types.ts` - HttpRequest, Environment, EnvironmentVariable, CollectionSettings types
- `auth-handler.ts` - generateAuthHeaders for adding auth headers

## Data Flow

1. **Variable Replacement**:
   - Extract variables from environment
   - Replace `{{variable}}` in URL, headers (keys and values), query params (keys and values), body content, auth fields
   - Leave unmatched variables as-is

2. **Collection Settings Resolution**:
   - Replace variables in collection settings (baseUrl, headers, auth)
   - Prepend baseUrl to request URL (with proper normalization)
   - Merge collection headers with request headers (request takes precedence)
   - Merge collection auth with request auth (request takes precedence, unless disableInherit is true)
   - Add auth headers to headers array for display

## Edge Cases

- **Missing variables**: Unmatched variables are left as-is (e.g., `{{unknown}}` stays as `{{unknown}}`)
- **Empty environment**: Returns request as-is when no environment or empty variables
- **Base URL normalization**: Handles trailing slashes and leading slashes correctly
- **Header precedence**: Request headers override collection headers when keys match (case-insensitive)
- **Auth inheritance**: Collection auth is used when request has 'none' auth, unless disableInherit is true
- **URL trimming**: Trims whitespace from URLs after variable replacement

## Related Modules

- [http-client.md](./http-client.md) - Uses resolved requests
- [collection-settings-resolver.md](./collection-settings-resolver.md) - Resolves collection settings hierarchy
- [storage.md](./storage.md) - Provides environments and collections
