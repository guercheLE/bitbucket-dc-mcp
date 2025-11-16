# Next Steps

### UX Expert Prompt

*N/A para este projeto* - Produto é backend CLI tool sem interface gráfica. Não há necessidade de UX Expert para MVP. Future considerations: Web dashboard para monitoring/configuration (v2.0+).

### Architect Prompt

"Como Architect, por favor crie o Architecture Document completo para o **Bitbucket DataCenter MCP Server** baseado neste PRD. Use o template `fullstack-architecture-tmpl.yaml` focando nos seguintes aspectos críticos:

1. **Tech Stack Decisions:** Node.js 22+, TypeScript 5.x, MCP SDK, sqlite-vec, Zod validation - justifique escolhas técnicas
2. **System Architecture:** Layered monolith com camadas (MCP Protocol → Tools → Services → Core), stateless design para horizontal scaling
3. **Data Architecture:** sqlite-vec para embeddings (build-time generated), OS keychain para credentials, config files (YAML)
4. **API Design:** 3 MCP tools (search_ids, get_id, call_id) com schemas detalhados, OpenAPI processing pipeline
5. **Authentication:** Multi-strategy pattern (OAuth2, PAT, OAuth1, Basic) com secure storage e token refresh
6. **Resilience Patterns:** Rate limiting, retries com exponential backoff, circuit breaker, graceful degradation
7. **Performance:** Latency targets (p95 <500ms search, <2s call), throughput (100 req/s), memory (<512MB baseline)
8. **Testing Strategy:** Full pyramid (unit/integration/e2e), ≥80% coverage, benchmark suite para search relevance
9. **Deployment:** Docker multi-arch (amd64, arm64), npm global package, self-hosted on-premise
10. **Observability:** Structured logging (pino), correlation IDs, metrics (future Prometheus), audit trail

Referências importantes deste PRD:
- Epic 1: Semantic search com >90% relevância é core differentiator
- Epic 2: MCP protocol integration via stdio transport
- Epic 3: Production resilience é non-negotiable para enterprise adoption
- Epic 4: Setup <5min é critical success metric

Por favor documente decisões arquiteturais com ADRs (Architecture Decision Records) onde aplicável, especialmente para: embedding model choice, auth strategy pattern, monolith vs microservices, sqlite-vec vs alternatives."

