/**
 * Application-wide constants
 */

export const CONFIG = {
  // Timing constants
  DEBOUNCE_DELAY_MS: 500,
  REQUEST_TIMEOUT_MS: 30000, // 30 seconds
  
  // Limits
  MAX_RECENT_REQUESTS: 20,
  MAX_PERSISTED_RECENT_REQUESTS: 100,
  
  // File names
  FILES: {
    COLLECTIONS: 'collections.json',
    ENVIRONMENTS: 'environments.json',
    STATE: 'app-state.json',
    RECENT_REQUESTS: 'recent-requests.json',
  },
  
  // Response size limits (in bytes)
  MAX_RESPONSE_SIZE: 100 * 1024 * 1024, // 100 MB
} as const;
