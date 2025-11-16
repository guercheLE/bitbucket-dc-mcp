# Architecture Decision Records (ADRs)

### ADR-001: Layered Monolith over Microservices

**Status:** Accepted

**Context:** 
MVP scope é bem definido (3 MCP tools + semantic search). Latency target é crítico (<500ms p95 search). Team pequeno (2 devs).

**Decision:** 
Implementar como layered monolith stateless ao invés de microservices.

**Consequences:**
- ✅ Simplicidade: Single codebase, single deployment
- ✅ Performance: No inter-service network calls
- ✅ Debugging: Easier stack traces, single log stream
- ✅ Development speed: Faster iteration, no distributed system complexity
- ⚠️ Future scaling: Se product grow significativamente, pode precisar extract services (semantic search, bitbucket client)
- ⚠️ Technology lock-in: Harder to use different languages for different parts

**Migration Path:** 
Se futuro crescimento exigir, services podem ser extracted mantendo interfaces. Circuit breaker e stateless design facilitam essa transição.

---

### ADR-002: sqlite-vec over Pinecone/Weaviate

**Status:** Accepted

**Context:** 
Semantic search requer vector database. Opções: Managed (Pinecone, Weaviate Cloud) vs Embedded (sqlite-vec, Chroma).

**Decision:** 
Usar sqlite-vec (embedded vector database).

**Consequences:**
- ✅ Zero-config: No server setup, no credentials management
- ✅ Air-gapped support: Works offline (compliance requirement)
- ✅ Cost: $0 (vs $70+/mês Pinecone Starter)
- ✅ Performance: <100ms queries suficiente para 500 operations
- ✅ Simplicity: Single database file, easy backup/restore
- ⚠️ Scale limit: Não escala para 10M+ vectors (não é requirement v1.0)
- ⚠️ Single-node: No distributed search (aceitável para MVP)

**Migration Path:** 
Se scale requirements mudarem (>100K operations), pode migrar para Pinecone/Weaviate mantendo EmbeddingsRepository interface.

---

### ADR-003: Local Embeddings (Transformers.js) over OpenAI/Cohere APIs

**Status:** Accepted (Revised 2025-01-15)

**Context:** 
Embeddings generation precisa balancear: quality (search relevance), cost, latency, deployment complexity. Requisito crítico: suporte a air-gapped deployments para compliance (GDPR, HIPAA, SOC2).

**Decision:** 
Usar Transformers.js com modelo local `Xenova/all-mpnet-base-v2` (768 dimensions) para build-time e runtime embeddings.

**Consequences:**
- ✅ Air-gapped: 100% offline, zero dependência externa
- ✅ Cost: $0 operational cost (vs $0.10-0.20 por rebuild com OpenAI)
- ✅ Privacy: Data never leaves customer infrastructure (compliance requirement)
- ✅ Latency: ~80-150ms para embedding generation (acceptable para search)
- ✅ Simplicity: npm install, zero-config, cross-platform
- ✅ Quality: ~85-90% relevance (sufficient para Bitbucket operations domain)
- ⚠️ Model size: ~90MB model download (one-time, cached locally)
- ⚠️ Dimensionality: 768 vs 1536 (trade-off accepted para air-gapped support)
- ⚠️ CPU-only: No GPU acceleration em v1.0 (suficiente para <1000 operations)

**Why not OpenAI/Cohere?**
External APIs são deal-breaker para 70%+ do target market (enterprise orgs com compliance requirements). Air-gapped support é must-have, não nice-to-have.

**Migration Path:** 
Se quality/latency forem insuficientes, pode adicionar GPU support via ONNX Runtime ou considerar larger models (all-mpnet-base-v2 → e5-large-v2 1024 dim).

---

### ADR-004: Vitest over Jest

**Status:** Accepted

**Context:** 
Testing framework escolha: Jest (industry standard) vs Vitest (modern, fast).

**Decision:** 
Usar Vitest como test runner.

**Consequences:**
- ✅ Performance: 10x faster (Vite-powered, ESM native)
- ✅ Developer Experience: Excellent watch mode, parallel execution
- ✅ TypeScript: Zero-config, native support
- ✅ Jest compatibility: Drop-in API replacement (expect, describe, it)
- ⚠️ Ecosystem: Smaller plugin ecosystem vs Jest
- ⚠️ Maturity: Newer (2021) vs Jest (2014)

**Rationale:** 
Performance benefits outweigh ecosystem gap. Jest API compatibility mitiga migration risk se necessário.

---

### ADR-005: Strategy Pattern for Multi-Auth

**Status:** Accepted

**Context:** 
Bitbucket DC suporta 4 auth methods (OAuth2, PAT, OAuth1, Basic). Need extensible design.

**Decision:** 
Implementar Strategy Pattern com `AuthStrategy` interface.

**Consequences:**
- ✅ Extensibility: Easy adicionar novo auth method (ex: SAML v1.1)
- ✅ Testability: Mock strategy em testes
- ✅ Separation of Concerns: Cada strategy é isolated
- ⚠️ Complexity: Mais classes do que if/else simples
- ⚠️ Indirection: Extra layer para debug

**Rationale:** 
Extensibility justifica complexity. Auth é critical path que muda frequentemente (novos métodos, token refresh logic).

---

### ADR Template & Guidelines

**Purpose:**
Architecture Decision Records (ADRs) documentam decisões importantes de arquitetura que afetam o projeto a longo prazo. Eles capturam o contexto, a decisão, as consequências, e caminhos de migração para futuras referências.

**When to Create an ADR:**
- Technology selection (libraries, frameworks, databases)
- Architectural patterns (monolith vs microservices, layered vs hexagonal)
- Integration approaches (API contracts, auth methods)
- Performance trade-offs (caching strategies, database choices)
- Security decisions (encryption, credential storage)

**ADR Template:**

```markdown
### ADR-XXX: [Title - Concise Decision Summary]

**Status:** [Proposed | Accepted | Deprecated | Superseded by ADR-YYY]

**Context:**
[Descreva o problema ou situação que levou a essa decisão. Inclua:
- Requirements técnicos ou business
- Constraints (orçamento, time, compliance)
- Opções consideradas
- Stakeholders envolvidos]

**Decision:**
[A decisão tomada, de forma clara e objetiva. Use presente do indicativo.]

**Consequences:**
[Liste as consequências positivas e negativas da decisão:
- ✅ Benefits (simplicidade, performance, custo, etc.)
- ⚠️ Trade-offs (limitações, riscos, tech debt)
- ❌ Downsides (se aplicável)]

**Alternatives Considered:**
[Opcional: Outras opções que foram avaliadas e por que não foram escolhidas]

**Migration Path:**
[Como mitigar trade-offs ou migrar para outra solução se requirements mudarem]

**References:**
[Links para docs, benchmarks, artigos que influenciaram a decisão]

**Date:** YYYY-MM-DD
**Authors:** [Nome dos decision makers]
```

**ADR Lifecycle:**
1. **Proposed:** Decisão em discussão
2. **Accepted:** Decisão aprovada e implementada
3. **Deprecated:** Ainda em uso mas não recomendada para novo código
4. **Superseded:** Substituída por outra decisão (referenciar ADR substituto)

**ADR File Naming:**
```
docs/adrs/
├── ADR-001-layered-monolith.md
├── ADR-002-sqlite-vec.md
├── ADR-003-openai-embeddings.md
├── ADR-004-vitest-testing.md
└── ADR-005-auth-strategy-pattern.md
```

**Best Practices:**
- Keep ADRs concise (1-2 pages max)
- Focus on "why" not "how" (implementation details go in code comments)
- Update status when context changes
- Reference ADRs in code comments for critical decisions
- Review ADRs in architecture reviews
- Date ADRs to track evolution
- Link ADRs in PRD/Architecture docs where relevant

