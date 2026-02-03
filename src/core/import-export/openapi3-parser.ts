import { CollectionNode, HttpRequest, AuthConfig, KeyValuePair, RequestBody, CollectionSettings } from '../types';
import { createEmptyRequest } from '../types';
import { generateId } from '../utils';

// OpenAPI 3.0 type definitions
interface OpenAPI3Spec {
  openapi: string;
  info: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, PathItem>;
  components?: {
    securitySchemes?: Record<string, SecurityScheme>;
    schemas?: Record<string, any>;
  };
  security?: Array<Record<string, string[]>>;
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
  operationId?: string;
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
    enum?: any[];
  };
  example?: any;
}

interface RequestBodySpec {
  description?: string;
  content?: Record<string, MediaType>;
  required?: boolean;
}

interface MediaType {
  schema?: any;
  example?: any;
  examples?: Record<string, any>;
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
 * Parses an OpenAPI 3.0 specification and converts it to CollectionNode structures
 */
export function parseOpenAPI3(spec: OpenAPI3Spec): CollectionNode[] {
  const collections: CollectionNode[] = [];
  const now = new Date().toISOString();

  // Extract base URL from servers (use first server)
  const baseUrl = spec.servers && spec.servers.length > 0 
    ? spec.servers[0].url 
    : undefined;

  // Create a map of tags to collections
  const tagCollections = new Map<string, CollectionNode>();
  
  // Create root collection for the API
  const rootCollectionName = spec.info?.title || 'Imported API';
  const rootCollection: CollectionNode = {
    id: generateId(),
    name: rootCollectionName,
    type: 'collection',
    createdAt: now,
    updatedAt: now,
    children: [],
    settings: baseUrl ? { baseUrl } : undefined,
  };
  collections.push(rootCollection);

  // Process all paths
  for (const [pathPattern, pathItem] of Object.entries(spec.paths)) {
    const methods: Array<{ method: string; operation: Operation }> = [];
    
    // Collect all operations for this path
    if (pathItem.get) methods.push({ method: 'GET', operation: pathItem.get });
    if (pathItem.post) methods.push({ method: 'POST', operation: pathItem.post });
    if (pathItem.put) methods.push({ method: 'PUT', operation: pathItem.put });
    if (pathItem.patch) methods.push({ method: 'PATCH', operation: pathItem.patch });
    if (pathItem.delete) methods.push({ method: 'DELETE', operation: pathItem.delete });
    if (pathItem.head) methods.push({ method: 'HEAD', operation: pathItem.head });
    if (pathItem.options) methods.push({ method: 'OPTIONS', operation: pathItem.options });

    // Process each operation
    for (const { method, operation } of methods) {
      const request = createRequestFromOperation(
        pathPattern,
        method.toUpperCase() as any,
        operation,
        pathItem.parameters || [],
        spec.components?.securitySchemes || {},
        spec.security || []
      );

      // Determine collection based on tags
      const tags = operation.tags || [];
      let targetCollection = rootCollection;

      if (tags.length > 0) {
        // Use first tag to organize
        const tagName = tags[0];
        if (!tagCollections.has(tagName)) {
          const tagCollection: CollectionNode = {
            id: generateId(),
            name: tagName,
            type: 'collection',
            createdAt: now,
            updatedAt: now,
            children: [],
            settings: baseUrl ? { baseUrl } : undefined,
          };
          tagCollections.set(tagName, tagCollection);
          rootCollection.children!.push(tagCollection);
        }
        targetCollection = tagCollections.get(tagName)!;
      } else {
        // If no tags, try to organize by path prefix
        const pathParts = pathPattern.split('/').filter(p => p && !p.startsWith('{'));
        if (pathParts.length > 0) {
          const prefix = pathParts[0];
          const collectionName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
          if (!tagCollections.has(collectionName)) {
            const pathCollection: CollectionNode = {
              id: generateId(),
              name: collectionName,
              type: 'collection',
              createdAt: now,
              updatedAt: now,
              children: [],
              settings: baseUrl ? { baseUrl } : undefined,
            };
            tagCollections.set(collectionName, pathCollection);
            rootCollection.children!.push(pathCollection);
          }
          targetCollection = tagCollections.get(collectionName)!;
        }
      }

      // Create request name from operationId, summary, or method + path
      const requestName = operation.operationId || 
                        operation.summary || 
                        `${method} ${pathPattern}`;

      const requestNode: CollectionNode = {
        id: generateId(),
        name: requestName,
        type: 'request',
        createdAt: now,
        updatedAt: now,
        request,
      };

      targetCollection.children!.push(requestNode);
    }
  }

  // If root collection has no direct children and only one child collection, return that child
  if (collections.length === 1 && rootCollection.children!.length === 1 && rootCollection.children![0].type === 'collection') {
    return [rootCollection.children![0]];
  }

  return collections;
}

/**
 * Creates an HttpRequest from an OpenAPI operation
 */
function createRequestFromOperation(
  pathPattern: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS',
  operation: Operation,
  pathParameters: Parameter[],
  securitySchemes: Record<string, SecurityScheme>,
  globalSecurity: Array<Record<string, string[]>>
): HttpRequest {
  const request = createEmptyRequest();
  request.method = method;
  request.url = pathPattern;

  // Combine path-level and operation-level parameters
  const allParameters = [...pathParameters, ...(operation.parameters || [])];

  // Process parameters
  const queryParams: KeyValuePair[] = [];
  const headers: KeyValuePair[] = [];
  const pathParams: Parameter[] = [];

  for (const param of allParameters) {
    const kv: KeyValuePair = {
      key: param.name,
      value: param.schema?.default?.toString() || param.example?.toString() || '',
      enabled: param.required !== false,
    };

    if (param.in === 'query') {
      queryParams.push(kv);
    } else if (param.in === 'header') {
      headers.push(kv);
    } else if (param.in === 'path') {
      pathParams.push(param);
    }
  }

  request.queryParams = queryParams;
  request.headers = headers;

  // Process request body
  if (operation.requestBody) {
    request.body = convertRequestBody(operation.requestBody);
  }

  // Process security
  const operationSecurity = operation.security || globalSecurity;
  if (operationSecurity.length > 0) {
    request.auth = convertSecurityToAuth(operationSecurity[0], securitySchemes);
  }

  return request;
}

/**
 * Converts OpenAPI requestBody to HttpRequest body
 */
function convertRequestBody(requestBody: RequestBodySpec): RequestBody {
  if (!requestBody.content) {
    return { type: 'none', content: '' };
  }

  // Prefer JSON, then form-data, then text
  if (requestBody.content['application/json']) {
    const jsonContent = requestBody.content['application/json'];
    const example = jsonContent.example || jsonContent.schema;
    return {
      type: 'json',
      content: example ? JSON.stringify(example, null, 2) : '{}',
    };
  }

  if (requestBody.content['multipart/form-data'] || requestBody.content['application/x-www-form-urlencoded']) {
    // For form data, we'll store as text for now
    // In a full implementation, we might want to parse this into form fields
    return {
      type: 'form-data',
      content: '',
    };
  }

  // Default to text
  const firstContentType = Object.keys(requestBody.content)[0];
  const firstContent = requestBody.content[firstContentType];
  return {
    type: 'text',
    content: firstContent?.example?.toString() || '',
  };
}

/**
 * Converts OpenAPI security requirements to AuthConfig
 */
function convertSecurityToAuth(
  security: Record<string, string[]>,
  securitySchemes: Record<string, SecurityScheme>
): AuthConfig {
  // Get first security scheme
  const schemeName = Object.keys(security)[0];
  if (!schemeName) {
    return { type: 'none' };
  }

  const scheme = securitySchemes[schemeName];
  if (!scheme) {
    return { type: 'none' };
  }

  switch (scheme.type) {
    case 'apiKey':
      return {
        type: 'api-key',
        apiKey: {
          key: scheme.name || '',
          value: '',
          addTo: scheme.in === 'query' ? 'query' : 'header',
        },
      };

    case 'http':
      if (scheme.scheme === 'basic') {
        return {
          type: 'basic',
          basic: {
            username: '',
            password: '',
          },
        };
      } else if (scheme.scheme === 'bearer') {
        return {
          type: 'bearer',
          bearer: {
            token: '',
          },
        };
      }
      break;

    case 'oauth2':
      // OAuth2 is complex, but we'll treat it as bearer token
      return {
        type: 'bearer',
        bearer: {
          token: '',
        },
      };
  }

  return { type: 'none' };
}
