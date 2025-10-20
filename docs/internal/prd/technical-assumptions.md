# Technical Assumptions

### Repository Structure: Monorepo

**Decision:** Monorepo único contendo todo o código do MCP server.

**Rationale:** 
- Projeto é single-product com scope bem definido
- Simplifica dependency management e versioning
- Facilita atomic commits e refactorings cross-cutting
- CI/CD mais simples (single build, single deploy)
- Permite future workspace structure se necessário expandir para múltiplos packages (ex: CLI tools, plugins)

**Structure:**
```
bitbucket-dc-mcp-server/
├── src/
│   ├── tools/          # MCP tools (search_ids, get_id, call_id)
│   ├── services/       # Business logic (search, auth, bitbucket client)
│   ├── core/           # Core utilities (config, logging, cache)
│   ├── validation/     # Schema validation (Zod schemas)
│   └── index.ts        # Entry point
├── scripts/
│   └── build-openapi.ts # Build-time OpenAPI processing
├── data/
│   └── embeddings.db   # sqlite-vec database (generated)
├── tests/
│   ├── unit/
│   └── integration/
└── docs/
```

### Service Architecture

**Decision:** Monolith com arquitetura em camadas (Layered Monolith)

**Rationale:**
- MVP scope não justifica microservices complexity
- Latency-critical (target <500ms) - inter-service calls adicionariam overhead
- Stateless design permite horizontal scaling se necessário
- Camadas claras facilitam future extraction se product evoluir

**Architecture Layers:**
1. **MCP Protocol Layer:** Handling stdio transport, MCP message format
2. **Tools Layer:** 3 MCP tools expostos (search_ids, get_id, call_id)
3. **Service Layer:** Business logic (SemanticSearchService, BitbucketClientService, AuthService)
4. **Core Layer:** Shared utilities (ConfigManager, Logger, CacheManager)
5. **Data Layer:** sqlite-vec database, OpenAPI schemas

**Design Patterns:**
- Dependency Injection (simple, não precisa de framework pesado)
- Repository pattern para acesso ao sqlite-vec
- Factory pattern para Bitbucket auth strategies
- Circuit breaker e retry decorators

### Architecture Diagrams & Visual Documentation

**Note:** Detailed diagrams will be created by the Architect during architecture phase. Below are textual descriptions and ASCII representations:

**1. System Architecture Overview (Layered Monolith)**

```
┌─────────────────────────────────────────────────────────┐
│  LLM Clients (Claude Desktop, Cursor, etc.)            │
└─────────────────────────┬───────────────────────────────┘
                          │ MCP Protocol (stdio)
┌─────────────────────────▼───────────────────────────────┐
│  MCP Protocol Layer                                     │
│  - Message handling, request/response serialization    │
└─────────────────────────┬───────────────────────────────┘
┌─────────────────────────▼───────────────────────────────┐
│  Tools Layer: search_ids, get_id, call_id              │
└─────────────────────────┬───────────────────────────────┘
┌─────────────────────────▼───────────────────────────────┐
│  Service Layer: SemanticSearch, BitbucketClient, Auth       │
└─────────────────────────┬───────────────────────────────┘
┌─────────────────────────▼───────────────────────────────┐
│  Core Layer: Config, Logger, Cache, CircuitBreaker     │
└─────────────────────────┬───────────────────────────────┘
┌─────────────────────────▼───────────────────────────────┐
│  Data Layer: sqlite-vec, OpenAPI schemas, Keychain     │
└─────────────────────────┬───────────────────────────────┘
                          ▼
                  Bitbucket DC REST API
```

**2. Authentication Flow (OAuth 2.0 PKCE)**

User initiates setup → Generate code_challenge → Open browser to Bitbucket /oauth/authorize → User approves → Callback to localhost:8080 → Exchange code for tokens (with code_verifier) → Store in OS Keychain → Use in Authorization headers → Auto-refresh on expiry

**3. Setup Wizard Flow (Story 4.1)**

```
START
  ↓
[Welcome Screen]
  ↓
[Enter Bitbucket URL] → Validate connectivity
  ↓
[Choose Auth Method]
  ├─ OAuth2 → Collect credentials → OAuth flow
  ├─ PAT → Collect token → Validate
  ├─ OAuth1.0a → 3-legged flow
  └─ Basic → Username/password
  ↓
[Test Connection] → Call /rest/api/latest/projects
  ↓
  ├─ SUCCESS → Show "✓ Connected successfully"
  └─ FAILURE → Show error + troubleshooting link → Retry
  ↓
[Optional Settings] (rate limit, timeout, log level)
  ↓
[Save Configuration]
  ├─ Write ~/.bitbucket-mcp/config.yml
  └─ Store credentials in OS Keychain
  ↓
[Success Screen] → "Run: bitbucket-mcp search 'create issue'"
  ↓
END
```

**4. Request Flow with Resilience Patterns**

```
LLM Request
  ↓
[Rate Limiter] → Under limit? → Proceed | Over limit? → Wait
  ↓
[Circuit Breaker] → CLOSED? → Execute | OPEN? → Fail fast
  ↓
[HTTP Request to Bitbucket]
  ↓
  ├─ Success (2xx) → Return result
  ├─ Transient (timeout, 429, 5xx) → Retry (1-3x, exponential backoff)
  ├─ Auth error (401, 403) → Refresh token → Retry once
  └─ Client error (400, 404) → Return error (no retry)
  ↓
[Update Circuit Breaker State]
  ├─ Success → Reset failure count
  └─ Failure → Increment count → Threshold reached? → Open circuit
  ↓
Return to LLM (normalized response)
```

**Architect Deliverables:** These flows will be formalized as Mermaid sequence diagrams, C4 architecture diagrams, and detailed component diagrams in the Architecture Document.

### Testing Requirements

**Decision:** Full Testing Pyramid (Unit + Integration + E2E smoke tests)

**Target Coverage:** ≥80% code coverage, 100% critical paths

**Testing Strategy:**

**1. Unit Tests (Majority - ~70% dos tests):**
- Todas as funções de business logic isoladas
- Semantic search algorithm
- Validation logic
- Error normalization
- Cache strategies
- Framework: Jest ou Vitest
- Mocking: Bitbucket API calls, file system, network

**2. Integration Tests (~25% dos tests):**
- MCP protocol message handling end-to-end
- sqlite-vec queries e performance
- OpenAPI parsing e transformation
- Auth flows (OAuth2, PAT) com mock servers
- Rate limiting e circuit breaker behavior
- Framework: Jest/Vitest com test containers se necessário

**3. E2E Smoke Tests (~5% dos tests):**
- Happy path: startup → search → get schema → call operation
- Auth setup wizard flow
- Docker container smoke test
- Executado em CI contra mock Bitbucket instance

**Testing Infrastructure:**
- CI/CD: GitHub Actions (Linux, macOS, Windows)
- Coverage reporting: Codecov ou Coveralls
- Performance benchmarks: hyperfine para latency tracking
- Mock Bitbucket API: MSW (Mock Service Worker) ou similar

**Manual Testing:**
- Beta testing (semanas 10-12) com 10-20 early adopters
- Real Bitbucket DC instance testing durante development
- LLM integration testing (Claude Desktop, Cursor)

### Additional Technical Assumptions and Requests

**Runtime & Language:**
- **Node.js:** 22+ LTS (Alpine Linux for Docker images)
- **TypeScript:** 5.x com strict mode
- **Package Manager:** npm (padrão, broad compatibility)

**Key Dependencies:**
- **@modelcontextprotocol/sdk:** Official MCP SDK da Anthropic
- **sqlite-vec:** Vector database para embeddings (embedded, zero-config)
- **Zod:** Runtime schema validation (type-safe, composable)
- **node-fetch:** HTTP client para Bitbucket API (Node 22+ native)
- **pino:** Structured logging (high-performance, JSON output)

**Embedding Model:**
- **Build-time & Runtime:** Transformers.js com Xenova/all-mpnet-base-v2 (768 dimensions, local)
- **Benefits:** $0 cost, air-gapped support, compliance-friendly (data never leaves infrastructure)
- **Performance:** ~80-150ms por embedding (CPU-only, acceptable)
- **Model size:** ~90MB one-time download, cached em ~/.cache/huggingface/

**OpenAPI Processing:**
- **Input:** Bitbucket DC REST API OpenAPI spec 11.0.1 (JSON format)
- **Build Script:** TypeScript script que parse, extrai operations, gera embeddings, popula sqlite-vec
- **Output:** embeddings.db, generated-schemas.ts, operation-metadata.json

**Authentication:**
- **Storage:** node-keytar para OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Fallback:** Encrypted JSON file se keychain unavailable
- **OAuth2 Flow:** PKCE (Proof Key for Code Exchange) para security

**Deployment:**
- **Docker:** Multi-stage builds (build → production image <200MB)
- **npm:** Published to npm registry para global install (`npm i -g bitbucket-dc-mcp`)
- **Binaries:** Consider pkg ou ncc para standalone executables v1.1+

### Deployment Strategy

**Release Channels:**
- **stable:** Production releases (npm `latest` tag, Docker `stable` tag)
- **beta:** Pre-release testing (npm `beta` tag, Docker `beta` tag)
- **dev:** Development builds (npm `dev` tag, Docker `dev` tag)

**Release Process:**
1. **Version Bump:** Semantic versioning (major.minor.patch) via `npm version`
2. **Changelog Generation:** Auto-generated from conventional commits
3. **Build & Test:** CI/CD runs full test suite (unit, integration, e2e)
4. **Publish npm:** Automated via GitHub Actions on git tag push
5. **Build Docker:** Multi-platform (linux/amd64, linux/arm64) via Docker Buildx
6. **Release Notes:** Auto-generated from changelog, published to GitHub Releases

**CI/CD Pipeline (GitHub Actions):**
- **Pull Requests:** Lint, type-check, test, build (Linux/macOS/Windows matrix)
- **Main Branch:** Same as PR + integration tests com mock Bitbucket API
- **Git Tags:** Full pipeline + publish npm + Docker + create GitHub Release
- **Nightly:** Run benchmark suite, update performance metrics dashboard

**Database Migration Strategy:**
- **embeddings.db versioning:** Schema version stored in metadata table
- **Migrations:** SQL scripts em `migrations/` folder (auto-applied on startup)
- **Rollback:** Each migration tem rollback script correspondente
- **Zero-downtime:** New versions backward compatible com old database schemas
- **Rebuild strategy:** Se schema change quebra compatibility, trigger full rebuild via `npm run rebuild-db`

**Configuration Updates:**
- **Config file format:** Backward compatible (novos campos tem defaults)
- **Breaking changes:** Require major version bump e migration guide
- **Auto-migration:** Setup wizard detecta old configs e oferece migração

**Rollback Strategy:**
- **npm:** Users podem instalar versão específica: `npm i -g bitbucket-dc-mcp@1.2.3`
- **Docker:** Tags versionadas permitem rollback: `docker pull bitbucket-dc-mcp:1.2.3`
- **Data compatibility:** Database migrations são reversíveis

**Health Checks:**
- **Startup validation:** Verifica config file, database, OpenAPI spec integrity
- **Runtime monitoring:** Log health status periodicamente
- **Failure modes:** Graceful degradation (ex: search offline → fallback to exact match)

**Configuration:**
- **Format:** YAML ou JSON (user preference)
- **Location:** `~/.bitbucket-mcp/config.yml` (auto-created via wizard)
- **Env Vars:** Override config file (12-factor app pattern)
- **Secrets:** NEVER in config file - apenas em OS keychain ou env vars

**Observability:**
- **Logging:** pino structured logs (JSON) com correlation IDs
- **Metrics:** Consider prom-client para Prometheus metrics v1.1+
- **Tracing:** OpenTelemetry integration v1.2+ para distributed tracing

**Offline Development:**
- **Mock Bitbucket API:** Mock server em `tests/mocks/bitbucket-api-mock.ts` para development offline
- **Fixture Data:** Sample Bitbucket responses em `tests/fixtures/` para testes
- **Local Database:** embeddings.db pode ser pre-generated e committed (compressed) para quick setup
- **OpenAPI Spec:** Spec file committed no repo (`data/openapi-spec.json`) para não depender de download
- **100% Air-gapped:** Embeddings gerados localmente, sem dependência de APIs externas
- **Development Scripts:** `npm run dev:offline` inicia server com mocks e fixtures

**Security:**
- **Dependencies:** Automated security scanning (npm audit, Snyk)
- **HTTPS:** Enforce HTTPS para Bitbucket DC connections (reject HTTP in prod)
- **Input Sanitization:** All user inputs validated contra schemas antes de processing
- **No Credentials in Logs:** Mask sensitive data em logs

**Performance:**
- **Startup Optimization:** Lazy-load embeddings database (defer até primeira search)
- **Memory Profiling:** Regular heap snapshots durante development para leak detection
- **Benchmarking:** Track p50, p95, p99 latencies para search e call operations

**Documentation:**
- **In-Code:** TSDoc comments para public APIs
- **Markdown Docs:** README, CONTRIBUTING, API Reference, Troubleshooting
- **Examples:** Cookbook com 20+ common use cases (create issue, assign, transition, bulk ops)
- **Architecture Decision Records (ADRs):** Document key technical decisions

### Deployment & Operational Requirements

**Deployment Scenarios:**

**1. Docker Deployment (Primary)**
- **Production:** `docker run -d --name bitbucket-mcp -v /data/config:/root/.bitbucket-mcp bitbucket-dc-mcp:latest`
- **Kubernetes:** Deployment + ConfigMap (config.yml) + Secret (credentials)
- **Docker Compose:** Multi-container setup with volume mounts for persistence
- **Health Check:** `HEALTHCHECK CMD node dist/health-check.js || exit 1` (v1.1+)

**2. npm Global Install**
- **Production:** `npm install -g bitbucket-dc-mcp@latest` → run as systemd service or PM2
- **Development:** `npm install -g bitbucket-dc-mcp@next` → development/beta versions

**3. Bare Metal / VM**
- **Prerequisites:** Node.js 22+ LTS, sqlite-vec dependencies
- **Installation:** Clone repo → `npm install` → `npm run build` → `node dist/index.js`
- **Process Manager:** systemd unit file, PM2, or supervisord

**Rollback Procedures:**

**Docker Rollback:**
```bash
# Tag previous working version
docker tag bitbucket-dc-mcp:latest bitbucket-dc-mcp:rollback

# Pull new version
docker pull bitbucket-dc-mcp:latest

# If new version fails, rollback
docker stop bitbucket-mcp
docker run -d --name bitbucket-mcp bitbucket-dc-mcp:rollback

# Verify
docker logs bitbucket-mcp | tail -50
```

**npm Rollback:**
```bash
# Check installed version
npm list -g bitbucket-dc-mcp

# Rollback to previous version
npm install -g bitbucket-dc-mcp@<previous-version>

# Or pin to specific version
npm install -g bitbucket-dc-mcp@1.0.0
```

**Configuration Rollback:**
- Config files are versioned: `config.yml.backup-YYYYMMDD-HHMMSS`
- Credentials remain in OS keychain (not affected by config changes)
- Restore: `cp ~/.bitbucket-mcp/config.yml.backup-20250115 ~/.bitbucket-mcp/config.yml`

**Monitoring & Observability:**

**Logs:**
- **Location:** `~/.bitbucket-mcp/logs/app.log` (rotating, max 100MB)
- **Format:** JSON structured logs (parseable by ELK, Splunk, Datadog)
- **Correlation:** Each request has `correlation_id` for tracing
- **Log Levels:** DEBUG, INFO, WARN, ERROR (configurable via `LOG_LEVEL` env var)

**Metrics (v1.1+):**
- **Endpoint:** `/metrics` (Prometheus format)
- **Key Metrics:** request_count, request_duration, error_rate, circuit_breaker_state, cache_hit_rate
- **Alerting:** Prometheus AlertManager rules for high error rates, circuit breaker opens

**Health Checks (v1.1+):**
- **Endpoint:** `/health` (returns 200 OK if healthy, 503 if degraded)
- **Checks:** Bitbucket connectivity, sqlite-vec database, OS keychain access
- **Format:** `{"status": "healthy", "components": {"bitbucket": "ok", "database": "ok"}}`

**Disaster Recovery:**

**Data Backup:**
- **Embeddings DB:** `data/embeddings.db` → backup weekly (generated from OpenAPI, can be regenerated)
- **Configuration:** `~/.bitbucket-mcp/config.yml` → backup after changes
- **Credentials:** OS Keychain (user must back up system keychain via OS tools)

**Recovery Scenarios:**
1. **Corrupted embeddings.db:** Regenerate via `npm run build-embeddings`
2. **Lost config:** Re-run setup wizard `bitbucket-mcp setup`
3. **Lost credentials:** Re-authenticate via wizard
4. **Total system failure:** Restore config + credentials → embeddings regenerate automatically on first search

### PRD Approval Process

**Stakeholders & Sign-Off:**

| Role | Responsibility | Approval Required |
|------|---------------|-------------------|
| **Product Manager** | PRD completeness, scope validation | ✅ Required |
| **Engineering Manager** | Technical feasibility, resource allocation | ✅ Required |
| **Architect** | Architecture approach, technical decisions | ✅ Required |
| **QA Lead** | Testability, quality standards | 🟡 Advisory |
| **Business Owner** | Budget approval, go/no-go decision | ✅ Required |

**Approval Workflow:**

1. **PRD Draft Complete** → PM circulates to stakeholders
2. **Technical Review** (2-3 days) → Architect + Engineering Manager validate feasibility
3. **Business Review** (1-2 days) → Business Owner validates budget/ROI
4. **Feedback Incorporation** (1-2 days) → PM updates PRD based on feedback
5. **Final Approval** (1 day) → All required stakeholders sign off (email/Slack thread)
6. **Architecture Phase Start** → Architect begins work with approved PRD

**Sign-Off Criteria:**
- ✅ All HIGH priority gaps addressed
- ✅ MVP scope agreed upon (can be reduced, not increased)
- ✅ Technical risks identified with mitigation plans
- ✅ Timeline and budget approved (12-16 weeks, 2 devs)
- ✅ Success metrics aligned with business goals

**Approval Log:**

| Stakeholder | Date | Status | Comments |
|------------|------|--------|----------|
| PM (John) | 2025-01-15 | ✅ Approved | PRD complete, ready for architect |
| Architect | _Pending_ | 🔄 In Review | Will approve after architecture phase |
| Engineering Manager | _Pending_ | 🔄 In Review | Needs resource allocation confirmation |
| Business Owner | _Pending_ | 🔄 In Review | Budget review scheduled |

**Change Control Post-Approval:**
- Minor changes (clarifications, AC refinements): PM approval only
- Major changes (scope additions, timeline extensions): Full re-approval required
- All changes tracked in Change Log table

---

