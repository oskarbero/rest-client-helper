import {
  CollectionNode,
  HttpRequest,
  AuthConfig,
  KeyValuePair,
  RequestBody,
  CollectionSettings,
  HttpMethod,
} from '../types';
import { createEmptyRequest } from '../types';

// Postman collection v2.0 / v2.1 type definitions
interface PostmanInfo {
  name?: string;
  _postman_id?: string;
  schema?: string;
  description?: string;
}

interface PostmanUrlQuery {
  key?: string;
  value?: string;
  disabled?: boolean;
}

interface PostmanUrlObject {
  raw?: string;
  protocol?: string;
  host?: string | string[];
  path?: string | string[];
  port?: string;
  query?: PostmanUrlQuery[];
  variable?: Array<{ key?: string; value?: string }>;
}

interface PostmanHeader {
  key?: string;
  value?: string;
  disabled?: boolean;
}

interface PostmanBodyFormParam {
  key?: string;
  value?: string;
  type?: string;
  disabled?: boolean;
}

interface PostmanBody {
  mode?: 'raw' | 'urlencoded' | 'formdata';
  raw?: string;
  urlencoded?: PostmanBodyFormParam[];
  formdata?: PostmanBodyFormParam[];
  options?: { raw?: { language?: string } };
}

interface PostmanAuthBasic {
  username?: string;
  password?: string;
}

interface PostmanAuthBearer {
  key?: string;
  value?: string;
  type?: string;
}

interface PostmanAuthApikey {
  key?: string;
  value?: string;
  in?: 'query' | 'header' | 'query';
}

interface PostmanAuth {
  type?: 'noauth' | 'basic' | 'bearer' | 'apikey' | string;
  basic?: PostmanAuthBasic[];
  bearer?: PostmanAuthBearer[];
  apikey?: PostmanAuthApikey[];
}

interface PostmanRequest {
  method?: string;
  url?: string | PostmanUrlObject;
  header?: PostmanHeader[] | string;
  body?: PostmanBody;
  auth?: PostmanAuth;
  description?: string | { content?: string };
}

interface PostmanItem {
  id?: string;
  name?: string;
  description?: string | { content?: string };
  request?: PostmanRequest | string;
  item?: PostmanItem[];
  auth?: PostmanAuth;
}

interface PostmanCollection {
  info?: PostmanInfo;
  item?: PostmanItem[];
  variable?: Array<{ key?: string; value?: string }>;
  auth?: PostmanAuth;
}

const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

function isHttpMethod(s: string): s is HttpMethod {
  return HTTP_METHODS.includes(s as HttpMethod);
}

/**
 * Parses a Postman collection (v2.0 or v2.1) and converts it to CollectionNode structures.
 */
export function parsePostmanCollection(json: unknown): CollectionNode[] {
  const root = json as PostmanCollection;
  if (!root || typeof root !== 'object') {
    throw new Error('Invalid Postman collection: not an object');
  }
  if (!Array.isArray(root.item)) {
    throw new Error('Invalid Postman collection: missing or invalid "item" array');
  }

  const now = new Date().toISOString();
  const rootName = root.info?.name || 'Imported Postman Collection';
  const rootAuth = root.auth ? mapPostmanAuth(root.auth) : undefined;

  const rootCollection: CollectionNode = {
    id: generateId(),
    name: rootName,
    type: 'collection',
    createdAt: now,
    updatedAt: now,
    children: [],
    settings:
      rootAuth && rootAuth.type !== 'none'
        ? { auth: rootAuth }
        : undefined,
  };

  for (const item of root.item) {
    const child = processItem(item, now, rootAuth);
    if (child) {
      rootCollection.children!.push(child);
    }
  }

  return [rootCollection];
}

function processItem(
  item: PostmanItem,
  now: string,
  parentAuth?: AuthConfig
): CollectionNode | null {
  const name = item.name || 'Unnamed';

  if (Array.isArray(item.item)) {
    const folderAuth = item.auth ? mapPostmanAuth(item.auth) : parentAuth;
    const folder: CollectionNode = {
      id: generateId(),
      name,
      type: 'collection',
      createdAt: now,
      updatedAt: now,
      children: [],
      settings:
        folderAuth && folderAuth.type !== 'none'
          ? { auth: folderAuth }
          : undefined,
    };
    for (const sub of item.item) {
      const child = processItem(sub, now, folderAuth);
      if (child) {
        folder.children!.push(child);
      }
    }
    return folder;
  }

  const request = item.request;
  if (!request) {
    return null;
  }

  const reqObj =
    typeof request === 'string' ? { url: request, method: 'GET' } : request;
  const auth = reqObj.auth ? mapPostmanAuth(reqObj.auth) : parentAuth;
  const httpRequest = mapPostmanRequestToHttpRequest(reqObj);

  return {
    id: generateId(),
    name,
    type: 'request',
    createdAt: now,
    updatedAt: now,
    request: httpRequest,
  };
}

function mapPostmanRequestToHttpRequest(req: PostmanRequest): HttpRequest {
  const out = createEmptyRequest();

  out.method = req.method && isHttpMethod(req.method.toUpperCase())
    ? req.method.toUpperCase() as HttpMethod
    : 'GET';
  out.url = buildUrl(req.url);
  out.headers = parseHeaders(req.header);
  out.queryParams = parseQueryFromUrl(req.url);
  out.body = mapPostmanBody(req.body);
  out.auth = req.auth ? mapPostmanAuth(req.auth) : { type: 'none' };

  return out;
}

function buildUrl(url: string | PostmanUrlObject | undefined): string {
  if (url == null) {
    return '';
  }
  if (typeof url === 'string') {
    return url.trim();
  }

  const protocol = url.protocol || 'https';
  const hostPart = Array.isArray(url.host)
    ? url.host.join('.')
    : (url.host || '');
  const pathPart = Array.isArray(url.path)
    ? '/' + url.path.join('/').replace(/^\/+/, '')
    : (url.path ? (url.path as string).replace(/^\/+/, '/') : '');
  const portPart = url.port ? `:${url.port}` : '';
  const queryPart =
    url.query && url.query.length > 0
      ? '?' +
        url.query
          .filter((q) => !q.disabled && (q.key != null || q.value != null))
          .map((q) => {
            const k = encodeURIComponent(q.key ?? '');
            const v = encodeURIComponent(q.value ?? '');
            return `${k}=${v}`;
          })
          .join('&')
      : '';

  const pathNormalized = pathPart.replace(/\/+/g, '/').replace(/^\/+/, '/');
  return `${protocol}://${hostPart}${portPart}${pathNormalized}${queryPart}`;
}

function parseHeaders(
  header: PostmanHeader[] | string | undefined
): KeyValuePair[] {
  if (header == null) {
    return [];
  }
  if (typeof header === 'string') {
    return parseHeaderString(header);
  }
  if (!Array.isArray(header)) {
    return [];
  }
  return header
    .filter((h) => !h.disabled)
    .map((h) => ({
      key: h.key ?? '',
      value: h.value ?? '',
      enabled: true,
    }));
}

function parseHeaderString(headerStr: string): KeyValuePair[] {
  const pairs: KeyValuePair[] = [];
  const lines = headerStr.split(/\r?\n/);
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (key) {
        pairs.push({ key, value, enabled: true });
      }
    }
  }
  return pairs;
}

function parseQueryFromUrl(
  url: string | PostmanUrlObject | undefined
): KeyValuePair[] {
  if (url == null || typeof url === 'string') {
    return [];
  }
  const query = url.query;
  if (!Array.isArray(query)) {
    return [];
  }
  return query
    .filter((q) => !q.disabled)
    .map((q) => ({
      key: q.key ?? '',
      value: q.value ?? '',
      enabled: true,
    }));
}

function mapPostmanBody(body: PostmanBody | undefined): RequestBody {
  if (!body || !body.mode) {
    return { type: 'none', content: '' };
  }

  switch (body.mode) {
    case 'raw': {
      const raw = body.raw ?? '';
      const lang = body.options?.raw?.language;
      const isJson =
        lang === 'json' ||
        /^\s*[{\[]/.test(raw.trim());
      return {
        type: isJson ? 'json' : 'text',
        content: raw,
      };
    }
    case 'urlencoded':
    case 'formdata': {
      const list =
        body.mode === 'urlencoded'
          ? body.urlencoded
          : body.formdata;
      if (!Array.isArray(list)) {
        return { type: 'form-data', content: '' };
      }
      const lines = list
        .filter((p) => !p.disabled)
        .map((p) => `${encodeURIComponent(p.key ?? '')}=${encodeURIComponent(p.value ?? '')}`);
      return {
        type: 'form-data',
        content: lines.join('&'),
      };
    }
    default:
      return { type: 'none', content: '' };
  }
}

function mapPostmanAuth(auth: PostmanAuth): AuthConfig {
  const type = (auth.type || 'noauth').toLowerCase();
  if (type === 'noauth') {
    return { type: 'none' };
  }

  switch (type) {
    case 'basic': {
      const basic = auth.basic;
      if (Array.isArray(basic) && basic.length > 0) {
        const b = basic[0];
        return {
          type: 'basic',
          basic: {
            username: b.username ?? '',
            password: b.password ?? '',
          },
        };
      }
      if (basic && typeof basic === 'object' && !Array.isArray(basic)) {
        const b = basic as PostmanAuthBasic;
        return {
          type: 'basic',
          basic: {
            username: b.username ?? '',
            password: b.password ?? '',
          },
        };
      }
      return { type: 'basic', basic: { username: '', password: '' } };
    }
    case 'bearer': {
      const bearer = auth.bearer;
      if (Array.isArray(bearer) && bearer.length > 0) {
        const tokenEntry = bearer.find((b) => (b.key || '').toLowerCase() === 'token') ?? bearer[0];
        return {
          type: 'bearer',
          bearer: {
            token: tokenEntry.value ?? '',
          },
        };
      }
      if (bearer && typeof bearer === 'object' && !Array.isArray(bearer)) {
        const b = bearer as PostmanAuthBearer;
        return {
          type: 'bearer',
          bearer: { token: b.value ?? '' },
        };
      }
      return { type: 'bearer', bearer: { token: '' } };
    }
    case 'apikey': {
      const apikey = auth.apikey;
      if (Array.isArray(apikey) && apikey.length > 0) {
        const keyEntry = apikey.find((a) => (a.key || '').toLowerCase() === 'key') ?? apikey[0];
        const valueEntry = apikey.find((a) => (a.key || '').toLowerCase() === 'value') ?? apikey[1] ?? apikey[0];
        const addTo =
          (valueEntry?.key?.toLowerCase() === 'value' || keyEntry?.key?.toLowerCase() === 'key')
            ? (apikey.find((a) => (a.key || '').toLowerCase() === 'in')?.value?.toLowerCase() === 'query'
                ? 'query'
                : 'header')
            : 'header';
        return {
          type: 'api-key',
          apiKey: {
            key: keyEntry?.value ?? 'apikey',
            value: valueEntry?.value ?? '',
            addTo: addTo as 'header' | 'query',
          },
        };
      }
      if (apikey && typeof apikey === 'object' && !Array.isArray(apikey)) {
        const a = apikey as PostmanAuthApikey;
        return {
          type: 'api-key',
          apiKey: {
            key: a.key ?? '',
            value: a.value ?? '',
            addTo: a.in === 'query' ? 'query' : 'header',
          },
        };
      }
      return { type: 'none' };
    }
    default:
      return { type: 'none' };
  }
}

function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
