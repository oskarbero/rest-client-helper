# Env Parser Module

## Purpose

The `env-parser` module parses `.env` file content and converts it to an array of environment variables. It supports standard .env file format with quoted values, comments, and escape sequences.

## Key Concepts

- **KEY=value Format**: Standard .env file format
- **Quoted Values**: Supports single and double quotes
- **Comment Lines**: Lines starting with # are ignored
- **Escape Sequences**: Handles escaped quotes and newlines
- **Whitespace Trimming**: Trims whitespace from keys and values

## Public API

### `parseEnvFile(content: string): EnvironmentVariable[]`

Parses a .env file content and returns an array of environment variables.

**Parameters:**
- `content`: The content of the .env file

**Returns:** Array of EnvironmentVariable objects

**Example:**
```typescript
import { parseEnvFile } from './env-parser';

const content = `
# API Configuration
API_URL=https://api.example.com
API_KEY=secret123

# Database
DB_HOST=localhost
DB_PORT=5432
`;

const variables = parseEnvFile(content);
// Returns: [
//   { key: 'API_URL', value: 'https://api.example.com' },
//   { key: 'API_KEY', value: 'secret123' },
//   { key: 'DB_HOST', value: 'localhost' },
//   { key: 'DB_PORT', value: '5432' }
// ]
```

## Dependencies

- `types.ts` - EnvironmentVariable type

## Data Flow

1. **Split Lines**: Split content by line breaks (handles CRLF and LF)
2. **Process Each Line**:
   - Trim whitespace
   - Skip empty lines
   - Skip comment lines (starting with #)
   - Find equals sign
   - Extract key (before =) and value (after =)
   - Trim both key and value
3. **Handle Quoted Values**:
   - Check if value is quoted (single or double)
   - Remove quotes
   - Unescape escape sequences (\", \', \n, \r)
4. **Return Variables**: Return array of key-value pairs

## Edge Cases

- **Empty content**: Returns empty array
- **Null/undefined**: Returns empty array
- **No equals sign**: Line is skipped
- **Empty key**: Line is skipped
- **Quoted values**: Quotes are removed, escape sequences are unescaped
- **Unquoted values with spaces**: Spaces are preserved
- **Multiple equals signs**: Everything after first = is treated as value
- **Windows line endings**: Handles CRLF (\r\n)
- **Unix line endings**: Handles LF (\n)

## Related Modules

- [storage.md](./storage.md) - Uses parsed variables to create/update environments
