# Testing Strategy

### Testing Pyramid

```
        E2E Tests (5%)
       /            \
    Integration Tests (25%)
   /                    \
Unit Tests (70%)
```

**Rationale:** Maioria unit tests (fast, isolated), integration tests para critical paths, E2E smoke tests apenas.

### Test Organization

#### Frontend Tests

N/A (produto é backend/CLI apenas)

#### Backend Tests

```
tests/
├── unit/                         # 70% dos tests
│   ├── services/
│   │   ├── semantic-search.test.ts
│   │   ├── bitbucket-client.test.ts
│   │   └── openai-client.test.ts
│   ├── core/
│   │   ├── circuit-breaker.test.ts
│   │   ├── rate-limiter.test.ts
│   │   ├── cache-manager.test.ts
│   │   └── config-manager.test.ts
│   ├── auth/
│   │   ├── auth-manager.test.ts
│   │   └── strategies/
│   │       ├── oauth2-strategy.test.ts
│   │       └── pat-strategy.test.ts
│   └── validation/
│       └── validator.test.ts
├── integration/                  # 25% dos tests
│   ├── mcp-protocol.test.ts      # MCP handshake, tool registration
│   ├── sqlite-vec.test.ts        # Vector search queries
│   ├── bitbucket-api-mock.test.ts     # HTTP client com mock server
│   └── auth-flows.test.ts        # End-to-end auth flows
└── e2e/                          # 5% dos tests
    └── e2e-mcp.test.ts           # Full workflows (search → get → call)
```

#### E2E Tests

```
tests/e2e/
└── workflows/
    ├── search-get-call.test.ts   # Happy path: search → schema → execute
    ├── auth-setup.test.ts        # Setup wizard → auth → test connection
    └── error-recovery.test.ts    # Circuit breaker, retries, degradation
```

### Test Examples

#### Frontend Component Test

N/A (produto é backend/CLI apenas)

#### Backend API Test

```typescript
// tests/unit/services/semantic-search.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SemanticSearchService } from '../../../src/services/semantic-search.js';
import { EmbeddingsRepository } from '../../../src/data/embeddings-repository.js';

describe('SemanticSearchService', () => {
  let service: SemanticSearchService;
  let mockRepository: vi.Mocked<EmbeddingsRepository>;
  
  beforeEach(() => {
    mockRepository = {
      search: vi.fn(),
      getOperation: vi.fn(),
    } as any;
    
    service = new SemanticSearchService(mockRepository);
  });
  
  it('should return top 5 operations by similarity', async () => {
    // Mock repository response
    mockRepository.search.mockResolvedValue([
      { operation_id: 'create_issue', summary: 'Create issue', similarity_score: 0.96 },
      { operation_id: 'update_issue', summary: 'Update issue', similarity_score: 0.89 },
    ]);
    
    // Execute search
    const results = await service.search('how to create issue', 5);
    
    // Assertions
    expect(results).toHaveLength(2);
    expect(results[0].operation_id).toBe('create_issue');
    expect(results[0].similarity_score).toBeGreaterThan(0.9);
    expect(mockRepository.search).toHaveBeenCalledWith(
      expect.any(Float32Array), // Query embedding
      5
    );
  });
  
  it('should cache query embeddings', async () => {
    const query = 'create issue';
    mockRepository.search.mockResolvedValue([]);
    
    // First call
    await service.search(query, 5);
    const firstCallCount = vi.mocked(service['openAIClient'].createEmbedding).mock.calls.length;
    
    // Second call (same query)
    await service.search(query, 5);
    const secondCallCount = vi.mocked(service['openAIClient'].createEmbedding).mock.calls.length;
    
    // Should reuse cached embedding (no additional API call)
    expect(secondCallCount).toBe(firstCallCount);
  });
  
  it('should handle OpenAI API failures gracefully', async () => {
    vi.mocked(service['openAIClient'].createEmbedding).mockRejectedValue(
      new Error('OpenAI API error')
    );
    
    await expect(service.search('query', 5)).rejects.toThrow('Failed to generate query embedding');
  });
});
```

#### E2E Test

```typescript
// tests/e2e/workflows/search-get-call.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClient } from '../../helpers/mcp-client.js';
import { MockBitbucketServer } from '../../helpers/mock-bitbucket.js';

describe('E2E: Search → Get → Call Workflow', () => {
  let client: MCPClient;
  let mockBitbucket: MockBitbucketServer;
  
  beforeAll(async () => {
    // Start mock Bitbucket server
    mockBitbucket = new MockBitbucketServer();
    await mockBitbucket.start(8080);
    
    // Start MCP server (stdio transport)
    client = new MCPClient();
    await client.start();
    await client.initialize();
  });
  
  afterAll(async () => {
    await client.stop();
    await mockBitbucket.stop();
  });
  
  it('should complete full workflow: search → get schema → execute operation', async () => {
    // Step 1: Search for operation
    const searchResult = await client.callTool('search_ids', {
      query: 'create new issue',
      limit: 5,
    });
    
    expect(searchResult.operations).toBeDefined();
    expect(searchResult.operations.length).toBeGreaterThan(0);
    expect(searchResult.operations[0].operation_id).toBe('create_issue');
    expect(searchResult.operations[0].similarity_score).toBeGreaterThan(0.9);
    
    // Step 2: Get operation schema
    const schemaResult = await client.callTool('get_id', {
      operation_id: 'get_projects',
    });
    
    expect(schemaResult.path).toBe('/rest/api/latest/projects');
    expect(schemaResult.method).toBe('GET');
    expect(schemaResult.parameters).toBeDefined();
    
    // Step 3: Execute operation (mock Bitbucket returns 200 OK)
    mockBitbucket.mockResponse('GET', '/rest/api/latest/projects', {
      status: 200,
      body: { values: [{ key: 'PROJ', name: 'Test Project', id: 1 }] },
    });
    
    const callResult = await client.callTool('call_id', {
      operation_id: 'get_projects',
      parameters: {
        limit: 25,
        start: 0,
        },
      },
    });
    
    expect(callResult.success).toBe(true);
    expect(callResult.status).toBe(201);
    expect(callResult.data.key).toBe('PROJ-1');
  });
});
```

**Coverage Targets:**
- Unit tests: ≥85% line coverage
- Integration tests: Critical paths 100%
- E2E tests: Happy path + major error scenarios

