# Collection Settings Resolver Module

## Purpose

The `collection-settings-resolver` module resolves collection settings by walking up the parent chain and merging settings from ancestors. It handles settings inheritance where child collections can override parent settings.

## Key Concepts

- **Ancestor Path**: Finds the path of collection IDs from root to parent
- **Settings Merging**: Merges settings from multiple ancestors with child overriding parent
- **Inheritance**: Child settings override parent settings for same keys
- **Header Merging**: Case-insensitive header merging where child headers override parent

## Public API

### `getAncestorPath(nodes: CollectionNode[], nodeId: string): string[]`

Finds the path of ancestor collection IDs from root to the parent of the given node.

**Parameters:**
- `nodes`: Root collection nodes
- `nodeId`: ID of the node to find ancestors for

**Returns:** Array of collection IDs from root to parent

**Example:**
```typescript
import { getAncestorPath } from './collection-settings-resolver';

const nodes = [
  {
    id: 'root',
    type: 'collection',
    children: [
      {
        id: 'level1',
        type: 'collection',
        children: [
          { id: 'level2', type: 'collection', children: [] }
        ]
      }
    ]
  }
];

const path = getAncestorPath(nodes, 'level2');
// Returns: ['root', 'level1']
```

### `mergeSettings(...settingsArray: (CollectionSettings | undefined)[]): CollectionSettings`

Merges multiple collection settings objects, with later settings overriding earlier ones.

**Parameters:**
- `settingsArray`: Array of settings to merge (in order: parent to child)

**Returns:** Merged settings object

**Example:**
```typescript
import { mergeSettings } from './collection-settings-resolver';

const parent = {
  baseUrl: 'https://api.example.com',
  headers: [
    { key: 'X-Common', value: 'parent', enabled: true }
  ]
};

const child = {
  baseUrl: 'https://api.other.com',
  headers: [
    { key: 'X-Common', value: 'child', enabled: true },
    { key: 'X-Child-Only', value: 'child', enabled: true }
  ]
};

const merged = mergeSettings(parent, child);
// Returns: {
//   baseUrl: 'https://api.other.com', // child overrides
//   headers: [
//     { key: 'X-Common', value: 'child', enabled: true }, // child overrides
//     { key: 'X-Child-Only', value: 'child', enabled: true } // child only
//   ]
// }
```

### `resolveCollectionSettings(nodes: CollectionNode[], nodeId: string): CollectionSettings`

Resolves collection settings for a given node by checking its own settings and walking up the parent chain.

**Parameters:**
- `nodes`: Root collection nodes
- `nodeId`: ID of the node to resolve settings for

**Returns:** Resolved collection settings (merged from all ancestors)

**Example:**
```typescript
import { resolveCollectionSettings } from './collection-settings-resolver';

const nodes = [
  {
    id: 'root',
    type: 'collection',
    settings: { baseUrl: 'https://api.example.com' },
    children: [
      {
        id: 'child',
        type: 'collection',
        settings: { headers: [{ key: 'X-Custom', value: 'value', enabled: true }] },
        children: []
      }
    ]
  }
];

const settings = resolveCollectionSettings(nodes, 'child');
// Returns: {
//   baseUrl: 'https://api.example.com', // from root
//   headers: [{ key: 'X-Custom', value: 'value', enabled: true }] // from child
// }
```

### `findCollectionPath(nodes: CollectionNode[], nodeId: string): string[]`

Finds the collection path for a request node (all collection IDs from root to the request's parent).

**Parameters:**
- `nodes`: Root collection nodes
- `nodeId`: ID of the request node

**Returns:** Array of collection IDs from root to the request's parent collection

### `findParentCollectionId(nodes: CollectionNode[], nodeId: string): string | null`

Finds the parent collection ID for a given node.

**Parameters:**
- `nodes`: Root collection nodes
- `nodeId`: ID of the node

**Returns:** Parent collection ID, or null if at root level

## Dependencies

- `types.ts` - CollectionNode, CollectionSettings types

## Data Flow

1. **Find Node**: Locate the target node in the tree
2. **Get Ancestor Path**: Find all ancestor collection IDs from root to parent
3. **Collect Settings**: Gather settings from each ancestor (in order)
4. **Add Node Settings**: If node is a collection, add its settings last
5. **Merge**: Merge all settings with child overriding parent
6. **Return**: Return merged settings object

## Edge Cases

- **Root level node**: Returns empty array for ancestor path
- **Non-existent node**: Returns empty settings object
- **Request node**: Request nodes don't have settings, only collections do
- **Missing settings**: Undefined settings are skipped during merge
- **Empty baseUrl**: Empty baseUrl in child doesn't override parent's baseUrl
- **None auth type**: Child's 'none' auth doesn't override parent's auth
- **Case-insensitive headers**: Header keys are compared case-insensitively

## Related Modules

- [storage.md](./storage.md) - Provides collection tree structure
- [variable-replacer.md](./variable-replacer.md) - Uses resolved settings for request resolution
