# Epic 2: MCP Server & Operation Execution

**Epic Goal:** Implementar o Model Context Protocol server com stdio transport, integrar os 3 MCP tools (`search_ids`, `get_id`, `call_id`), e estabelecer comunicação funcional com Bitbucket Data Center API - entregando MVP funcional end-to-end que pode ser testado com Claude Desktop ou qualquer MCP client. Este epic transforma o semantic search engine standalone (Epic 1) em produto LLM-native usável, validando integration com LLMs e Bitbucket DC em ambiente real.

### Story 2.1: MCP Server Foundation

As a **developer**,  
I want **MCP protocol server implementado com stdio transport usando @modelcontextprotocol/sdk**,  
so that **tenho base para expor tools para LLMs via MCP protocol**.

**Acceptance Criteria:**

1. Classe `McpServer` em `src/core/mcp-server.ts` implementada usando @modelcontextprotocol/sdk
2. Server configurado para stdio transport (read from stdin, write to stdout)
3. Server implementa MCP protocol handshake (initialize, initialized messages)
4. Server registra server info: name="bitbucket-dc-mcp-server", version=(from package.json), capabilities
5. Server tem lifecycle management: startup, ready state, graceful shutdown
6. Server implementa error handling global: uncaught exceptions, unhandled rejections logados e não crasham process
7. Server tem structured logging (pino) para: startup events, protocol messages, errors
8. Integration test valida: server starts, responds to initialize request, shuts down gracefully
9. Server compila para executable: `npm run build` → `dist/index.js` executável via `node dist/index.js`
10. Classes, métodos e interfaces documentados com TSDoc (descriptions, @param, @returns, @example)

### Story 2.2: MCP Tool: search_ids

As a **LLM**,  
I want **MCP tool `search_ids` que aceita natural language query e retorna relevant Bitbucket operation IDs**,  
so that **posso descobrir qual Bitbucket API usar para task que usuário pediu**.

**Acceptance Criteria:**

1. Tool `search_ids` registrado no MCP server com schema: input=(query: string, limit?: number), output=(operations: array of {id, summary, score})
2. Tool chama `SemanticSearchService.search()` implementado no Epic 1
3. Tool retorna top 5 operations (ou limit customizado) com: operationId, summary, relevance score
4. Tool implementa input validation: query não vazia, limit entre 1-20
5. Tool implementa error handling: search service failures retornam MCP error response com mensagem descritiva
6. Tool tem timeout de 5s (configurable) para prevent hanging
7. Tool loga todas as invocações (query, results count, latency) para observability
8. Integration test valida: tool invoked via MCP client, returns expected operations para sample queries
9. Tool documenta seu purpose e usage no MCP tools list response

### Story 2.3: MCP Tool: get_id

As a **LLM**,  
I want **MCP tool `get_id` que retorna schema completo, docs, e exemplos para Bitbucket operation ID**,  
so that **posso entender como usar a operation e gerar valid API call**.

**Acceptance Criteria:**

1. Tool `get_id` registrado no MCP server com schema: input=(operation_id: string), output=(operation details object)
2. Tool lê metadata da operation de `data/operations.json` ou database
3. Tool retorna: operationId, path, method, summary, description, parameters (path/query/header/body), requestBody schema, responses, examples (curl command, request/response samples)
4. Tool inclui links para Bitbucket official docs quando disponível
5. Tool implementa validation: operation_id exists (retorna 404 error se não encontrado)
6. Tool formata output para ser LLM-readable: clear structure, code blocks para examples
7. Tool tem caching: results são cached (LRU, 500 entries) pois schemas raramente mudam
8. Integration test valida: tool returns complete schema para known operation IDs
9. Tool documenta example usage no MCP tools list

### Story 2.4: Bitbucket API Client Service

As a **developer**,  
I want **service que encapsula HTTP calls para Bitbucket DC REST API com error handling robusto**,  
so that **posso executar operations Bitbucket de forma confiável com retries e rate limiting**.

**Acceptance Criteria:**

1. Classe `BitbucketClientService` em `src/services/bitbucket-client.ts` implementada
2. Service tem método `executeOperation(operationId, params)` que constrói HTTP request baseado em operation metadata
3. Service usa node-fetch (ou axios) para HTTP calls
4. Service implementa rate limiting: max 100 req/s (configurable), usa token bucket algorithm
5. Service implementa retry logic: 3 retries com exponential backoff (100ms, 500ms, 2s) para errors transientes (timeout, 429, 5xx)
6. Service implementa timeout: 30s default (configurable) por request
7. Service valida response status codes e transforma em typed errors: 400→ValidationError, 401/403→AuthError, 404→NotFoundError, 429→RateLimitError, 5xx→ServerError
8. Service normaliza response body: parse JSON, handle empty responses, validate against expected schema
9. Service loga todas as requests (method, path, status, latency) para observability
10. Unit tests com mock HTTP server validam: success cases, retry logic, error handling, rate limiting
11. Classes, métodos e custom errors documentados com TSDoc (descriptions, @param, @returns, @throws)

### Story 2.5: Input Validation Against Schemas

As a **developer**,  
I want **validação de input parameters contra Zod schemas antes de chamar Bitbucket API**,  
so that **LLMs recebem feedback claro sobre erros antes de gastar tempo em API call inválida**.

**Acceptance Criteria:**

1. Função `validateOperationInput(operationId, params)` em `src/validation/validator.ts` implementada
2. Função carrega Zod schema correspondente ao operationId de `src/validation/generated-schemas.ts`
3. Função valida params contra schema usando `schema.safeParse(params)`
4. Se validação passa, retorna parsed params (com type coercion e defaults aplicados)
5. Se validação falha, retorna array de validation errors com: field path, error message, expected type/format
6. Validation errors são formatados para ser LLM-readable: "Parameter 'issueIdOrKey' is required but missing", "Field 'fields.priority' must be an object, got string"
7. Função valida nested objects e arrays recursively
8. Função tem performance optimization: schemas são cached após primeiro load
9. Unit tests validam: valid inputs pass, invalid inputs return descriptive errors, edge cases (nulls, empty objects, extra fields)

### Story 2.6: MCP Tool: call_id

As a **LLM**,  
I want **MCP tool `call_id` que executa Bitbucket operation com params validados e retorna result**,  
so that **posso realizar ações no Bitbucket (create issue, update, etc.) em nome do usuário**.

**Acceptance Criteria:**

1. Tool `call_id` registrado no MCP server com schema: input=(operation_id: string, parameters: object), output=(result: object | array)
2. Tool valida input usando `validateOperationInput()` implementado em 2.5
3. Se validation falha, tool retorna MCP error response com validation errors
4. Tool chama `BitbucketClientService.executeOperation()` com validated params
5. Tool retorna Bitbucket API response: success results são retornados as-is, errors são normalized
6. Tool implementa timeout: 60s (configurable) para operações longas
7. Tool loga todas as executions: operationId, status (success/error), latency, error details
8. Tool implementa audit trail: todas as mutations (POST, PUT, DELETE) são logadas com full params (sanitizando credentials)
9. Integration test com mock Bitbucket API valida: successful operation execution, validation errors, Bitbucket API errors, retries, rate limiting
10. Integration test com REAL Bitbucket DC instance (manual, não CI) valida: create issue, get issue, update issue, search issues

### Story 2.7: End-to-End MCP Integration Test

As a **QA engineer**,  
I want **test suite que simula LLM client interagindo com MCP server para workflows completos**,  
so that **valido que integration MCP + Semantic Search + Bitbucket API funciona end-to-end**.

**Acceptance Criteria:**

1. Test suite `tests/integration/e2e-mcp.test.ts` criado usando MCP SDK test utilities
2. Suite simula MCP client connecting via stdio transport
3. Test Workflow 1: Search → Get → Call
   - Client invoca `search_ids` com query "create new issue"
   - Asserts: returns operation IDs, top result is `create_issue` com score >0.9
   - Client invoca `get_id` com operation_id returned
   - Asserts: returns schema com parameters, examples
   - Client invoca `call_id` com valid params (mock Bitbucket API)
   - Asserts: returns success response
4. Test Workflow 2: Invalid Input Handling
   - Client invoca `call_id` com invalid params
   - Asserts: returns validation errors with descriptive messages
5. Test Workflow 3: Bitbucket API Error Handling
   - Client invoca `call_id`, mock Bitbucket returns 401 auth error
   - Asserts: returns MCP error with clear message "Authentication failed: check your Bitbucket credentials"
6. Suite valida: protocol handshake, tool listing, error responses format, logging output
7. Suite executa em CI pipeline usando mock Bitbucket API
8. Suite tem documentation de como executar manually contra real Bitbucket DC instance

---

