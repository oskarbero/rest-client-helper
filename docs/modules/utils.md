# Utils Module

## Purpose

The `utils` module provides utility functions used across the codebase. These are pure, reusable functions for common operations.

## Key Concepts

- **Tree Traversal**: Recursive tree search functions
- **URL Validation**: Validates URLs with protocol checking
- **Deep Equality**: Recursive object/array comparison

## Public API

### `findNodeById(nodes: CollectionNode[], id: string): CollectionNode | null`

Recursively finds a node by ID in the tree.

**Parameters:**
- `nodes`: Root collection nodes
- `id`: Node ID to find

**Returns:** Found node or null

**Example:**
```typescript
import { findNodeById } from './utils';

const nodes = [
  {
    id: 'root',
    type: 'collection',
    children: [
      { id: 'child', type: 'collection', children: [] }
    ]
  }
];

const node = findNodeById(nodes, 'child');
// Returns: child node object
```

### `isValidUrl(url: string): boolean`

Validates if a URL is valid and uses http/https protocol.

**Parameters:**
- `url`: URL string to validate

**Returns:** true if valid, false otherwise

**Example:**
```typescript
import { isValidUrl } from './utils';

isValidUrl('https://example.com'); // true
isValidUrl('http://example.com'); // true
isValidUrl('example.com'); // true (adds https://)
isValidUrl('ftp://example.com'); // false
isValidUrl(''); // false
```

### `deepEqual(obj1: any, obj2: any): boolean`

Deep equality check for objects and arrays.

**Parameters:**
- `obj1`: First object/array
- `obj2`: Second object/array

**Returns:** true if deeply equal, false otherwise

**Example:**
```typescript
import { deepEqual } from './utils';

deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }); // true
deepEqual([1, 2, 3], [1, 2, 3]); // true
deepEqual({ a: 1 }, { a: 2 }); // false
```

## Dependencies

- `types.ts` - CollectionNode type

## Data Flow

1. **findNodeById**:
   - Iterate through nodes
   - Check if current node matches ID
   - If not, recursively search children
   - Return found node or null

2. **isValidUrl**:
   - Check if URL is empty or whitespace
   - Try to create URL object
   - If fails, try adding https:// prefix
   - Check if protocol is http: or https:
   - Return validation result

3. **deepEqual**:
   - Check reference equality first
   - Check null/undefined
   - Check type equality
   - For objects: compare keys and recursively compare values
   - For arrays: compare length and recursively compare elements

## Edge Cases

- **Empty tree**: findNodeById returns null
- **Non-existent ID**: findNodeById returns null
- **URL without protocol**: isValidUrl adds https:// and validates
- **Protocol-relative URL**: isValidUrl handles //example.com
- **Same reference**: deepEqual returns true immediately
- **Different types**: deepEqual returns false
- **Nested structures**: deepEqual handles deeply nested objects/arrays

## Related Modules

- [storage.md](./storage.md) - Uses findNodeById
- [http-client.md](./http-client.md) - Uses isValidUrl
