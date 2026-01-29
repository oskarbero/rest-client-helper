import { CollectionNode } from './types';

/**
 * Represents a group in the path-based hierarchy
 */
export interface PathGroup {
  name: string; // Group name (path segment or domain)
  fullPath: string; // Full path from root to this group (for unique identification)
  requests: CollectionNode[]; // Requests at this level
  groups: Map<string, PathGroup>; // Nested groups
  isVariable: boolean; // True if this segment contains a variable
}

/**
 * Extracts the path portion from a full URL
 * Handles URLs with protocols, domains, query params
 * If baseUrl is provided and request URL is relative, combine them
 */
export function extractPathFromUrl(url: string, baseUrl?: string): string {
  if (!url) {
    return '';
  }

  // If baseUrl is provided and URL doesn't start with http:// or https://, combine them
  let fullUrl = url;
  if (baseUrl && baseUrl.trim() && !url.match(/^https?:\/\//i)) {
    const normalizedBaseUrl = baseUrl.trim().endsWith('/') ? baseUrl.trim().slice(0, -1) : baseUrl.trim();
    const normalizedUrl = url.startsWith('/') ? url : '/' + url;
    fullUrl = normalizedBaseUrl + normalizedUrl;
  }

  try {
    // Try to parse as URL to extract pathname
    const urlObj = new URL(fullUrl);
    return urlObj.pathname;
  } catch {
    // If URL parsing fails (e.g., contains variables), manually extract path
    // Remove protocol and domain if present
    let path = fullUrl;
    
    // Remove protocol (http://, https://)
    path = path.replace(/^https?:\/\//i, '');
    
    // Remove domain (everything up to first /)
    const firstSlash = path.indexOf('/');
    if (firstSlash !== -1) {
      path = path.substring(firstSlash);
    } else {
      // No slash found, might be just domain or relative path
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
    }
    
    // Remove query string and hash
    const queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
      path = path.substring(0, queryIndex);
    }
    const hashIndex = path.indexOf('#');
    if (hashIndex !== -1) {
      path = path.substring(0, hashIndex);
    }
    
    return path || '/';
  }
}

/**
 * Extracts the domain from a full URL
 */
export function extractDomainFromUrl(url: string, baseUrl?: string): string {
  if (!url) {
    return '';
  }

  // If baseUrl is provided and URL doesn't start with http:// or https://, use baseUrl's domain
  let fullUrl = url;
  if (baseUrl && baseUrl.trim() && !url.match(/^https?:\/\//i)) {
    fullUrl = baseUrl.trim();
  }

  try {
    const urlObj = new URL(fullUrl);
    return urlObj.hostname || '';
  } catch {
    // Manual extraction
    let domain = fullUrl;
    
    // Remove protocol
    domain = domain.replace(/^https?:\/\//i, '');
    
    // Extract domain (everything up to first /)
    const firstSlash = domain.indexOf('/');
    if (firstSlash !== -1) {
      domain = domain.substring(0, firstSlash);
    }
    
    // Remove port if present
    const colonIndex = domain.indexOf(':');
    if (colonIndex !== -1) {
      domain = domain.substring(0, colonIndex);
    }
    
    return domain || '';
  }
}

/**
 * Splits path into segments by /
 * Filters out empty segments
 */
export function parsePathSegments(path: string): string[] {
  if (!path || path === '/') {
    return [];
  }
  
  // Remove leading slash and split
  const segments = path.split('/').filter(segment => segment.length > 0);
  return segments;
}

/**
 * Detects path variables in format {variableName} or {{variableName}}
 * Returns true if segment contains variable pattern
 */
export function isPathVariable(segment: string): boolean {
  if (!segment) {
    return false;
  }
  
  // Check for {variable} or {{variable}} patterns
  // Match {something} or {{something}} but not {something{ or }something}
  return /^\{+\w+\}+$/.test(segment) || /\{[^}]+\}/.test(segment);
}

/**
 * Checks if a string contains variable patterns like {{variable}}
 * Used to detect if a domain/baseUrl contains variables
 */
export function containsVariable(str: string): boolean {
  if (!str) {
    return false;
  }
  
  // Check for {{variable}} pattern (environment variables)
  return /\{\{[^}]+\}\}/.test(str);
}

/**
 * Groups requests by their URL paths into a hierarchical structure
 * Creates nested groups based on path segments
 * Handles variable segments (they belong to previous level)
 */
export function groupRequestsByPath(
  requests: CollectionNode[],
  baseUrl?: string
): PathGroup {
  const root: PathGroup = {
    name: '',
    fullPath: '',
    requests: [],
    groups: new Map(),
    isVariable: false,
  };

  // Extract domain from first request if available, or use baseUrl
  // Skip domain group creation if:
  // 1. baseUrl is set (we already know the base, don't need to extract domain)
  // 2. Domain contains variables like {{variable}}
  let domain = '';
  let shouldCreateDomainGroup = false;
  
  // Only extract domain if baseUrl is not set
  if (!baseUrl) {
    const firstRequestWithUrl = requests.find(r => r.type === 'request' && r.request?.url);
    if (firstRequestWithUrl?.request?.url) {
      domain = extractDomainFromUrl(firstRequestWithUrl.request.url);
      // Only create domain group if domain doesn't contain variables
      shouldCreateDomainGroup = !!domain && !containsVariable(domain);
    }
  }

  // If we have a domain and should create a group, create a domain group
  let currentRoot = root;
  if (shouldCreateDomainGroup && domain) {
    const domainGroup: PathGroup = {
      name: domain,
      fullPath: domain,
      requests: [],
      groups: new Map(),
      isVariable: false,
    };
    root.groups.set(domain, domainGroup);
    currentRoot = domainGroup;
  }

  // Process each request
  for (const request of requests) {
    if (request.type !== 'request' || !request.request?.url) {
      // Request without URL goes to uncategorized
      if (!currentRoot.groups.has('Uncategorized')) {
        currentRoot.groups.set('Uncategorized', {
          name: 'Uncategorized',
          fullPath: currentRoot.fullPath ? `${currentRoot.fullPath}/Uncategorized` : 'Uncategorized',
          requests: [],
          groups: new Map(),
          isVariable: false,
        });
      }
      currentRoot.groups.get('Uncategorized')!.requests.push(request);
      continue;
    }

    const url = request.request.url;
    const path = extractPathFromUrl(url, baseUrl);
    const segments = parsePathSegments(path);

    if (segments.length === 0) {
      // Root path request, add directly to current root
      currentRoot.requests.push(request);
      continue;
    }

    // Navigate/create groups based on segments
    // Rule: If a path has a variable in it, it belongs to the previous level
    // Example: /products/{id} goes to "products" group
    // Example: /products/{id}/name goes to "products" -> "{id}" group -> "name" request
    let currentGroup = currentRoot;
    let currentPath = currentRoot.fullPath;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isVar = isPathVariable(segment);
      const isLastSegment = i === segments.length - 1;
      const hasMoreSegments = i < segments.length - 1;

      if (isVar && isLastSegment) {
        // Variable segment that is the last one - belongs to previous level
        // The request itself goes to the current group (parent of variable)
        currentGroup.requests.push(request);
        break;
      } else if (isVar && hasMoreSegments) {
        // Variable segment with more segments after it - create group for variable
        // Subsequent segments will go into this variable group
        const groupKey = segment;
        const groupPath = currentPath ? `${currentPath}/${groupKey}` : groupKey;

        if (!currentGroup.groups.has(groupKey)) {
          currentGroup.groups.set(groupKey, {
            name: segment,
            fullPath: groupPath,
            requests: [],
            groups: new Map(),
            isVariable: true,
          });
        }
        currentGroup = currentGroup.groups.get(groupKey)!;
        currentPath = groupPath;
      } else if (!isVar && isLastSegment) {
        // Non-variable last segment - this is the request name
        // Add request to current group
        currentGroup.requests.push(request);
        break;
      } else if (!isVar) {
        // Non-variable, not last segment - create/find group
        const groupKey = segment;
        const groupPath = currentPath ? `${currentPath}/${groupKey}` : groupKey;

        if (!currentGroup.groups.has(groupKey)) {
          currentGroup.groups.set(groupKey, {
            name: segment,
            fullPath: groupPath,
            requests: [],
            groups: new Map(),
            isVariable: false,
          });
        }
        currentGroup = currentGroup.groups.get(groupKey)!;
        currentPath = groupPath;
      }
    }
  }

  return root;
}

/**
 * Flattens a PathGroup into an array for easier iteration
 * Useful for rendering
 */
export function flattenPathGroup(group: PathGroup): Array<{ group: PathGroup; level: number }> {
  const result: Array<{ group: PathGroup; level: number }> = [];
  
  function traverse(g: PathGroup, level: number) {
    result.push({ group: g, level });
    for (const subGroup of g.groups.values()) {
      traverse(subGroup, level + 1);
    }
  }
  
  traverse(group, 0);
  return result;
}
