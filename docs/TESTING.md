# Testing Guide

## Overview

The REST Client uses Vitest as its testing framework. Unit tests live in a dedicated **tests/** directory, separate from implementation under **src/**. Vitest is configured via **vitest.config.ts** at the project root; the `test` scripts in package.json run tests from `tests/**`. Visual regression tests live in a separate sibling project (see [Visual Regression Testing](#visual-regression-testing)).

## Visual Regression Testing

Visual regression tests capture screenshots of the app and compare them against baselines to catch unintended UI changes. They run in a **separate project** so test tooling and baselines stay out of the main app.

- **Location**: Sibling project `rest-client-visual-tests` (same workspace root as `rest-client`).
- **When to run**: After UI changes or vibe coding sessions to verify the interface still looks correct.
- **How to run**: From the visual tests project:
  - `npm run test:all` — builds rest-client, then runs visual tests (recommended).
  - `npm test` — runs visual tests only (rest-client must already be built).
- **Usage and workflow**: See the [rest-client-visual-tests README](../../rest-client-visual-tests/README.md) for installation, creating/updating baselines, and reviewing visual diffs.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Structure

Tests live in **tests/** at the project root, split by layer. No test files live under **src/**.

```
tests/
├── core/              # Unit tests for src/core
│   └── utils.test.ts
└── renderer/          # Unit tests for src/renderer
    └── ErrorBoundary.test.tsx
```

- **tests/core/** — tests for `src/core` (pure logic, no React).
- **tests/renderer/** — tests for `src/renderer` (React components and renderer logic).

Use path aliases in tests: `@core/utils`, `@renderer/components/...` (same as in source).

## Test Conventions

### Test File Naming

- Test files use `.test.ts` or `.test.tsx` suffix.
- Located under **tests/core/** or **tests/renderer/** (not alongside source).
- Example: `tests/core/utils.test.ts` tests `src/core/utils.ts`.

### Test Organization

Tests use `describe` blocks to group related tests:

```typescript
describe('module-name', () => {
  describe('function-name', () => {
    it('should do something', () => {
      // test
    });
  });
});
```

### Test Naming

Use descriptive test names following the pattern:
- `should [expected behavior] when [condition]`
- Example: `should return error response when URL is invalid`

### Arrange-Act-Assert Pattern

All tests follow the AAA pattern:

```typescript
it('should do something', () => {
  // Arrange: Set up test data
  const input = createTestData();
  
  // Act: Execute the function
  const result = functionUnderTest(input);
  
  // Assert: Verify the result
  expect(result).toBe(expected);
});
```

## Test Utilities

### Test Data Factories

When you add shared test helpers, place them under **tests/** (e.g. `tests/test-utils.ts` or `tests/core/test-utils.ts`). Typical factories:

- `createTestRequest()` - Creates test HTTP request
- `createTestAuthConfig()` - Creates test auth config
- `createTestKeyValue()` - Creates test key-value pair
- `createTestEnvironment()` - Creates test environment
- `createTestCollectionNode()` - Creates test collection node
- `createMockFetch()` - Creates mock fetch function
- `createTempDir()` - Creates temporary directory path

### Example Usage

```typescript
import { createTestRequest, createTestKeyValue } from '../test-utils'; // or path to your test-utils

const request = createTestRequest({
  url: 'https://api.example.com/test',
  method: 'POST',
  headers: [createTestKeyValue('X-Custom', 'value', true)]
});
```

## Mocking Strategies

### Mocking Fetch

For HTTP client tests, mock the global `fetch`:

```typescript
import { vi } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch as any;

mockFetch.mockResolvedValue({
  status: 200,
  statusText: 'OK',
  headers: new Headers(),
  text: async () => '{}'
});
```

### Mocking File System

For storage tests, use temporary directories:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});
```

### Mocking Performance API

For timing tests:

```typescript
global.performance = {
  now: vi.fn(() => Date.now())
} as any;
```

## Coverage Goals

- **Minimum Coverage**: 70% for core modules
- **Critical Paths**: 90%+ coverage for:
  - HTTP client
  - Authentication handler
  - Variable replacement
  - Request resolution

## Test Categories

### Unit Tests

Test individual functions in isolation:
- Pure functions
- Business logic
- Data transformations

### Integration Tests

Test interactions between modules:
- IPC handlers with core modules
- File I/O operations
- Settings resolution flow

### Edge Case Tests

Test boundary conditions and error cases:
- Empty inputs
- Invalid inputs
- Network errors
- File I/O errors
- Missing data

## Writing New Tests

### Step 1: Identify What to Test

- Public API functions
- Critical business logic
- Error handling paths
- Edge cases

### Step 2: Write Test Cases

For each function, test:
- Happy path (normal operation)
- Edge cases (empty, null, boundary values)
- Error cases (invalid input, network errors)

### Step 3: Use Test Utilities

- Use test data factories
- Use temporary directories for file operations
- Mock external dependencies

### Step 4: Verify Coverage

Run coverage report and ensure:
- All branches are covered
- All error paths are tested
- Edge cases are covered

## Example Tests

**Core (tests/core/utils.test.ts):**

```typescript
import { describe, it, expect } from 'vitest';
import { isValidUrl, deepEqual, findNodeById } from '@core/utils';
import type { CollectionNode } from '@core/types';

describe('utils', () => {
  describe('isValidUrl', () => {
    it('should return true for https URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });
  });
  // ...
});
```

**Renderer (tests/renderer/ErrorBoundary.test.tsx):**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary } from '@renderer/components/ErrorBoundary';
// ...
```

## Debugging Tests

### Using Test UI

```bash
npm run test:ui
```

Opens Vitest UI in browser for interactive debugging.

### Debugging in VS Code

1. Set breakpoints in test files
2. Run "Debug Test" from test file
3. Step through code execution

## Continuous Integration

Tests should run in CI/CD pipeline:
- Run on every commit
- Fail build if tests fail
- Generate coverage reports
- Enforce coverage thresholds

## Best Practices

1. **Keep tests isolated**: Each test should be independent
2. **Use descriptive names**: Test names should explain what is being tested
3. **Test behavior, not implementation**: Focus on what the function does, not how
4. **Mock external dependencies**: Don't make real network calls or file operations
5. **Clean up**: Always clean up test data (temp files, mocks)
6. **Test edge cases**: Don't just test happy paths
7. **Maintain test data**: Keep test utilities up to date
