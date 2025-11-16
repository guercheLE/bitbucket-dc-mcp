# Epic 1: Foundation & Semantic Search Engine

**Epic Goal:** Estabelecer a fundação técnica do projeto incluindo setup de repositório, CI/CD pipeline, OpenAPI processing build script, integração com sqlite-vec, geração de embeddings locais (Transformers.js), e implementação da busca semântica - validando a core technical hypothesis de >85% search relevance que é nosso principal diferenciador competitivo. Este epic entrega busca semântica funcional testável via CLI simples (não MCP ainda), permitindo early validation com beta testers e ajustes no algoritmo antes de integrar com MCP protocol.

### Story 1.1: Project Initialization & CI/CD Setup

As a **developer**,  
I want **projeto TypeScript configurado com structure bem definida, linting, formatting, e CI/CD pipeline**,  
so that **tenho base sólida para development com quality gates automatizados desde dia 1**.

**Acceptance Criteria:**

1. Repositório Git inicializado com structure monorepo (`src/`, `tests/`, `scripts/`, `docs/`, `data/`)
2. TypeScript 5.x configurado com `tsconfig.json` (strict mode, paths aliases)
3. ESLint + Prettier configurados com regras consistentes
4. Package.json com scripts: `build`, `dev`, `test`, `lint`, `format`
5. GitHub Actions workflow para CI: lint, type-check, build em Linux/macOS/Windows
6. README.md inicial com project description, setup instructions, e badges (build status)
7. Dependências core instaladas: TypeScript, Node.js types, testing framework (Jest/Vitest)
8. `.gitignore` configurado (node_modules, dist, data/embeddings.db, .env)
9. Pre-commit hooks configurados com husky: auto-run lint e format antes de commits

### Story 1.2: OpenAPI Spec Download & Parsing

As a **developer**,  
I want **script que download Bitbucket DC OpenAPI spec 11.0.1 e parse para extrair operations e schemas**,  
so that **tenho source of truth para todos os endpoints Bitbucket que vou suportar via MCP**.

**Acceptance Criteria:**

1. Script `scripts/download-openapi.ts` faz download de Bitbucket DC REST API OpenAPI spec (JSON format) da URL oficial ou local file
2. Spec é validado como valid OpenAPI 3.0+ usando biblioteca de validação
3. Script extrai lista de operations com: operationId, path, method, summary, description, parameters, requestBody, responses
4. Script normaliza operationIds para formato consistente (ex: `issues-createIssue` → `create_issue`)
5. Extracted operations são salvos em `data/operations.json` (intermediário, commit no repo)
6. Extracted schemas (components/schemas) são salvos em `data/schemas.json`
7. Script tem error handling robusto (network failures, invalid spec, missing fields)
8. Unit tests cobrem parsing logic com mock OpenAPI specs

### Story 1.3: Zod Schema Generation for Validation

As a **developer**,  
I want **schemas Zod gerados automaticamente a partir do OpenAPI spec**,  
so that **posso validar inputs de usuário em runtime com type-safety antes de chamar Bitbucket API**.

**Acceptance Criteria:**

1. Script `scripts/generate-schemas.ts` lê `data/schemas.json` e gera schemas Zod em `src/validation/generated-schemas.ts`
2. Cada OpenAPI schema component é convertido para Zod schema equivalente (strings, numbers, objects, arrays, enums, optionals)
3. Schemas incluem validações: required fields, string formats (email, uri, date-time), number constraints (min, max), array constraints
4. Generated file é formatado com Prettier e inclui header comment "AUTO-GENERATED - DO NOT EDIT"
5. Script suporta OpenAPI $ref resolution (nested schemas)
6. Generated schemas são type-safe (TypeScript types inferidos de Zod schemas)
7. Unit tests validam: schema generation correctness, validation catches invalid inputs
8. Script pode ser re-executado (idempotent) quando OpenAPI spec atualiza

### Story 1.4: Embedding Generation Pipeline

As a **developer**,  
I want **script que gera embeddings para descriptions de operations Bitbucket usando modelo local (Transformers.js)**,  
so that **posso implementar semantic search offline que encontra operations por natural language queries**.

**Acceptance Criteria:**

1. Script `scripts/generate-embeddings.ts` lê `data/operations.json`
2. Para cada operation, cria description text concatenando: summary + description + operationId + common use case hints
3. Script usa Transformers.js com modelo local `Xenova/all-mpnet-base-v2` (768 dimensions) para gerar embeddings
4. Embeddings são salvos em formato intermediário `data/embeddings.json` (operationId + vector array)
5. Script implementa batching (processar múltiplas operations em chunks) para efficiency
6. Script tem progress indicator (console.log com % progress, ETA)
7. Script é configurável via env vars: `EMBEDDING_MODEL` (default: Xenova/all-mpnet-base-v2), `BATCH_SIZE`
8. Modelo é cached automaticamente no primeiro uso (~90MB download one-time)
9. Generated embeddings.json não é commitado no repo (gitignore), apenas em release artifacts

### Story 1.5: sqlite-vec Database Setup

As a **developer**,  
I want **embeddings armazenados em sqlite-vec database com índice vetorial otimizado**,  
so that **posso fazer semantic search queries com latency <100ms**.

**Acceptance Criteria:**

1. Script `scripts/populate-db.ts` cria database `data/embeddings.db` usando better-sqlite3 + sqlite-vec extension
2. Database schema criado com tables: `operations` (id, operation_id, summary, description), `embeddings` (operation_id, vector BLOB)
3. sqlite-vec virtual table criado para similarity search: `CREATE VIRTUAL TABLE vec_index USING vec0(...)`
4. Script popula tables lendo `data/operations.json` e `data/embeddings.json`
5. Vectors são armazenados em formato binário otimizado (float32 array)
6. Database tem índice criado em operation_id para fast lookups
7. Script valida database integrity após population (count matches, no nulls)
8. Database file é otimizado com `VACUUM` para reduce size
9. Unit tests com in-memory database validam: insert operations, vector search queries retornam results

### Story 1.6: Semantic Search Implementation

As a **developer**,  
I want **função de semantic search que aceita natural language query e retorna top 5 relevant operations**,  
so that **usuários podem descobrir Bitbucket endpoints sem conhecer nomes técnicos**.

**Acceptance Criteria:**

1. Classe `SemanticSearchService` em `src/services/semantic-search.ts` implementada
2. Método `search(query: string, limit: number = 5): Promise<SearchResult[]>` implementado
3. Query string é convertida para embedding usando Transformers.js local (Xenova/all-mpnet-base-v2)
4. Embedding é usado para cosine similarity search na sqlite-vec database
5. Top N results são retornados com: operationId, summary, description, similarity score (0-1)
6. Results são ordenados por similarity score descending
7. Service tem caching layer para frequent queries (LRU cache, max 1000 entries)
8. Service implementa error handling para: model loading failures, database errors, invalid queries
9. Unit tests com mock database validam search logic
10. Integration tests com real embeddings.db validam: search("update issue assignee") returns relevant operations with score >0.75
11. Classes e métodos públicos documentados com TSDoc (descriptions, @param, @returns, @throws)

### Story 1.7: Search Relevance Benchmark

As a **QA engineer**,  
I want **benchmark suite com 50+ queries e expected operations para validar >85% relevance**,  
so that **tenho metrics objetivas de search quality e posso track regression**.

**Acceptance Criteria:**

1. Benchmark suite `tests/benchmarks/search-relevance.test.ts` criado
2. Suite tem 50+ test cases com: query string + expected top-5 operationIds (ordered by relevance)
3. Test cases cobrem common scenarios: CRUD operations, user management, workflows, custom fields, boards, sprints
4. Test cases incluem variations: different phrasings, typos tolerance, synonyms
5. Suite calcula metrics: Precision@5, Recall@5, Mean Reciprocal Rank (MRR), overall relevance score
6. Suite tem threshold assertions: overall relevance ≥85%, MRR ≥0.80, Precision@5 ≥0.85
7. Suite executa em CI pipeline e falha build se thresholds não são atingidos
8. Suite gera report markdown com: metrics summary, failed queries, recommendations
9. Suite tem mode para update expected results (após review manual de changes)

### Story 1.8: Search CLI for Early Validation

As a **developer**,  
I want **CLI tool simples para testar semantic search interactivamente**,  
so that **posso validar >85% relevance target com beta testers antes de integrar MCP protocol**.

**Acceptance Criteria:**

1. CLI tool `src/cli/search-test.ts` implementado
2. Tool aceita query como argument: `npm run search "how to create issue"`
3. Tool chama SemanticSearchService.search() e exibe results formatados (table format com columns: rank, operationId, summary, score)
4. Tool tem flag `--limit N` para configurar número de results (default 5)
5. Tool tem flag `--verbose` para mostrar full description de operations
6. Tool tem flag `--threshold X` para filtrar results abaixo de similarity score X
7. Tool tem color output para legibilidade (high score green, medium yellow, low red)
8. Tool implementa error handling com mensagens user-friendly
9. Integration test valida tool executes sem crashes para 10+ sample queries
10. CLI usa thresholds e expected results do benchmark suite (1.7) para validar search quality

---

