import { AuthConfig, KeyValuePair } from './types';

/**
 * Generates authentication headers based on the auth configuration
 * @param auth - The authentication configuration
 * @returns An object with headers to add to the request
 */
export function generateAuthHeaders(auth: AuthConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  switch (auth.type) {
    case 'basic':
      if (auth.basic?.username || auth.basic?.password) {
        const credentials = `${auth.basic.username || ''}:${auth.basic.password || ''}`;
        const encoded = Buffer.from(credentials).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
      }
      break;

    case 'bearer':
      if (auth.bearer?.token) {
        headers['Authorization'] = `Bearer ${auth.bearer.token}`;
      }
      break;

    case 'api-key':
      // API Key added to header (query params handled separately)
      if (auth.apiKey?.key && auth.apiKey?.addTo === 'header') {
        headers[auth.apiKey.key] = auth.apiKey.value || '';
      }
      break;

    case 'none':
    default:
      // No auth headers needed
      break;
  }

  return headers;
}

/**
 * Generates query parameters for API Key auth when configured to add to query
 * @param auth - The authentication configuration
 * @returns A KeyValuePair to add to query params, or null if not applicable
 */
export function generateAuthQueryParam(auth: AuthConfig): KeyValuePair | null {
  if (auth.type === 'api-key' && auth.apiKey?.key && auth.apiKey?.addTo === 'query') {
    return {
      key: auth.apiKey.key,
      value: auth.apiKey.value || '',
      enabled: true,
    };
  }
  return null;
}

/**
 * Creates a default/empty auth configuration
 */
export function createEmptyAuth(): AuthConfig {
  return {
    type: 'none',
  };
}

/**
 * Validates if the auth configuration is complete for its type
 */
export function isAuthConfigValid(auth: AuthConfig): boolean {
  switch (auth.type) {
    case 'none':
      return true;
    case 'basic':
      return !!(auth.basic?.username || auth.basic?.password);
    case 'bearer':
      return !!auth.bearer?.token;
    case 'api-key':
      return !!auth.apiKey?.key;
    default:
      return true;
  }
}
