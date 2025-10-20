# E2E Tests - Manual Testing Against Real Bitbucket DC

This directory contains end-to-end integration tests for the Bitbucket Data Center MCP server.

## Overview

The E2E tests validate complete workflows:
- **Protocol Handshake**: MCP initialization and tool listing
- **Workflow 1 (Search → Get → Call)**: Semantic search, schema retrieval, and API execution
- **Workflow 2 (Invalid Input Handling)**: Validation error responses
- **Workflow 3 (Bitbucket API Error Handling)**: 401, 429, 500 errors with retry logic

By default, tests run against a **mock Bitbucket server** for fast, isolated testing in CI.

## Prerequisites for Real Bitbucket Testing

- Real Bitbucket Data Center instance accessible
- Valid authentication credentials (OAuth2/PAT/Basic)
- Bitbucket project with permission to create issues
- Database populated with embeddings (`npm run populate-db`)

## Setup for Real Bitbucket DC

### 1. Configure Bitbucket Credentials

```bash
# Set your Bitbucket instance URL
export BITBUCKET_URL=https://your-bitbucket-instance.com

# Set auth method (oauth2, pat, oauth1, or basic)
export BITBUCKET_AUTH_METHOD=pat

# For PAT auth, credentials are managed via OS keychain
# Run the setup wizard (when implemented in Story 3.1):
# bitbucket-mcp setup
```

### 2. Run E2E Tests Against Real Bitbucket

```bash
# Run with real Bitbucket instance
npm run test:e2e:real
```

**Note**: This will create real issues in your Bitbucket instance with prefix `E2E-TEST-*`.

## Expected Results

When testing against real Bitbucket DC:

✅ **All tests should pass**  
✅ **Issues created in Bitbucket** (you'll need to clean them up manually)  
✅ **Search returns relevant operations**  
✅ **API calls execute successfully**  
✅ **Error handling works correctly**

### Test Issue Cleanup

After running tests, delete test issues:

```bash
# Option 1: Manual cleanup in Bitbucket UI
# Search for: summary ~ "E2E test*" OR summary ~ "Test issue"

# Option 2: Future cleanup script (to be implemented)
# npm run test:e2e:cleanup
```

## Automated (CI) Testing

In CI pipelines, tests run against the **mock Bitbucket server** automatically:

```bash
npm run test:e2e
```

Environment is configured to use `http://localhost:8080` (mock server) by default.

## Troubleshooting

### Tests fail with "Authentication failed"
- Verify `BITBUCKET_URL` is correct
- Check credentials in OS keychain
- Ensure Bitbucket user has required permissions

### Tests fail with "Operation not found"
- Run `npm run populate-db` to initialize database
- Verify `data/embeddings.db` exists and has data

### Tests timeout
- Check network connectivity to Bitbucket instance
- Increase timeout in test configuration (default: 5s per request)
- Verify Bitbucket instance is responding

### Mock server not starting
- Ensure port 8080 is available
- Check for firewall/antivirus blocking localhost connections

## Test Architecture

### Mock Bitbucket Server (`tests/helpers/mock-bitbucket-server.ts`)
HTTP server that simulates Bitbucket DC API responses for testing without a real instance.

### MCP Test Client (`tests/helpers/mcp-test-client.ts`)
Spawns MCP server process and communicates via stdio transport with JSON-RPC protocol.

### Test Suites (`tests/e2e/e2e-mcp.test.ts`)
Comprehensive integration tests covering all MCP workflows and error scenarios.

## Contributing

When adding new tests:
1. Use mock Bitbucket server by default
2. Ensure tests are idempotent (can run multiple times)
3. Add cleanup for any created resources
4. Document expected Bitbucket permissions/configuration
5. Update this README with new test scenarios

## See Also

- [Architecture Documentation](../../docs/internal/architecture/)
- [Testing Strategy](../../docs/internal/architecture/testing-strategy.md)
- [MCP Protocol Specification](https://github.com/anthropics/mcp)
