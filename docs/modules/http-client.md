# HTTP Client Module

## Purpose

The `http-client` module is responsible for executing HTTP requests and returning formatted responses. It handles URL construction, header management, body preparation, and response parsing.

## Key Concepts

- **Request Building**: Constructs complete HTTP requests from `HttpRequest` objects
- **Query Parameter Handling**: Merges query parameters and auth query params into URLs
- **Header Merging**: Combines user headers with auth headers (user headers take precedence)
- **Body Management**: Sets appropriate Content-Type headers based on body type
- **Error Handling**: Returns error responses with status 0 for network/validation errors
- **Response Parsing**: Extracts status, headers, body, content type, duration, and size

## Public API

### `sendRequest(request: HttpRequest, signal?: AbortSignal): Promise<HttpResponse>`

Sends an HTTP request and returns the response.

**Parameters:**
- `request`: Complete HTTP request configuration
- `signal`: Optional AbortSignal for request cancellation

**Returns:** Promise resolving to `HttpResponse` object

**Example:**
```typescript
import { sendRequest } from './http-client';
import { createEmptyRequest } from './types';

const request = {
  ...createEmptyRequest(),
  url: 'https://api.example.com/users',
  method: 'GET',
  headers: [
    { key: 'X-Custom-Header', value: 'value', enabled: true }
  ],
  queryParams: [
    { key: 'page', value: '1', enabled: true }
  ]
};

const response = await sendRequest(request);
console.log(response.status); // 200
console.log(response.body); // Response body as string
```

## Dependencies

- `types.ts` - HttpRequest, HttpResponse, KeyValuePair types
- `auth-handler.ts` - generateAuthHeaders, generateAuthQueryParam
- `constants.ts` - CONFIG for timeout and size limits
- `utils.ts` - isValidUrl for URL validation

## Data Flow

1. **Input**: HttpRequest object with URL, method, headers, query params, body, auth
2. **Query Params**: Merge request query params with auth query params (if API key in query)
3. **URL Building**: Construct final URL with query parameters, handle protocol defaults
4. **Header Building**: 
   - Extract enabled headers from request
   - Add auth headers (if not manually set by user)
   - Set Content-Type based on body type (if not set)
5. **Request Execution**: Call fetch API with constructed URL and options
6. **Response Processing**: Extract status, headers, body, calculate duration and size
7. **Output**: HttpResponse object with all response data

## Edge Cases

- **Empty URL**: Returns error response with status 0
- **Invalid URL**: Returns error response with status 0
- **URL without protocol**: Automatically adds `https://` prefix
- **Network errors**: Returns error response with status 0 and error message
- **Timeout**: Request is aborted after CONFIG.REQUEST_TIMEOUT_MS
- **Large responses**: Warns if response exceeds CONFIG.MAX_RESPONSE_SIZE
- **Disabled headers/params**: Only enabled items are included in request
- **Manual auth headers**: User-set auth headers take precedence over auto-generated ones

## Related Modules

- [auth-handler.md](./auth-handler.md) - Authentication handling
- [variable-replacer.md](./variable-replacer.md) - Variable replacement (used before sending)
- [response-parser.md](./response-parser.md) - Response formatting (used after receiving)
