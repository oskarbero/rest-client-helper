# Testing Guide

## Overview

The REST Client uses Vitest as its testing framework. Tests are located alongside source files with `.test.ts` suffix.

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

Tests are organized to mirror the source structure:

```
src/
├── core/
│   ├── http-client.ts
│   ├── http-client.test.ts
│   ├── auth-handler.ts
│   ├── auth-handler.test.ts
│   └── ...
└── __tests__/
    └── test-utils.ts  # Shared test utilities
```

## Test Conventions

### Test File Naming

- Test files use `.test.ts` suffix
- Located alongside source files
- Example: `http-client.test.ts` tests `http-client.ts`

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

Located in `src/core/__tests__/test-utils.ts`:

- `createTestRequest()` - Creates test HTTP request
- `createTestAuthConfig()` - Creates test auth config
- `createTestKeyValue()` - Creates test key-value pair
- `createTestEnvironment()` - Creates test environment
- `createTestCollectionNode()` - Creates test collection node
- `createMockFetch()` - Creates mock fetch function
- `createTempDir()` - Creates temporary directory path

### Example Usage

```typescript
import { createTestRequest, createTestKeyValue } from './__tests__/test-utils';

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

## Example Test

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendRequest } from './http-client';
import { createTestRequest } from './__tests__/test-utils';

describe('http-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendRequest', () => {
    it('should send GET request with query parameters', async () => {
      // Arrange
      const request = createTestRequest({
        url: 'https://api.example.com/test',
        method: 'GET',
        queryParams: [
          { key: 'page', value: '1', enabled: true }
        ]
      });
      
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: async () => '{}'
      };
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse);
      
      // Act
      const result = await sendRequest(request);
      
      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test?page=1',
        expect.any(Object)
      );
      expect(result.status).toBe(200);
    });
  });
});
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
