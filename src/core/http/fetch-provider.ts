/**
 * Fetch Provider - Injectable fetch abstraction for core module
 * 
 * This module allows the host application (Electron, VS Code extension, etc.)
 * to inject a custom fetch implementation. This decouples core from Electron
 * and makes it reusable across different environments.
 * 
 * Usage:
 *   - In Electron main process: call setFetch(net.fetch.bind(net)) at app startup
 *   - In VS Code extension: call setFetch(globalThis.fetch) or provide a custom implementation
 *   - If no fetch is set, defaults to globalThis.fetch
 */

export type FetchFunction = typeof globalThis.fetch;

let customFetch: FetchFunction | null = null;

/**
 * Sets the fetch implementation to use for HTTP requests.
 * Call this at application startup before making any requests.
 * 
 * @param fetchFn - A fetch-compatible function (e.g., Electron's net.fetch, node-fetch, etc.)
 */
export function setFetch(fetchFn: FetchFunction): void {
  customFetch = fetchFn;
  console.log('[core/http] Custom fetch implementation registered');
}

/**
 * Clears the custom fetch implementation, reverting to globalThis.fetch.
 * Primarily useful for testing.
 */
export function clearFetch(): void {
  customFetch = null;
}

/**
 * Gets the current fetch implementation.
 * Returns the custom fetch if set, otherwise falls back to globalThis.fetch.
 * 
 * @returns The fetch function to use for HTTP requests
 */
export function getFetch(): FetchFunction {
  if (customFetch) {
    return customFetch;
  }
  
  // Fallback to global fetch
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch;
  }
  
  throw new Error(
    'No fetch implementation available. ' +
    'Call setFetch() to provide one, or ensure globalThis.fetch is available.'
  );
}

/**
 * Checks if a custom fetch has been registered.
 * Useful for debugging and logging.
 */
export function hasCustomFetch(): boolean {
  return customFetch !== null;
}
