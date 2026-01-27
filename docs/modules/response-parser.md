# Response Parser Module

## Purpose

The `response-parser` module formats and parses HTTP response bodies. It supports JSON and XML pretty-printing, content type detection, and JSON tokenization for syntax highlighting.

## Key Concepts

- **Content Type Detection**: Detects JSON, XML, HTML, or text from headers and content
- **Pretty Printing**: Formats JSON and XML with proper indentation
- **Tokenization**: Breaks down JSON into tokens for syntax highlighting
- **Graceful Fallback**: Returns original content if parsing fails

## Public API

### `detectContentType(contentType: string, body: string): 'json' | 'xml' | 'html' | 'text'`

Detects the content type from headers or content inspection.

**Parameters:**
- `contentType`: Content-Type header value
- `body`: Response body content

**Returns:** Detected content type

**Example:**
```typescript
import { detectContentType } from './response-parser';

const type1 = detectContentType('application/json', '{}');
// Returns: 'json'

const type2 = detectContentType('text/plain', '{"key": "value"}');
// Returns: 'json' (detected from content)

const type3 = detectContentType('application/xml', '<root></root>');
// Returns: 'xml'
```

### `formatJson(json: string): string`

Pretty-prints JSON with proper indentation.

**Parameters:**
- `json`: JSON string to format

**Returns:** Formatted JSON string

**Example:**
```typescript
import { formatJson } from './response-parser';

const formatted = formatJson('{"name":"John","age":30}');
// Returns: '{\n  "name": "John",\n  "age": 30\n}'
```

### `formatXml(xml: string): string`

Pretty-prints XML with proper indentation.

**Parameters:**
- `xml`: XML string to format

**Returns:** Formatted XML string

### `formatResponseBody(body: string, contentType: string): string`

Formats response body based on content type.

**Parameters:**
- `body`: Response body content
- `contentType`: Content-Type header value

**Returns:** Formatted body string

**Example:**
```typescript
import { formatResponseBody } from './response-parser';

const formatted = formatResponseBody(
  '{"name":"John"}',
  'application/json'
);
// Returns formatted JSON
```

### `tokenizeJson(json: string): Token[]`

Tokenizes JSON for syntax highlighting.

**Parameters:**
- `json`: JSON string to tokenize

**Returns:** Array of tokens with type and value

**Token Types:**
- `key`: JSON object keys
- `string`: String values
- `number`: Numeric values
- `boolean`: true/false values
- `null`: null values
- `punctuation`: Brackets, commas, colons
- `text`: Whitespace and other characters

**Example:**
```typescript
import { tokenizeJson } from './response-parser';

const tokens = tokenizeJson('{"name": "John"}');
// Returns: [
//   { type: 'punctuation', value: '{' },
//   { type: 'key', value: '"name"' },
//   { type: 'punctuation', value: ':' },
//   { type: 'string', value: '"John"' },
//   { type: 'punctuation', value: '}' }
// ]
```

### `getHighlightedTokens(body: string, contentType: string): Token[] | null`

Returns tokens for syntax-highlighted display.

**Parameters:**
- `body`: Response body content
- `contentType`: Content-Type header value

**Returns:** Array of tokens or null if not JSON

**Example:**
```typescript
import { getHighlightedTokens } from './response-parser';

const tokens = getHighlightedTokens('{"key": "value"}', 'application/json');
// Returns array of tokens for highlighting
```

## Dependencies

- `types.ts` - Token, TokenType definitions (exported from this module)

## Data Flow

1. **Content Type Detection**:
   - Check Content-Type header for JSON/XML/HTML indicators
   - If ambiguous, inspect content (starts with { or [ for JSON, < for XML)
   - Default to 'text' if unknown

2. **Formatting**:
   - JSON: Parse and stringify with 2-space indentation
   - XML: Parse tags and add indentation based on nesting level
   - Text: Return as-is

3. **Tokenization**:
   - Parse JSON character by character
   - Identify tokens based on context (key vs value)
   - Return array of tokens with type and value

## Edge Cases

- **Invalid JSON**: formatJson returns original string if parsing fails
- **Invalid XML**: formatXml returns original string if parsing fails
- **Empty content**: Returns empty string
- **Ambiguous content type**: Tries to detect from content if header is ambiguous
- **Non-JSON content**: getHighlightedTokens returns null
- **Malformed JSON**: tokenizeJson handles gracefully, may produce unexpected tokens

## Related Modules

- [http-client.md](./http-client.md) - Provides response body and content type
