# Test Suite Documentation

This project has multiple types of tests organized by their requirements and purposes.

## Test Categories

### Unit Tests (`tests/unit/`)
- **Purpose**: Test individual components in isolation with mocked dependencies
- **Requirements**: None (no external services needed)
- **Run**: `npm run test:unit`
- **Fast**: ✅ Yes

### Integration Tests (`tests/integration/`)
- **Purpose**: Test component integration with mocked or local services
- **Requirements**: 
  - Docker (for docker.test.ts)
  - No real Bitbucket server needed (uses mocks)
- **Run**: `npm run test:integration`
- **Fast**: ⚠️ Moderate (some tests start local servers)

### E2E Tests (`tests/e2e/`)
- **Purpose**: Test the full MCP server protocol end-to-end
- **Requirements**:
  - Mock Bitbucket server (default) OR
  - Real Bitbucket Data Center instance (optional)
- **Run**: 
  - With mock: `npm run test:e2e`
  - With real Bitbucket: `npm run test:e2e:real`
- **Fast**: ⚠️ Moderate

### Benchmark Tests (`tests/benchmarks/`)
- **Purpose**: Measure semantic search performance and relevance
- **Requirements**: embeddings.db file must exist
- **Run**: `npm run test:benchmark`
- **Fast**: ⚠️ Depends on database size

## Running Tests

### Default (Unit Tests Only)
```bash
npm test
# or
npm run test:unit
```

### All Tests (Including Integration & E2E)
```bash
npm run test:all
```

### Specific Test Types
```bash
# Unit tests only (fastest)
npm run test:unit

# Integration tests (requires Docker for some tests)
npm run test:integration

# E2E tests with mock Bitbucket
npm run test:e2e

# E2E tests with real Bitbucket DC instance
npm run test:e2e:real

# Benchmark tests
npm run test:benchmark

# Coverage report
npm run test:coverage
```

## Environment Variables

### For Integration Tests
- `RUN_INTEGRATION_TESTS=true` - Enable integration tests
  ```bash
  RUN_INTEGRATION_TESTS=true npm test
  ```

### For E2E Tests
- `RUN_E2E_TESTS=true` - Enable E2E tests with mock server
  ```bash
  RUN_E2E_TESTS=true npm test
  ```

- `E2E_USE_REAL_BITBUCKET=true` - Use real Bitbucket DC instance for E2E tests
  ```bash
  E2E_USE_REAL_BITBUCKET=true npm run test:e2e
  ```

### For Real Bitbucket Testing
When using `E2E_USE_REAL_BITBUCKET=true`, you also need:
```bash
export BITBUCKET_URL=https://your-bitbucket-instance.com
export BITBUCKET_AUTH_METHOD=pat  # or basic, oauth1, oauth2
export BITBUCKET_TOKEN=your-token  # for PAT
# or
export BITBUCKET_USERNAME=user
export BITBUCKET_PASSWORD=pass
```

## CI/CD Recommendations

### Pull Request Checks (Fast)
```bash
npm run test:unit
npm run lint
npm run build
```

### Pre-merge Checks (Comprehensive)
```bash
npm run test:unit
npm run test:integration
npm run lint
npm run build
```

### Nightly/Release Checks (Full)
```bash
npm run test:all
npm run test:coverage
npm run lint
npm run build
```

## Troubleshooting

### "No embeddings.db found"
```bash
# Generate embeddings database
npm run populate-db
```

### Docker tests failing
```bash
# Ensure Docker is running
docker ps

# Build the Docker image
npm run test:integration
```

### Real Bitbucket tests failing
```bash
# Verify connection first
npm run test-connection

# Check environment variables
echo $BITBUCKET_URL
echo $BITBUCKET_AUTH_METHOD
```

## Test File Naming Conventions

- `*.test.ts` - Standard test file
- `*.manual.test.ts` - Manual tests (not run automatically)
- `*-integration.test.ts` - Integration test file
- `*-e2e.test.ts` - End-to-end test file

## Writing New Tests

### Skip Integration/E2E Tests by Default

Use the helper functions to make tests conditional:

```typescript
import { describeIfIntegration, describeIfE2E } from '../helpers/skip-integration.js';

// This test suite only runs when RUN_INTEGRATION_TESTS=true
describeIfIntegration('My Integration Tests', () => {
  it('should test integration', () => {
    // test code
  });
});

// This test suite only runs when RUN_E2E_TESTS=true
describeIfE2E('My E2E Tests', () => {
  it('should test e2e', () => {
    // test code
  });
});
```

### Individual Test Control

```typescript
import { itIfIntegration, itIfE2E } from '../helpers/skip-integration.js';

describe('My Mixed Tests', () => {
  it('always runs (unit test)', () => {
    // unit test
  });

  itIfIntegration('only runs with RUN_INTEGRATION_TESTS', () => {
    // integration test
  });

  itIfE2E('only runs with RUN_E2E_TESTS', () => {
    // e2e test
  });
});
```
