import { HttpRequest, Environment, EnvironmentVariable, KeyValuePair } from './types';

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
