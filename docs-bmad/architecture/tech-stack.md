# Tech Stack

### Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Runtime | Node.js | 18+ LTS | JavaScript runtime | LTS support, native fetch, broad compatibility, proven stability |
| Language | TypeScript | 5.x | Type-safe development | Strict mode, path aliases, compile-time safety, excellent IDE support |
| Package Manager | npm | 9+ | Dependency management | Native to Node.js, broad registry, workspace support |
| MCP SDK | @modelcontextprotocol/sdk | Latest | MCP protocol implementation | Official Anthropic SDK, stdio transport, type-safe |
| Vector DB | sqlite-vec | Latest | Embeddings storage & search | Embedded (zero-config), cosine similarity search, <100ms queries |
| SQLite Driver | better-sqlite3 | Latest | Database access | Synchronous API, high performance, native bindings |
| Validation | Zod | 3.x | Runtime schema validation | Type inference, composable schemas, excellent errors |
| HTTP Client | node-fetch | 3.x | Bitbucket API calls | Native to Node 22+, promise-based, fetch API standard |
| Logging | pino | 8.x | Structured logging | High performance JSON logs, log levels, redaction support |
| Auth Storage | node-keytar | Latest | OS keychain integration | Secure credential storage, cross-platform (macOS/Win/Linux) |
| Testing Framework | Vitest | Latest | Unit & integration tests | Fast, Vite-powered, Jest-compatible API, native ESM |
| E2E Testing | Custom MCP client | N/A | MCP protocol testing | Simulates stdio transport, validates tool interactions |
| Code Quality | ESLint | 8.x | Linting | TypeScript rules, consistent code style |
| Formatting | Prettier | 3.x | Code formatting | Opinionated, zero-config, IDE integration |
| Build Tool | tsc (TypeScript) | 5.x | Compilation | Native TypeScript compiler, incremental builds |
| Bundler | N/A | N/A | Not needed | Node.js can run compiled JS directly, no bundling for backend |
| CI/CD | GitHub Actions | N/A | Automated testing & deployment | Free for OSS, matrix builds (Linux/macOS/Win), Docker support |
| Monitoring | pino (logs) | 8.x | Observability | Structured JSON logs, correlation IDs, log rotation |
| Embeddings | @xenova/transformers | Latest | Local vector embeddings | Zero-config, air-gapped support, all-mpnet-base-v2 768 dim |

**Key Technology Decisions:**

**Why Node.js 22+ over Deno/Bun?**
- Ecosystem maturity: npm registry, better-sqlite3, node-keytar
- Production stability: Node 22 LTS até 2027
- MCP SDK oficial usa Node.js
- Trade-off: Deno seria mais moderno mas ecosystem gaps

**Why sqlite-vec over Pinecone/Weaviate?**
- Zero-config: Embedded, no server setup
- Air-gapped support: Funciona offline
- Cost: $0 (vs $70+/mês managed)
- Performance: <100ms queries suficiente para 500+ operations
- Trade-off: Não escala para 10M+ embeddings (não é requirement para v1.0)

**Why Zod over AJV?**
- Type inference: `z.infer<typeof schema>` → TypeScript types
- Developer experience: Melhor errors, composable
- Runtime safety: Valida e transforma inputs
- Trade-off: AJV é mais rápido (benchmarks), mas Zod é "fast enough" (<1ms validation)

**Why Vitest over Jest?**
- Performance: 10x faster (Vite-powered, native ESM)
- Developer experience: Watch mode excelente, parallelização
- TypeScript: Zero-config, native support
- Trade-off: Ecosystem menor (Jest tem mais plugins), mas suficiente para MVP

**Why pino over Winston?**
- Performance: Benchmarks 5x+ faster
- JSON nativo: Melhor para log aggregators (ELK, Datadog)
- Redaction: Built-in para sanitize credentials
- Trade-off: Winston tem mais transports, mas stdout + file suficientes

