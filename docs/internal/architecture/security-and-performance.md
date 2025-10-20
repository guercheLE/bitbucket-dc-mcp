# Security and Performance

### Security Requirements

**Frontend Security:**
- N/A (produto é backend/CLI apenas, não tem frontend web)

**Backend Security:**
- **Input Validation:** Todos os inputs são validados contra Zod schemas antes de processar. Reject invalid data early (fail fast).
- **Rate Limiting:** Token bucket algorithm limita 100 req/s (configurable) para proteger Bitbucket DC de overload. Client-side rate limiting evita atingir server limits.
- **CORS Policy:** N/A (não é HTTP server, é stdio transport)
- **HTTPS Enforcement:** Todas as conexões com Bitbucket DC devem usar HTTPS. Reject HTTP em produção (configurable para dev/test).
- **SQL Injection Prevention:** Usa prepared statements (better-sqlite3) para todas as queries. Nunca concatena SQL strings.
- **Dependency Scanning:** GitHub Dependabot + npm audit em CI/CD. Zero high-severity vulnerabilities no launch.
- **Secrets Management:** Nunca loga credentials. Redact tokens/passwords em logs (pino redaction). Environment vars ou OS keychain apenas.

**Authentication Security:**
- **Token Storage:** OS Keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service) para access tokens. Fallback: encrypted JSON file (AES-256-GCM).
- **Session Management:** Stateless (no sessions), cada MCP call é authenticated via token. Token refresh automático antes de expirar.
- **Password Policy:** N/A (não gerenciamos passwords, apenas armazenamos para Basic auth se configurado). Recommend OAuth2/PAT sobre Basic.
- **OAuth 2.0 Security:** PKCE (Proof Key for Code Exchange) para prevent authorization code interception. State parameter para CSRF protection.

### Performance Optimization

**Frontend Performance:**
- N/A (produto é backend/CLI apenas)

**Backend Performance:**
- **Bundle Size Target:** N/A (não há bundling, Node.js executa JavaScript compilado)
- **Loading Strategy:** Lazy-load embeddings database (defer até primeira search query). Startup rápido (<5s target).
- **Caching Strategy:** 
  - Query embeddings cache (LRU 1000 entries, TTL 1 hour)
  - Operation schemas cache (LRU 500 entries, never expire)
  - Bitbucket API response cache (future v1.2, adaptive TTL)

**Backend Performance:**
- **Response Time Target:** 
  - search_ids: p95 <500ms (includes OpenAI API call + sqlite-vec query)
  - get_id: p95 <100ms (cache hit), <200ms (cache miss)
  - call_id: p95 <2s (excludes Bitbucket DC response time)
- **Database Optimization:** 
  - sqlite-vec cosine similarity search: <50ms median
  - Pre-computed embeddings (no runtime computation except query)
  - Read-only database (no write contention)
- **Caching Strategy:** 
  - Memory cache (LRU) para frequent operations
  - Cache hit rate target: >80% for get_id
  - No distributed cache v1.0 (Redis future v1.2)

**Memory Management:**
- Baseline: <512MB RAM (idle state)
- Under load: <2GB RAM (100 req/s sustained)
- Embeddings DB: ~3-4MB loaded in memory (sqlite-vec mmap)
- Cache: ~100-200MB (1000 entries × ~100-200KB average)
- Leak prevention: Vitest heap snapshots em development

