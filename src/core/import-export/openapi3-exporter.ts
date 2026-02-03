import { CollectionNode, HttpRequest, AuthConfig } from '../types';

// OpenAPI 3.0 type definitions for export
interface OpenAPI3Spec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, PathItem>;
  components?: {
    securitySchemes?: Record<string, SecurityScheme>;
  };
  tags?: Array<{ name: string; description?: string }>;
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
  head?: Operation;
  options?: Operation;
  parameters?: Parameter[];
}

interface Operation {
  operationId: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBodySpec;
  responses?: Record<string, any>;
  security?: Array<Record<string, string[]>>;
}

interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: {
    type?: string;
    default?: any;
  };
  example?: any;
}

interface RequestBodySpec {
  description?: string;
  content: Record<string, MediaType>;
  required?: boolean;
}

interface MediaType {
  schema?: any;
  example?: any;
}

interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  description?: string;
}

/**
 * Exports CollectionNode structures to OpenAPI 3.0 specification
 */
export function exportToOpenAPI3(
  collections: CollectionNode[],
  title: string = 'REST Client Collection',
  version: string = '1.0.0'
): OpenAPI3Spec {
  const spec: OpenAPI3Spec = {
    openapi: '3.0.0',
    info: {
      title,
      version,
    },
    paths: {},
    components: {
      securitySchemes: {},
    },
    tags: [],
  };

  // Track security schemes we've seen
  const securitySchemeMap = new Map<string, { name: string; scheme: SecurityScheme }>();
  const securitySchemeCounter = { value: 0 };
  const tagSet = new Set<string>();

  // Process all collections recursively
  for (const collection of collections) {
    processCollection(collection, spec, securitySchemeMap, securitySchemeCounter, tagSet, []);
  }

  // Add security schemes to components
  if (securitySchemeMap.size > 0) {
    spec.components!.securitySchemes = {};
    for (const [key, value] of securitySchemeMap.entries()) {
      spec.components!.securitySchemes[value.name] = value.scheme;
    }
  }

  // Extract base URL from first collection's settings
  if (collections.length > 0 && collections[0].settings?.baseUrl) {
    spec.servers = [{ url: collections[0].settings.baseUrl }];
  }

  // Add collected tags to spec
  if (tagSet.size > 0) {
    spec.tags = Array.from(tagSet).map(name => ({ name }));
  }

  return spec;
}

/**
 * Recursively processes a collection node
 */
function processCollection(
  node: CollectionNode,
  spec: OpenAPI3Spec,
  securitySchemeMap: Map<string, { name: string; scheme: SecurityScheme }>,
  securitySchemeCounter: { value: number },
  tagSet: Set<string>,
  parentTags: string[]
): void {
  if (node.type === 'request' && node.request) {
    addRequestToSpec(node, spec, securitySchemeMap, securitySchemeCounter, parentTags);
  } else if (node.type === 'collection') {
    // Add collection name as tag
    if (node.name) {
      tagSet.add(node.name);
      parentTags = [...parentTags, node.name];
    }
    if (node.children) {
      for (const child of node.children) {
        processCollection(child, spec, securitySchemeMap, securitySchemeCounter, tagSet, parentTags);
      }
    }
  }
}

/**
 * Adds a request to the OpenAPI spec
 */
function addRequestToSpec(
  node: CollectionNode,
  spec: OpenAPI3Spec,
  securitySchemeMap: Map<string, { name: string; scheme: SecurityScheme }>,
  securitySchemeCounter: { value: number },
  parentTags: string[]
): void {
  if (!node.request) return;

  const request = node.request;
  
  // Extract path pattern from URL (preserve path parameters like {id})
  const pathPattern = extractPathPattern(request.url);
  
  // Get or create path item
  if (!spec.paths[pathPattern]) {
    spec.paths[pathPattern] = {};
  }
  const pathItem = spec.paths[pathPattern];

  // Convert method to lowercase operation
  const method = request.method.toLowerCase() as keyof PathItem;
  if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
    return; // Skip unsupported methods
  }

  // Build operation
  const operation: Operation = {
    operationId: generateOperationId(node.name, request.method, pathPattern),
    summary: node.name,
    tags: parentTags.length > 0 ? parentTags : undefined,
  };

  // Convert parameters
  const parameters: Parameter[] = [];

  // Add query parameters
  for (const param of request.queryParams) {
    if (param.key) {
      parameters.push({
        name: param.key,
        in: 'query',
        required: param.enabled,
        schema: {
          type: 'string',
        },
      });
    }
  }

  // Add header parameters (excluding auth headers)
  for (const header of request.headers) {
    if (header.key && !isAuthHeader(header.key, request.auth)) {
      parameters.push({
        name: header.key,
        in: 'header',
        required: header.enabled,
        schema: {
          type: 'string',
        },
      });
    }
  }

  // Extract path parameters from URL pattern
  const pathParams = extractPathParameters(pathPattern);
  for (const paramName of pathParams) {
    // Check if already added
    if (!parameters.some(p => p.name === paramName && p.in === 'path')) {
      parameters.push({
        name: paramName,
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
      });
    }
  }

  if (parameters.length > 0) {
    operation.parameters = parameters;
  }

  // Convert request body
  if (request.body.type !== 'none' && request.body.content) {
    operation.requestBody = convertRequestBody(request.body);
  }

  // Convert auth to security
  if (request.auth.type !== 'none') {
    const securityScheme = convertAuthToSecurityScheme(
      request.auth,
      securitySchemeMap,
      securitySchemeCounter
    );
    if (securityScheme) {
      operation.security = [{ [securityScheme.name]: [] }];
    }
  }

  // Add operation to path item
  (pathItem as any)[method] = operation;
}

/**
 * Extracts path pattern from URL, preserving path parameters
 */
function extractPathPattern(url: string): string {
  try {
    // If URL contains path parameters like {id}, preserve them
    // Otherwise, try to extract path from full URL
    if (url.includes('://')) {
      const urlObj = new URL(url);
      return urlObj.pathname;
    }
    // If it's already a path pattern, return as-is
    if (url.startsWith('/')) {
      return url;
    }
    // Try to extract path from relative URL
    const pathMatch = url.match(/^[^?]*/);
    return pathMatch ? pathMatch[0] : url;
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Extracts path parameter names from path pattern
 */
function extractPathParameters(pathPattern: string): string[] {
  const matches = pathPattern.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map(m => m.slice(1, -1)); // Remove { and }
}

/**
 * Generates an operationId from request name or method + path
 */
function generateOperationId(name: string, method: string, path: string): string {
  // Clean up the name to make a valid operationId
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  
  if (cleanName) {
    return cleanName;
  }

  // Fallback to method + path
  const pathId = path
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${method.toLowerCase()}_${pathId}`;
}


/**
 * Checks if a header is an authentication header
 */
function isAuthHeader(headerName: string, auth: AuthConfig): boolean {
  const lowerName = headerName.toLowerCase();
  if (lowerName === 'authorization') return true;
  if (auth.type === 'api-key' && auth.apiKey?.addTo === 'header' && auth.apiKey?.key === headerName) {
    return true;
  }
  return false;
}

/**
 * Converts HttpRequest body to OpenAPI requestBody
 */
function convertRequestBody(body: { type: string; content: string }): RequestBodySpec {
  const requestBody: RequestBodySpec = {
    content: {},
  };

  switch (body.type) {
    case 'json':
      try {
        const parsed = JSON.parse(body.content);
        requestBody.content['application/json'] = {
          schema: inferSchema(parsed),
        };
      } catch {
        requestBody.content['application/json'] = {
          schema: { type: 'object' },
        };
      }
      break;

    case 'form-data':
      requestBody.content['multipart/form-data'] = {
        schema: { type: 'object' },
      };
      break;

    case 'text':
      requestBody.content['text/plain'] = {
        schema: { type: 'string' },
      };
      break;

    default:
      requestBody.content['application/json'] = {
        schema: { type: 'object' },
      };
  }

  return requestBody;
}

/**
 * Infers a JSON schema from a JavaScript object
 */
function inferSchema(obj: any): any {
  if (obj === null) return { type: 'null' };
  if (Array.isArray(obj)) {
    return {
      type: 'array',
      items: obj.length > 0 ? inferSchema(obj[0]) : { type: 'object' },
    };
  }
  if (typeof obj === 'object') {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      properties[key] = inferSchema(value);
      if (value !== null && value !== undefined && value !== '') {
        required.push(key);
      }
    }
    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }
  return { type: typeof obj };
}

/**
 * Converts AuthConfig to OpenAPI security scheme
 */
function convertAuthToSecurityScheme(
  auth: AuthConfig,
  securitySchemeMap: Map<string, { name: string; scheme: SecurityScheme }>,
  securitySchemeCounter: { value: number }
): { name: string; scheme: SecurityScheme } | null {
  let schemeKey = '';
  let scheme: SecurityScheme;

  switch (auth.type) {
    case 'api-key':
      if (!auth.apiKey) return null;
      schemeKey = `apiKey_${auth.apiKey.addTo}_${auth.apiKey.key}`;
      scheme = {
        type: 'apiKey',
        name: auth.apiKey.key,
        in: auth.apiKey.addTo,
      };
      break;

    case 'basic':
      schemeKey = 'basic_auth';
      scheme = {
        type: 'http',
        scheme: 'basic',
      };
      break;

    case 'bearer':
      schemeKey = 'bearer_auth';
      scheme = {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      };
      break;

    default:
      return null;
  }

  // Check if we've already created this scheme
  if (securitySchemeMap.has(schemeKey)) {
    return securitySchemeMap.get(schemeKey)!;
  }

  // Create new scheme with unique name
  const schemeName = schemeKey.replace(/[^a-zA-Z0-9]/g, '_') || `security_${securitySchemeCounter.value++}`;
  const result = { name: schemeName, scheme };
  securitySchemeMap.set(schemeKey, result);
  return result;
}
