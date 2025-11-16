# Unified Project Structure

```plaintext
bitbucket-dc-mcp-server/
├── .github/                      # GitHub Actions CI/CD
│   └── workflows/
│       ├── ci.yml                # Lint, test, build (Linux/macOS/Win)
│       ├── release.yml           # Publish npm + Docker images
│       └── docker-build.yml      # Multi-arch Docker builds
├── src/                          # Source code (TypeScript)
│   ├── tools/                    # MCP Tools Layer
│   │   ├── search-ids-tool.ts    # search_ids implementation
│   │   ├── get-id-tool.ts        # get_id implementation
│   │   └── call-id-tool.ts       # call_id implementation
│   ├── services/                 # Service Layer (Business Logic)
│   │   ├── semantic-search.ts    # Semantic search engine
│   │   ├── bitbucket-client.ts        # HTTP client for Bitbucket DC
│   │   └── openai-client.ts      # OpenAI embeddings API
│   ├── core/                     # Core Layer (Utilities)
│   │   ├── mcp-server.ts         # MCP protocol handler
│   │   ├── config-manager.ts     # Config loader & validator
│   │   ├── logger.ts             # Structured logging (pino)
│   │   ├── cache-manager.ts      # LRU cache implementation
│   │   ├── circuit-breaker.ts    # Circuit breaker pattern
│   │   ├── rate-limiter.ts       # Token bucket rate limiter
│   │   └── credential-storage.ts # OS keychain wrapper
│   ├── auth/                     # Authentication
│   │   ├── auth-manager.ts       # Strategy selector & manager
│   │   ├── auth-strategy.ts      # Base interface
│   │   └── strategies/
│   │       ├── oauth2-strategy.ts    # OAuth 2.0 PKCE
│   │       ├── pat-strategy.ts       # Personal Access Token
│   │       ├── oauth1-strategy.ts    # OAuth 1.0a (fallback)
│   │       └── basic-auth-strategy.ts # Basic HTTP Auth
│   ├── validation/               # Input Validation
│   │   ├── validator.ts          # Zod validation wrapper
│   │   └── generated-schemas.ts  # AUTO-GENERATED Zod schemas
│   ├── data/                     # Data Access Layer
│   │   └── embeddings-repository.ts # sqlite-vec queries
│   ├── cli/                      # CLI Tools
│   │   ├── setup-wizard.ts       # Interactive setup
│   │   └── search-test.ts        # Standalone search CLI
│   └── index.ts                  # Entry point (MCP server start)
├── scripts/                      # Build-time Scripts
│   ├── download-openapi.ts       # Download Bitbucket OpenAPI spec
│   ├── generate-schemas.ts       # Generate Zod schemas from OpenAPI
│   ├── generate-embeddings.ts    # Generate embeddings via OpenAI
│   └── populate-db.ts            # Populate sqlite-vec database
├── data/                         # Generated Data (gitignored)
│   ├── embeddings.db             # sqlite-vec database (3-4MB)
│   ├── operations.json           # Intermediate: parsed operations
│   └── schemas.json              # Intermediate: extracted schemas
├── tests/                        # Test Suites
│   ├── unit/                     # Unit tests (services, core, auth)
│   │   ├── semantic-search.test.ts
│   │   ├── circuit-breaker.test.ts
│   │   └── auth-strategies.test.ts
│   ├── integration/              # Integration tests
│   │   ├── mcp-protocol.test.ts
│   │   ├── bitbucket-api.test.ts
│   │   └── sqlite-vec.test.ts
│   ├── benchmarks/               # Quality gates (precision, recall, MRR)
│   │   └── search-relevance.test.ts
│   └── e2e/                      # End-to-end tests
│       └── e2e-mcp.test.ts       # Full workflow tests
├── docs/                         # Documentation
│   ├── prd.md                    # Product Requirements
│   ├── architecture.md           # THIS FILE
│   ├── authentication.md         # Auth setup guide
│   ├── api-reference.md          # MCP tools API reference
│   ├── cookbook.md               # Usage examples (20+ recipes)
│   ├── troubleshooting.md        # Troubleshooting guide
│   └── contributing.md           # Contribution guidelines
├── .dockerignore                 # Docker build ignore
├── .env.example                  # Environment variables template
├── .eslintrc.json                # ESLint configuration
├── .gitignore                    # Git ignore rules
├── .prettierrc                   # Prettier config
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # Local testing setup
├── package.json                  # npm package config
├── tsconfig.json                 # TypeScript compiler config
├── vitest.config.ts              # Vitest test runner config
├── README.md                     # Quick start guide
├── LICENSE                       # MIT License
└── CHANGELOG.md                  # Version history
```

**Key Architectural Decisions:**

1. **Layered Organization:** Tools → Services → Core → Data (dependency flow sempre para baixo)
2. **No Frontend:** Produto é CLI/backend apenas, toda "UI" é conversacional via LLMs
3. **Generated Code Isolated:** `validation/generated-schemas.ts` é auto-generated, header warning
4. **Build Scripts Separate:** `scripts/` não fazem parte do runtime bundle
5. **Data Gitignored:** `data/` é regenerável, não commitado (apenas em release artifacts)
6. **Tests Mirror Structure:** `tests/` espelha `src/` structure para easy navigation

