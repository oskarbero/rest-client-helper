// HTTP Methods supported by the client
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// Body content types
export type BodyType = 'none' | 'json' | 'text' | 'form-data';

// Authorization types
export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key';

// Key-value pair with enable toggle (for params, headers)
export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

// Request body configuration
export interface RequestBody {
  type: BodyType;
  content: string;
}

// Authorization configuration
export interface AuthConfig {
  type: AuthType;
  basic?: {
    username: string;
    password: string;
  };
  bearer?: {
    token: string;
  };
  apiKey?: {
    key: string;
    value: string;
    addTo: 'header' | 'query';
  };
}

// Complete HTTP request configuration
export interface HttpRequest {
  url: string;
  method: HttpMethod;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
}

// HTTP response from the server
export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  duration: number;
  size: number;
}

// Saved request for collections
export interface SavedRequest {
  id: string;
  name: string;
  request: HttpRequest;
  createdAt: string;
  updatedAt: string;
}

// Collection of saved requests
export interface Collection {
  id: string;
  name: string;
  requests: SavedRequest[];
}

// Default/empty request for initialization
export function createEmptyRequest(): HttpRequest {
  return {
    url: '',
    method: 'GET',
    headers: [],
    queryParams: [],
    body: {
      type: 'none',
      content: '',
    },
    auth: {
      type: 'none',
    },
  };
}
