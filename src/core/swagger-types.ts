// Type definitions for OpenAPI 3.x and Swagger 2.0 specifications
// Simplified to only include what we need for conversion

export type OpenAPIVersion = '3.0' | '3.1' | '2.0';

export interface OpenAPISpec {
  openapi?: string; // OpenAPI 3.x
  swagger?: string; // Swagger 2.0
  info: Info;
  servers?: Server[]; // OpenAPI 3.x
  host?: string; // Swagger 2.0
  basePath?: string; // Swagger 2.0
  schemes?: string[]; // Swagger 2.0
  paths: Record<string, PathItem>;
  components?: Components; // OpenAPI 3.x
  securityDefinitions?: Record<string, SecurityScheme>; // Swagger 2.0
  security?: SecurityRequirement[];
}

export interface Info {
  title: string;
  version: string;
  description?: string;
}

export interface Server {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

export interface ServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface PathItem {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: Operation;
  put?: Operation;
  post?: Operation;
  delete?: Operation;
  options?: Operation;
  head?: Operation;
  patch?: Operation;
  trace?: Operation;
  parameters?: (Parameter | Reference)[];
}

export interface Operation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: (Parameter | Reference)[];
  requestBody?: RequestBody | Reference;
  responses: Record<string, Response | Reference>;
  security?: SecurityRequirement[];
  deprecated?: boolean;
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: Schema | Reference;
  content?: Record<string, MediaType>; // OpenAPI 3.x
  type?: string; // Swagger 2.0
  format?: string; // Swagger 2.0
  items?: Schema | Reference; // Swagger 2.0
  collectionFormat?: string; // Swagger 2.0
  default?: any; // Swagger 2.0
  enum?: any[]; // Swagger 2.0
}

export interface RequestBody {
  description?: string;
  content: Record<string, MediaType>;
  required?: boolean;
}

export interface MediaType {
  schema?: Schema | Reference;
  example?: any;
  examples?: Record<string, Example | Reference>;
  encoding?: Record<string, Encoding>;
}

export interface Schema {
  type?: string;
  format?: string;
  properties?: Record<string, Schema | Reference>;
  items?: Schema | Reference;
  required?: string[];
  enum?: any[];
  default?: any;
  example?: any;
  $ref?: string;
  allOf?: (Schema | Reference)[];
  oneOf?: (Schema | Reference)[];
  anyOf?: (Schema | Reference)[];
}

export interface Example {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
}

export interface Encoding {
  contentType?: string;
  headers?: Record<string, Header | Reference>;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export interface Header {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: Schema | Reference;
  content?: Record<string, MediaType>;
  example?: any;
  examples?: Record<string, Example | Reference>;
}

export interface Response {
  description: string;
  headers?: Record<string, Header | Reference>;
  content?: Record<string, MediaType>;
  links?: Record<string, Link | Reference>;
}

export interface Link {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, any>;
  requestBody?: any;
  description?: string;
  server?: Server;
}

export interface SecurityRequirement {
  [name: string]: string[];
}

export interface Components {
  schemas?: Record<string, Schema | Reference>;
  responses?: Record<string, Response | Reference>;
  parameters?: Record<string, Parameter | Reference>;
  examples?: Record<string, Example | Reference>;
  requestBodies?: Record<string, RequestBody | Reference>;
  headers?: Record<string, Header | Reference>;
  securitySchemes?: Record<string, SecurityScheme>;
  links?: Record<string, Link | Reference>;
  callbacks?: Record<string, Callback | Reference>;
}

export interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string; // apiKey
  in?: 'query' | 'header' | 'cookie'; // apiKey
  scheme?: string; // http (e.g., 'basic', 'bearer')
  bearerFormat?: string; // http bearer
  flows?: OAuthFlows; // oauth2
  openIdConnectUrl?: string; // openIdConnect
}

export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface Callback {
  [expression: string]: PathItem;
}

export interface Reference {
  $ref: string;
}

// Helper type for security schemes map
export type SecuritySchemeMap = Record<string, SecurityScheme>;

// Import options
export interface ImportOptions {
  organization?: 'tags' | 'paths' | 'single';
  parentId?: string;
}
