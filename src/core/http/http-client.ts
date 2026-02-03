import { HttpRequest, HttpResponse, KeyValuePair } from '../types';
import { generateAuthHeaders, generateAuthQueryParam } from './auth-handler';
import { CONFIG } from '../constants';
import { isValidUrl } from '../utils';
import { getFetch, hasCustomFetch } from './fetch-provider';

/**
 * Determines the proxy URL for a given target URL based on environment variables.
 * Respects HTTP_PROXY, HTTPS_PROXY, and NO_PROXY.
 */
function getProxyForUrl(targetUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    return null;
  }
  
  const protocol = url.protocol.replace(':', '').toLowerCase();
  const hostname = url.hostname.toLowerCase();

  // Check NO_PROXY first
  const noProxy = process.env.NO_PROXY || process.env.no_proxy || '';
  if (noProxy) {
    const noProxyList = noProxy.split(',').map(h => h.trim().toLowerCase());
    for (const pattern of noProxyList) {
      if (!pattern) continue;
      // Handle wildcard "*"
      if (pattern === '*') return null;
      // Handle suffix matching (e.g., ".example.com" or "example.com")
      const normalizedPattern = pattern.startsWith('.') ? pattern : '.' + pattern;
      if (hostname === pattern.replace(/^\./, '') || hostname.endsWith(normalizedPattern)) {
        return null;
      }
    }
  }

  // Get appropriate proxy based on protocol
  if (protocol === 'https') {
    return process.env.HTTPS_PROXY || process.env.https_proxy || 
           process.env.HTTP_PROXY || process.env.http_proxy || null;
  }
  return process.env.HTTP_PROXY || process.env.http_proxy || null;
}

/**
 * Logs proxy configuration for debugging when using fallback fetch.
 * Only logs once per session to avoid spam.
 */
let proxyWarningLogged = false;
function logProxyWarningIfNeeded(): void {
  if (proxyWarningLogged) return;
  
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;
  
  if ((httpProxy || httpsProxy) && !hasCustomFetch()) {
    console.log('Proxy environment detected:', {
      HTTP_PROXY: httpProxy || '(not set)',
      HTTPS_PROXY: httpsProxy || '(not set)',
      NO_PROXY: noProxy || '(not set)',
    });
    console.warn(
      'Warning: Using standard fetch which may not respect HTTP_PROXY/HTTPS_PROXY. ' +
      'For full proxy support, register a proxy-aware fetch implementation via setFetch().'
    );
    proxyWarningLogged = true;
  }
}

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

    // Add body for non-GET requests
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

    // Make the request using the injected or fallback fetch
    let response: Response;
    try {
      // Log proxy warning if needed (only once)
      logProxyWarningIfNeeded();
      
      // Get fetch implementation from provider
      const fetchFn = getFetch();
      
      // Log proxy info for debugging
      const proxyUrl = getProxyForUrl(url);
      if (proxyUrl) {
        console.log(`Request to ${url} should use proxy: ${proxyUrl}`);
      }
      
      response = await fetchFn(url, fetchOptions);
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      // Emit detailed context to help diagnose failed fetches
      const proxyUrl = getProxyForUrl(url);
      console.error('Fetch failed', {
        url,
        method: request.method,
        headers,
        hasBody: Boolean(fetchOptions.body),
        bodyPreview: typeof fetchOptions.body === 'string'
          ? fetchOptions.body.slice(0, 500)
          : '[non-string or empty]',
        proxyUrl: proxyUrl || '(direct)',
        error: error instanceof Error ? error.message : String(error),
      });
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
