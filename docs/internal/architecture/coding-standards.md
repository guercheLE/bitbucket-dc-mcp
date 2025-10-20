# Coding Standards

### Critical Fullstack Rules

- **Type Safety Everywhere:** TypeScript strict mode, no `any` types sem justificativa. Prefer `unknown` para unknown types, narrow com type guards.

- **Error Handling:** Sempre usar try/catch em async functions. Nunca swallow errors (sempre log ou rethrow). Use custom error classes para domain errors.

- **Async/Await:** Sempre usar async/await sobre raw Promises. Não usar `.then()/.catch()` chains (exceto em callbacks inevitáveis).

- **No Console.log:** Usar Logger (pino) para todos os logs. `console.log` é lint error. Logs devem ter context (correlation ID, operation ID).

- **Input Validation:** Validar todos os inputs externos (MCP calls, API responses) com Zod schemas. Fail fast com mensagens descritivas.

- **Immutability:** Prefer const sobre let. Nunca mutar arrays/objects (usar spread, map, filter). Freeze objects quando appropriate.

- **Dependency Injection:** Classes recebem dependencies via constructor. No global singletons exceto Logger/Config (managed singletons).

- **Test Coverage:** Toda nova feature requer unit tests. Minimum 80% coverage, CI fails abaixo disso.

- **No Magic Numbers:** Usar constants nomeadas. Ex: `const MAX_RETRIES = 3` ao invés de hardcoded `3`.

- **Documentation:** TSDoc comments para public APIs (classes, methods). Explain "why" não "what" (código já explica "what").

### Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Classes | N/A | PascalCase | `SemanticSearchService` |
| Interfaces | N/A | PascalCase (I prefix optional) | `AuthStrategy`, `IAuthStrategy` |
| Functions | N/A | camelCase | `executeOperation()` |
| Variables | N/A | camelCase | `operationId`, `queryEmbedding` |
| Constants | N/A | UPPER_SNAKE_CASE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| Files | N/A | kebab-case | `semantic-search.ts`, `auth-manager.ts` |
| Directories | N/A | kebab-case | `core/`, `auth/strategies/` |
| Database Tables | N/A | snake_case | `operations`, `embeddings` |
| Database Columns | N/A | snake_case | `operation_id`, `created_at` |

**Rationale:**
- TypeScript/Node.js conventions (camelCase functions, PascalCase classes)
- Database snake_case é SQL standard
- Consistency facilita code reviews e onboarding
