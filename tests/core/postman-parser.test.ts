import { describe, it, expect } from 'vitest';
import { parsePostmanCollection } from '@core/postman-parser';
import type { CollectionNode, HttpRequest, KeyValuePair } from '@core/types';

describe('postman-parser', () => {
  describe('parsePostmanCollection', () => {
    describe('validation', () => {
      it('should throw when input is not an object', () => {
        expect(() => parsePostmanCollection(null)).toThrow('Invalid Postman collection: not an object');
        expect(() => parsePostmanCollection(undefined)).toThrow('Invalid Postman collection: not an object');
        expect(() => parsePostmanCollection('')).toThrow('Invalid Postman collection: not an object');
        expect(() => parsePostmanCollection(42)).toThrow('Invalid Postman collection: not an object');
      });

      it('should throw when item is missing', () => {
        expect(() => parsePostmanCollection({})).toThrow('missing or invalid "item" array');
        expect(() => parsePostmanCollection({ info: { name: 'Test' } })).toThrow('missing or invalid "item" array');
      });

      it('should throw when item is not an array', () => {
        expect(() => parsePostmanCollection({ item: {} })).toThrow('missing or invalid "item" array');
        expect(() => parsePostmanCollection({ item: null })).toThrow('missing or invalid "item" array');
      });
    });

    describe('root collection', () => {
      it('should return one root collection with name from info.name', () => {
        const json = {
          info: { name: 'My API', _postman_id: 'abc' },
          item: [],
        };
        const result = parsePostmanCollection(json);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('collection');
        expect(result[0].name).toBe('My API');
        expect(result[0].children).toEqual([]);
      });

      it('should use default name when info.name is missing', () => {
        const json = { item: [] };
        const result = parsePostmanCollection(json);
        expect(result[0].name).toBe('Imported Postman Collection');
      });

      it('should assign id, createdAt, updatedAt to root', () => {
        const json = { info: { name: 'R' }, item: [] };
        const result = parsePostmanCollection(json);
        expect(result[0].id).toMatch(/^node_\d+_[a-z0-9]+$/);
        expect(result[0].createdAt).toBeDefined();
        expect(result[0].updatedAt).toBeDefined();
      });
    });

    describe('request items', () => {
      it('should parse a single request with string URL and method', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'Get Users',
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const root = result[0];
        expect(root.children).toHaveLength(1);
        const reqNode = root.children![0];
        expect(reqNode.type).toBe('request');
        expect(reqNode.name).toBe('Get Users');
        expect(reqNode.request).toBeDefined();
        const req = reqNode.request!;
        expect(req.method).toBe('GET');
        expect(req.url).toBe('https://api.example.com/users');
      });

      it('should default to GET when method is missing', () => {
        const json = {
          info: { name: 'C' },
          item: [{ name: 'R', request: { url: 'https://example.com' } }],
        };
        const result = parsePostmanCollection(json);
        const req = (result[0].children![0] as CollectionNode).request!;
        expect(req.method).toBe('GET');
      });

      it('should parse request with URL object', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'POST',
                url: {
                  protocol: 'https',
                  host: ['api', 'example', 'com'],
                  path: ['v1', 'users'],
                  port: '443',
                  query: [{ key: 'page', value: '1' }],
                },
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const req = result[0].children![0].request! as HttpRequest;
        expect(req.method).toBe('POST');
        expect(req.url).toContain('https://');
        expect(req.url).toContain('api.example.com');
        expect(req.url).toContain('/v1/users');
        expect(req.url).toContain('page=1');
        expect(req.queryParams).toHaveLength(1);
        expect(req.queryParams[0]).toMatchObject({ key: 'page', value: '1', enabled: true });
      });

      it('should parse headers from array', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'GET',
                url: 'https://example.com',
                header: [
                  { key: 'Accept', value: 'application/json' },
                  { key: 'X-Custom', value: 'foo' },
                ],
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const headers = result[0].children![0].request!.headers as KeyValuePair[];
        expect(headers).toHaveLength(2);
        expect(headers[0]).toMatchObject({ key: 'Accept', value: 'application/json', enabled: true });
        expect(headers[1]).toMatchObject({ key: 'X-Custom', value: 'foo', enabled: true });
      });

      it('should parse headers from string', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'GET',
                url: 'https://example.com',
                header: 'Content-Type: application/json\nAuthorization: Bearer xyz',
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const headers = result[0].children![0].request!.headers as KeyValuePair[];
        expect(headers.length).toBeGreaterThanOrEqual(2);
        expect(headers.some((h) => h.key === 'Content-Type' && h.value === 'application/json')).toBe(true);
        expect(headers.some((h) => h.key === 'Authorization' && h.value === 'Bearer xyz')).toBe(true);
      });

      it('should skip disabled headers', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'GET',
                url: 'https://example.com',
                header: [
                  { key: 'A', value: '1' },
                  { key: 'B', value: '2', disabled: true },
                ],
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const headers = result[0].children![0].request!.headers;
        expect(headers).toHaveLength(1);
        expect(headers[0].key).toBe('A');
      });
    });

    describe('body', () => {
      it('should parse raw JSON body', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'POST',
                url: 'https://example.com',
                body: { mode: 'raw', raw: '{"name":"test"}' },
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const body = result[0].children![0].request!.body;
        expect(body.type).toBe('json');
        expect(body.content).toBe('{"name":"test"}');
      });

      it('should parse raw text body', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'POST',
                url: 'https://example.com',
                body: { mode: 'raw', raw: 'plain text' },
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const body = result[0].children![0].request!.body;
        expect(body.type).toBe('text');
        expect(body.content).toBe('plain text');
      });

      it('should parse urlencoded body as form-data', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'POST',
                url: 'https://example.com',
                body: {
                  mode: 'urlencoded',
                  urlencoded: [
                    { key: 'user', value: 'john' },
                    { key: 'pass', value: 'secret' },
                  ],
                },
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const body = result[0].children![0].request!.body;
        expect(body.type).toBe('form-data');
        expect(body.content).toContain('user');
        expect(body.content).toContain('john');
        expect(body.content).toContain('pass');
        expect(body.content).toContain('secret');
      });

      it('should parse formdata body as form-data', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'POST',
                url: 'https://example.com',
                body: {
                  mode: 'formdata',
                  formdata: [{ key: 'file', value: 'data', type: 'text' }],
                },
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const body = result[0].children![0].request!.body;
        expect(body.type).toBe('form-data');
        expect(body.content).toContain('file');
        expect(body.content).toContain('data');
      });

      it('should return none body when body is missing', () => {
        const json = {
          info: { name: 'C' },
          item: [{ name: 'R', request: { method: 'GET', url: 'https://example.com' } }],
        };
        const result = parsePostmanCollection(json);
        expect(result[0].children![0].request!.body).toMatchObject({ type: 'none', content: '' });
      });
    });

    describe('auth', () => {
      it('should parse basic auth', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'GET',
                url: 'https://example.com',
                auth: {
                  type: 'basic',
                  basic: [{ username: 'user1', password: 'pass1' }],
                },
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const auth = result[0].children![0].request!.auth;
        expect(auth.type).toBe('basic');
        expect(auth.basic).toEqual({ username: 'user1', password: 'pass1' });
      });

      it('should parse basic auth as single object', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'GET',
                url: 'https://example.com',
                auth: {
                  type: 'basic',
                  basic: { username: 'u', password: 'p' },
                },
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const auth = result[0].children![0].request!.auth;
        expect(auth.type).toBe('basic');
        expect(auth.basic).toEqual({ username: 'u', password: 'p' });
      });

      it('should parse bearer auth', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'GET',
                url: 'https://example.com',
                auth: {
                  type: 'bearer',
                  bearer: [{ key: 'token', value: 'my-jwt-token' }],
                },
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const auth = result[0].children![0].request!.auth;
        expect(auth.type).toBe('bearer');
        expect(auth.bearer).toEqual({ token: 'my-jwt-token' });
      });

      it('should parse apikey auth with in header', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'GET',
                url: 'https://example.com',
                auth: {
                  type: 'apikey',
                  apikey: { key: 'X-API-Key', value: 'secret', in: 'header' },
                },
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const auth = result[0].children![0].request!.auth;
        expect(auth.type).toBe('api-key');
        expect(auth.apiKey).toMatchObject({ key: 'X-API-Key', value: 'secret', addTo: 'header' });
      });

      it('should parse apikey auth with in query', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'GET',
                url: 'https://example.com',
                auth: { type: 'apikey', apikey: { key: 'api_key', value: 'v', in: 'query' } },
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const auth = result[0].children![0].request!.auth;
        expect(auth.type).toBe('api-key');
        expect(auth.apiKey?.addTo).toBe('query');
      });

      it('should map noauth to type none', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'GET',
                url: 'https://example.com',
                auth: { type: 'noauth' },
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        expect(result[0].children![0].request!.auth.type).toBe('none');
      });

      it('should map unsupported auth type to none', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'R',
              request: {
                method: 'GET',
                url: 'https://example.com',
                auth: { type: 'hawk' },
              },
            },
          ],
        };
        const result = parsePostmanCollection(json);
        expect(result[0].children![0].request!.auth.type).toBe('none');
      });
    });

    describe('folders', () => {
      it('should parse folder with nested requests', () => {
        const json = {
          info: { name: 'Root' },
          item: [
            {
              name: 'Users',
              item: [
                {
                  name: 'List Users',
                  request: { method: 'GET', url: 'https://api.example.com/users' },
                },
                {
                  name: 'Create User',
                  request: { method: 'POST', url: 'https://api.example.com/users' },
                },
              ],
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const root = result[0];
        expect(root.children).toHaveLength(1);
        const folder = root.children![0];
        expect(folder.type).toBe('collection');
        expect(folder.name).toBe('Users');
        expect(folder.children).toHaveLength(2);
        expect(folder.children![0].type).toBe('request');
        expect(folder.children![0].name).toBe('List Users');
        expect(folder.children![0].request!.method).toBe('GET');
        expect(folder.children![1].type).toBe('request');
        expect(folder.children![1].name).toBe('Create User');
        expect(folder.children![1].request!.method).toBe('POST');
      });

      it('should parse nested folders', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'Level1',
              item: [
                {
                  name: 'Level2',
                  item: [
                    {
                      name: 'Deep Request',
                      request: { method: 'GET', url: 'https://example.com/deep' },
                    },
                  ],
                },
              ],
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const l1 = result[0].children![0];
        const l2 = l1.children![0];
        const req = l2.children![0];
        expect(l1.name).toBe('Level1');
        expect(l2.name).toBe('Level2');
        expect(req.name).toBe('Deep Request');
        expect(req.request!.url).toBe('https://example.com/deep');
      });

      it('should skip items with neither request nor item', () => {
        const json = {
          info: { name: 'C' },
          item: [
            { name: 'Valid', request: { url: 'https://example.com' } },
            { name: 'NoRequest' },
          ],
        };
        const result = parsePostmanCollection(json);
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children![0].name).toBe('Valid');
      });
    });

    describe('collection-level auth', () => {
      it('should set root settings.auth when collection has auth', () => {
        const json = {
          info: { name: 'C' },
          auth: { type: 'bearer', bearer: [{ key: 'token', value: 'global-token' }] },
          item: [{ name: 'R', request: { method: 'GET', url: 'https://example.com' } }],
        };
        const result = parsePostmanCollection(json);
        expect(result[0].settings?.auth?.type).toBe('bearer');
        expect(result[0].settings?.auth?.bearer?.token).toBe('global-token');
      });

      it('should set folder settings.auth when folder has auth', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'Secure Folder',
              auth: { type: 'basic', basic: { username: 'f', password: 'p' } },
              item: [{ name: 'R', request: { method: 'GET', url: 'https://example.com' } }],
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const folder = result[0].children![0];
        expect(folder.settings?.auth?.type).toBe('basic');
        expect(folder.settings?.auth?.basic).toEqual({ username: 'f', password: 'p' });
      });
    });

    describe('request with shorthand url string', () => {
      it('should accept request.url as only property (Postman shorthand)', () => {
        const json = {
          info: { name: 'C' },
          item: [
            {
              name: 'Echo',
              request: 'https://echo.example.com/get',
            },
          ],
        };
        const result = parsePostmanCollection(json);
        const req = result[0].children![0].request!;
        expect(req.url).toBe('https://echo.example.com/get');
        expect(req.method).toBe('GET');
      });
    });

    describe('v2.0 style info', () => {
      it('should accept collection with info.schema (v2.1)', () => {
        const json = {
          info: { name: 'API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
          item: [{ name: 'R', request: { url: 'https://example.com' } }],
        };
        const result = parsePostmanCollection(json);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('API');
        expect(result[0].children).toHaveLength(1);
      });

      it('should accept collection with info._postman_id (v2.0)', () => {
        const json = {
          info: { name: 'API', _postman_id: 'abc-123' },
          item: [],
        };
        const result = parsePostmanCollection(json);
        expect(result[0].name).toBe('API');
      });
    });
  });
});
