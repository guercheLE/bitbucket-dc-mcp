# External APIs

## Local Models (No External APIs)

### Transformers.js (Local Embeddings)

- **Purpose:** Gerar embeddings vetoriais (768 dimensions) para operation descriptions (build-time) e user queries (runtime)
- **Library:** @xenova/transformers (Hugging Face Transformers.js)
- **Model:** Xenova/all-mpnet-base-v2
- **Authentication:** None (100% local, no API keys required)
- **Rate Limits:** None (CPU/memory bound only)

**Integration Notes:**
- Build-time: Gera embeddings para ~500 operations localmente
- Runtime: Gera embedding para user query usando mesmo modelo local
- Cost: $0 (vs $0.10-0.20 com APIs externas)
- Air-gapped: Funciona completamente offline após download inicial do modelo
- Caching: Modelo cached automaticamente em `~/.cache/huggingface/`
- Performance: ~80-150ms por embedding (CPU-only, acceptable)

---

### Bitbucket Data Center REST API

- **Purpose:** Executar operações CRUD em Bitbucket (projects, repositories, users, pull requests, branches)
- **Documentation:** https://developer.atlassian.com/server/bitbucket/rest/v1000/intro/
- **Base URL(s):** `https://{customer-bitbucket-domain}/rest/api/latest/` (configurable, also supports `/rest/api/1.0/`)
- **Authentication:** 
  - OAuth 2.0 (recommended): `Authorization: Bearer {access_token}`
  - Personal Access Token: `Authorization: Bearer {token}`
  - OAuth 1.0a: OAuth headers (oauth_token, oauth_signature, etc.)
  - Basic HTTP: `Authorization: Basic {base64(username:password)}`
- **Rate Limits:** Customer-controlled (default nenhum limit, mas implementamos client-side 100 req/s)

**Key Endpoints Used (examples, 500+ total):**
- `GET /rest/api/latest/projects` - List projects
- `GET /rest/api/latest/projects/{projectKey}` - Get project details
- `GET /rest/api/latest/projects/{projectKey}/repos` - List repositories
- `POST /rest/api/latest/projects/{projectKey}/repos` - Create repository
- `GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}` - Get repository details
- `GET /rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests` - List pull requests
- `GET /rest/api/latest/profile/recent/repos` - Get current user repos (auth test)

**Integration Notes:**
- OpenAPI Spec: v11.0.1 (JSON format) usado para gerar schemas e embeddings
- Versioning: API latest (modern instances), 1.0 (legacy instances)
- Error Handling: Normalize Bitbucket error codes (400/401/403/404/429/500/503) para MCP errors
- Retries: 3x exponential backoff (100ms, 500ms, 2s) para 429/5xx
- Circuit Breaker: Abre após 5 failures consecutivos, timeout 30s
- Timeout: 30s default (configurable)

