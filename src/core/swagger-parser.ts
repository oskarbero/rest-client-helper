import { parse as parseYaml } from 'yaml';
import type { OpenAPISpec, OpenAPIVersion, SecuritySchemeMap, Server } from './swagger-types';

/**
 * Detects the format of a file based on its extension or content
 */
export function detectFormat(filePath: string): 'json' | 'yaml' {
  const ext = filePath.toLowerCase().split('.').pop();
  if (ext === 'yaml' || ext === 'yml') {
    return 'yaml';
  }
  return 'json';
}

/**
 * Detects the OpenAPI/Swagger version from the spec
 */
export function detectVersion(spec: any): OpenAPIVersion {
  if (spec.openapi) {
    const version = spec.openapi.split('.')[0] + '.' + spec.openapi.split('.')[1];
    if (version === '3.0' || version === '3.1') {
      return version as OpenAPIVersion;
    }
    return '3.0'; // Default to 3.0 for unknown 3.x versions
  }
  if (spec.swagger) {
    return '2.0';
  }
  throw new Error('Unable to detect OpenAPI/Swagger version. Missing "openapi" or "swagger" field.');
}

/**
 * Parses a Swagger/OpenAPI file (JSON or YAML)
 */
export function parseSwaggerFile(content: string, format: 'json' | 'yaml'): OpenAPISpec {
  let parsed: any;

  try {
    if (format === 'yaml') {
      parsed = parseYaml(content);
    } else {
      parsed = JSON.parse(content);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse ${format.toUpperCase()} file: ${errorMessage}`);
  }

  // Validate basic structure
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid file format: expected an object');
  }

  if (!parsed.info || !parsed.info.title) {
    throw new Error('Invalid OpenAPI/Swagger spec: missing "info.title"');
  }

  if (!parsed.paths || typeof parsed.paths !== 'object') {
    throw new Error('Invalid OpenAPI/Swagger spec: missing or invalid "paths"');
  }

  return parsed as OpenAPISpec;
}

/**
 * Extracts the base URL from the spec
 */
export function extractBaseUrl(spec: OpenAPISpec): string {
  const version = detectVersion(spec);

  if (version === '2.0') {
    // Swagger 2.0: host + basePath + schemes
    const host = spec.host || '';
    const basePath = spec.basePath || '';
    const schemes = spec.schemes || ['https'];
    const scheme = schemes[0] || 'https';
    
    if (!host) {
      return ''; // No base URL specified
    }
    
    return `${scheme}://${host}${basePath}`;
  } else {
    // OpenAPI 3.x: servers array
    if (!spec.servers || spec.servers.length === 0) {
      return ''; // No servers specified
    }

    const server = spec.servers[0];
    let url = server.url;

    // Replace server variables if present
    if (server.variables) {
      for (const [varName, varDef] of Object.entries(server.variables)) {
        const value = varDef.default || '';
        url = url.replace(`{${varName}}`, value);
      }
    }

    return url;
  }
}

/**
 * Extracts all servers from the spec
 */
export function extractServers(spec: OpenAPISpec): string[] {
  const version = detectVersion(spec);

  if (version === '2.0') {
    const baseUrl = extractBaseUrl(spec);
    return baseUrl ? [baseUrl] : [];
  } else {
    if (!spec.servers || spec.servers.length === 0) {
      return [];
    }

    return spec.servers.map(server => {
      let url = server.url;
      if (server.variables) {
        for (const [varName, varDef] of Object.entries(server.variables)) {
          const value = varDef.default || '';
          url = url.replace(`{${varName}}`, value);
        }
      }
      return url;
    });
  }
}

/**
 * Extracts security schemes from the spec
 */
export function extractSecuritySchemes(spec: OpenAPISpec): SecuritySchemeMap {
  const version = detectVersion(spec);

  if (version === '2.0') {
    return spec.securityDefinitions || {};
  } else {
    return spec.components?.securitySchemes || {};
  }
}

/**
 * Resolves a $ref reference (basic implementation)
 * Only handles local references within the same document
 */
export function resolveRef(spec: OpenAPISpec, ref: string): any {
  if (!ref.startsWith('#/')) {
    // External reference - not supported yet
    return null;
  }

  const path = ref.substring(2).split('/');
  let current: any = spec;

  for (const segment of path) {
    if (current && typeof current === 'object' && segment in current) {
      current = current[segment];
    } else {
      return null;
    }
  }

  return current;
}

/**
 * Checks if an object is a reference
 */
export function isReference(obj: any): obj is { $ref: string } {
  return obj && typeof obj === 'object' && '$ref' in obj && typeof obj.$ref === 'string';
}

/**
 * Gets all paths and operations from the spec
 */
export function extractPathsAndOperations(spec: OpenAPISpec): Array<{
  path: string;
  method: string;
  operation: any;
}> {
  const operations: Array<{ path: string; method: string; operation: any }> = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }

    // Skip if it's just a reference
    if (isReference(pathItem)) {
      continue;
    }

    const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
    
    for (const method of methods) {
      if (method in pathItem && pathItem[method as keyof typeof pathItem]) {
        const operation = pathItem[method as keyof typeof pathItem];
        if (operation && typeof operation === 'object' && !isReference(operation)) {
          operations.push({
            path,
            method: method.toUpperCase(),
            operation,
          });
        }
      }
    }
  }

  return operations;
}
