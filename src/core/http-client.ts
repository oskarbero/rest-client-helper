import { HttpRequest, HttpResponse, KeyValuePair } from './types';
import { generateAuthHeaders, generateAuthQueryParam } from './auth-handler';

/**
 * Sends an HTTP request and returns the response
 */
export async function sendRequest(request: HttpRequest): Promise<HttpResponse> {
  const startTime = performance.now();

  try {
    // Collect query params including auth query param if applicable
    let queryParams = [...request.queryParams];
    const authQueryParam = generateAuthQueryParam(request.auth);
    if (authQueryParam) {
      queryParams = [...queryParams, authQueryParam];
    }

    // Build the URL with query parameters
    const url = buildUrl(request.url, queryParams);

    // Build headers object from key-value pairs
    const headers: Record<string, string> = {};
    for (const header of request.headers) {
      if (header.enabled && header.key) {
        headers[header.key] = header.value;
      }
    }

    // Apply auth headers (these take precedence if user hasn't set them manually)
    const authHeaders = generateAuthHeaders(request.auth);
    for (const [key, value] of Object.entries(authHeaders)) {
      // Only add auth header if user hasn't manually set it
      const hasManualHeader = request.headers.some(
        h => h.enabled && h.key.toLowerCase() === key.toLowerCase()
      );
      if (!hasManualHeader) {
        headers[key] = value;
      }
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
    };

    // Add body for non-GET requests (will be enhanced in Milestone 4)
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body.type !== 'none') {
      fetchOptions.body = request.body.content;
      // Set Content-Type if not already set
      if (!headers['Content-Type'] && !headers['content-type']) {
        if (request.body.type === 'json') {
          headers['Content-Type'] = 'application/json';
        } else if (request.body.type === 'text') {
          headers['Content-Type'] = 'text/plain';
        }
      }
    }

    // Make the request
    const response = await fetch(url, fetchOptions);

    // Read the response body as text
    const body = await response.text();

    // Calculate duration
    const duration = Math.round(performance.now() - startTime);

    // Extract response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Get content type
    const contentType = response.headers.get('content-type') || 'text/plain';

    // Calculate response size (approximate)
    const size = new Blob([body]).size;

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body,
      contentType,
      duration,
      size,
    };
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    
    // Return an error response
    return {
      status: 0,
      statusText: 'Error',
      headers: {},
      body: error instanceof Error ? error.message : 'Unknown error occurred',
      contentType: 'text/plain',
      duration,
      size: 0,
    };
  }
}

/**
 * Builds a URL with query parameters appended
 */
function buildUrl(baseUrl: string, queryParams: { key: string; value: string; enabled: boolean }[]): string {
  if (!baseUrl) {
    throw new Error('URL is required');
  }

  // Filter enabled params with non-empty keys
  const enabledParams = queryParams.filter(p => p.enabled && p.key);
  
  if (enabledParams.length === 0) {
    return baseUrl;
  }

  // Parse existing URL to handle existing query params
  const url = new URL(baseUrl);
  
  for (const param of enabledParams) {
    url.searchParams.append(param.key, param.value);
  }

  return url.toString();
}
