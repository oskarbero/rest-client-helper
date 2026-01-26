import { HttpRequest, HttpResponse, KeyValuePair } from './types';
import { generateAuthHeaders, generateAuthQueryParam } from './auth-handler';
import { CONFIG } from './constants';
import { isValidUrl } from './utils';

/**
 * Sends an HTTP request and returns the response
 */
export async function sendRequest(request: HttpRequest, signal?: AbortSignal): Promise<HttpResponse> {
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
    
    // Validate URL
    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

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

    // Prepare fetch options with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
    
    // Combine with provided signal if any
    const abortSignal = signal 
      ? (() => {
          const combinedController = new AbortController();
          signal.addEventListener('abort', () => combinedController.abort());
          controller.signal.addEventListener('abort', () => combinedController.abort());
          return combinedController.signal;
        })()
      : controller.signal;
    
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      signal: abortSignal,
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
    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout or cancelled');
      }
      throw error;
    }

    // Read the response body as text with size limit
    const body = await response.text();
    
    // Check response size
    if (body.length > CONFIG.MAX_RESPONSE_SIZE) {
      console.warn(`Response size (${body.length} bytes) exceeds maximum (${CONFIG.MAX_RESPONSE_SIZE} bytes)`);
    }

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
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('cancelled')) {
        errorMessage = 'Request timeout or cancelled';
      } else if (error.message.includes('Invalid URL')) {
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      status: 0,
      statusText: 'Error',
      headers: {},
      body: errorMessage,
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
  
  // Trim the base URL first
  const trimmedBaseUrl = baseUrl.trim();
  
  // If no query params, return trimmed URL
  if (enabledParams.length === 0) {
    return trimmedBaseUrl;
  }

  // Parse existing URL to handle existing query params
  // Use the already-trimmed URL
  let trimmedUrl = trimmedBaseUrl;
  
  // If URL doesn't have a protocol, try to add https:// as default
  // This handles cases where variable replacement results in a domain without protocol
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('//')) {
    trimmedUrl = 'https://' + trimmedUrl;
  }
  
  let url: URL;
  try {
    url = new URL(trimmedUrl);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid URL: ${errorMsg}. URL: ${trimmedUrl}`);
  }
  
  for (const param of enabledParams) {
    url.searchParams.append(param.key, param.value);
  }

  return url.toString();
}
