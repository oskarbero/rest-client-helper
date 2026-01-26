import { HttpRequest, Environment, EnvironmentVariable, KeyValuePair, CollectionSettings } from './types';

/**
 * Replaces variables in a text string using {{variable_name}} syntax
 * @param text The text containing variables to replace
 * @param variables Record of variable names to values
 * @returns Text with variables replaced
 */
export function replaceVariables(text: string, variables: Record<string, string>): string {
  if (!text || !variables || Object.keys(variables).length === 0) {
    return text;
  }

  // Match {{variable_name}} pattern
  return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const trimmedVarName = varName.trim();
    if (variables[trimmedVarName] !== undefined) {
      return variables[trimmedVarName];
    }
    // If variable not found, leave as-is
    return match;
  });
}

/**
 * Converts environment variables array to a Record for easy lookup
 */
function variablesToRecord(variables: EnvironmentVariable[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const variable of variables) {
    if (variable.key) {
      record[variable.key] = variable.value || '';
    }
  }
  return record;
}

/**
 * Resolves all variables in an HTTP request using the active environment
 * @param request The request to resolve variables in
 * @param activeEnvironment The active environment (null if none)
 * @returns A new request with all variables replaced
 */
export function resolveRequestVariables(
  request: HttpRequest,
  activeEnvironment: Environment | null
): HttpRequest {
  // If no active environment, return request as-is
  if (!activeEnvironment || !activeEnvironment.variables || activeEnvironment.variables.length === 0) {
    return { ...request };
  }

  const variables = variablesToRecord(activeEnvironment.variables);

  // Create a deep copy of the request with variables replaced
  const resolvedUrl = replaceVariables(request.url, variables).trim();
  
  const resolved: HttpRequest = {
    ...request,
    // Replace variables in URL
    url: resolvedUrl,
    // Replace variables in query params (both keys and values)
    queryParams: request.queryParams.map(param => ({
      ...param,
      key: replaceVariables(param.key, variables),
      value: replaceVariables(param.value, variables),
    })),
    // Replace variables in headers (both keys and values)
    headers: request.headers.map(header => ({
      ...header,
      key: replaceVariables(header.key, variables),
      value: replaceVariables(header.value, variables),
    })),
    // Replace variables in body content
    body: {
      ...request.body,
      content: replaceVariables(request.body.content, variables),
    },
    // Replace variables in auth fields
    auth: {
      ...request.auth,
      basic: request.auth.basic ? {
        username: replaceVariables(request.auth.basic.username, variables),
        password: replaceVariables(request.auth.basic.password, variables),
      } : undefined,
      bearer: request.auth.bearer ? {
        token: replaceVariables(request.auth.bearer.token, variables),
      } : undefined,
      apiKey: request.auth.apiKey ? {
        key: replaceVariables(request.auth.apiKey.key, variables),
        value: replaceVariables(request.auth.apiKey.value, variables),
        addTo: request.auth.apiKey.addTo,
      } : undefined,
    },
  };

  return resolved;
}

/**
 * Resolves a request with collection settings and environment variables
 * @param request The request to resolve
 * @param collectionSettings The collection settings to apply (merged from ancestors)
 * @param activeEnvironment The active environment (null if none)
 * @returns A new request with collection settings and variables applied
 */
export function resolveRequestWithCollectionSettings(
  request: HttpRequest,
  collectionSettings: CollectionSettings,
  activeEnvironment: Environment | null
): HttpRequest {
  // First resolve variables in the request
  let resolved = resolveRequestVariables(request, activeEnvironment);

  // Apply collection settings
  // 1. Prepend base URL to request URL (always prepend if baseURL is defined)
  if (collectionSettings.baseUrl && collectionSettings.baseUrl.trim()) {
    // Resolve variables in the baseURL first
    let baseUrl = collectionSettings.baseUrl.trim();
    if (activeEnvironment?.variables) {
      const variables = variablesToRecord(activeEnvironment.variables);
      baseUrl = replaceVariables(baseUrl, variables).trim();
    }
    
    const requestUrl = resolved.url.trim();
    
    if (requestUrl && baseUrl) {
      // Always prepend baseURL regardless of whether request URL starts with http:// or https://
      // Ensure baseUrl ends with / and requestUrl doesn't start with /
      const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const normalizedRequestUrl = requestUrl.startsWith('/') ? requestUrl : '/' + requestUrl;
      resolved.url = normalizedBaseUrl + normalizedRequestUrl;
    }
  }

  // 2. Merge collection headers with request headers (request headers take precedence)
  if (collectionSettings.headers && collectionSettings.headers.length > 0) {
    const headerMap = new Map<string, KeyValuePair>();
    
    // First add collection headers
    collectionSettings.headers.forEach(h => {
      if (h.key) {
        headerMap.set(h.key.toLowerCase(), { ...h });
      }
    });
    
    // Then add/override with request headers (request headers take precedence)
    resolved.headers.forEach(h => {
      if (h.key) {
        headerMap.set(h.key.toLowerCase(), { ...h });
      }
    });
    
    resolved.headers = Array.from(headerMap.values());
  }

  // 3. Merge collection auth with request auth
  // Request auth takes precedence if set (and not 'none'), otherwise use collection auth
  if (collectionSettings.auth) {
    if (resolved.auth.type === 'none' || !resolved.auth) {
      // Use collection auth if request has no auth
      resolved.auth = JSON.parse(JSON.stringify(collectionSettings.auth));
    } else {
      // Request has auth, but we can merge some fields if collection auth provides them
      // For now, request auth completely overrides collection auth if request has any auth
      // This matches the requirement: "request auth takes precedence if set"
    }
  }

  return resolved;
}
