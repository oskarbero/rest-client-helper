# Fetch Provider Module

## Purpose

The `fetch-provider` module provides an injectable fetch abstraction that decouples the core HTTP client from any specific runtime environment. This allows the same core module to work in:

- **Electron** (using `net.fetch` for proxy support)
- **VS Code extensions** (using `globalThis.fetch`)
- **Node.js CLI tools** (using `node-fetch` or native fetch)
- **Tests** (using mocked fetch)

## Location

`src/core/http/fetch-provider.ts`

## Public API

### `setFetch(fetchFn: FetchFunction): void`

Registers a custom fetch implementation. Call this at application startup before making any HTTP requests.

**Parameters:**
- `fetchFn`: A fetch-compatible function

**Example:**
```typescript
import { net } from 'electron';
import { setFetch } from '@core';

// In Electron main process
app.whenReady().then(() => {
  setFetch(net.fetch.bind(net) as typeof globalThis.fetch);
});
```

### `getFetch(): FetchFunction`

Returns the current fetch implementation. Returns the custom fetch if set, otherwise falls back to `globalThis.fetch`.

**Returns:** The fetch function to use for HTTP requests

**Throws:** Error if no fetch implementation is available

### `clearFetch(): void`

Clears the custom fetch implementation, reverting to `globalThis.fetch`. Primarily useful for testing.

**Example:**
```typescript
import { setFetch, clearFetch } from '@core';

beforeEach(() => {
  setFetch(mockFetch);
});

afterEach(() => {
  clearFetch();
});
```

### `hasCustomFetch(): boolean`

Checks if a custom fetch has been registered. Useful for debugging and logging.

**Returns:** `true` if a custom fetch is registered, `false` otherwise

## Type Definitions

```typescript
export type FetchFunction = typeof globalThis.fetch;
```

## Usage Patterns

### Electron Main Process

```typescript
import { app, net } from 'electron';
import { setFetch } from '../core';

app.whenReady().then(() => {
  // Electron's net.fetch respects system proxy settings
  setFetch(net.fetch.bind(net) as typeof globalThis.fetch);
});
```

### VS Code Extension

```typescript
import { setFetch } from './core';

export function activate(context: vscode.ExtensionContext) {
  // Use global fetch (or a custom implementation)
  setFetch(globalThis.fetch);
}
```

### Tests with Mock Fetch

```typescript
import { setFetch, clearFetch, sendRequest } from '@core';

describe('HTTP Client', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    setFetch(mockFetch as unknown as typeof fetch);
  });

  afterEach(() => {
    clearFetch();
    mockFetch.mockReset();
  });

  it('should send GET request', async () => {
    mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));
    
    const response = await sendRequest({ /* request config */ });
    
    expect(mockFetch).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
});
```

## Why Injectable Fetch?

1. **Electron Proxy Support**: Electron's `net.fetch` respects system proxy settings (`HTTP_PROXY`, `HTTPS_PROXY`), while `globalThis.fetch` in Node.js does not.

2. **Decoupling**: Core module has no `require('electron')` calls, making it truly reusable.

3. **Testability**: Easy to mock fetch in unit tests without complex module mocking.

4. **Flexibility**: Different environments can provide different fetch implementations with custom behavior (caching, logging, retry logic).

## Related Modules

- [http-client.md](./http-client.md) - Uses `getFetch()` to make HTTP requests
