# Epic 3: Multi-Auth & Production Resilience

**Epic Goal:** Adicionar suporte robusto para múltiplos métodos de autenticação Bitbucket DC (OAuth 2.0, PAT, OAuth 1.0a, Basic) com secure credential storage, implementar production resilience patterns (circuit breaker, graceful degradation, structured logging detalhado), e adicionar observability features - garantindo que o produto está pronto para produção com confiabilidade e segurança enterprise-grade. Este epic transforma MVP funcional (Epic 2) em production-ready system que pode ser deployed com confiança em organizações enterprise.

### Story 3.1: Authentication Framework & Strategy Pattern

As a **developer**,  
I want **framework de autenticação com strategy pattern suportando múltiplos auth methods**,  
so that **posso adicionar OAuth2, PAT, OAuth1.0a, e Basic auth com código extensível e testável**.

**Acceptance Criteria:**

1. Interface `AuthStrategy` em `src/auth/auth-strategy.ts` definida com métodos: `authenticate(config): Promise<Credentials>`, `refreshToken?(credentials): Promise<Credentials>`, `validateCredentials(credentials): boolean`
2. Classe base `AuthManager` em `src/auth/auth-manager.ts` implementada com: strategy selection, credentials caching, refresh logic
3. AuthManager seleciona strategy baseado em config: `auth.method: 'oauth2' | 'pat' | 'oauth1' | 'basic'`
4. AuthManager implementa credentials lifecycle: load from storage → validate → use → refresh if needed → persist
5. AuthManager has error handling: invalid credentials, expired tokens, auth failures retornam typed errors
6. AuthManager integra com BitbucketClientService: adiciona auth headers (Authorization, OAuth headers) automaticamente em requests
7. AuthManager tem logging: auth method used, token refresh events, auth failures
8. Unit tests validam: strategy selection, credentials validation, refresh logic, error handling

### Story 3.2: OAuth 2.0 Authentication Strategy

As a **developer**,  
I want **OAuth 2.0 authentication com PKCE flow suportando Bitbucket DC**,  
so that **usuários podem autenticar de forma segura sem compartilhar passwords**.

**Acceptance Criteria:**

1. Classe `OAuth2Strategy` em `src/auth/strategies/oauth2.ts` implementa interface AuthStrategy
2. Strategy implementa OAuth 2.0 Authorization Code flow com PKCE (Proof Key for Code Exchange)
3. Strategy gera authorization URL: redirect user para Bitbucket DC `/oauth/authorize` com: client_id, redirect_uri, scope, state, code_challenge
4. Strategy tem local HTTP server (express) listening em `localhost:8080` (configurable port) para callback
5. Strategy troca authorization code por access token via POST `/oauth/token` com code_verifier
6. Strategy armazena: access_token, refresh_token, expires_at, scope
7. Strategy implementa `refreshToken()`: usa refresh_token para obter novo access_token quando expira
8. Strategy valida tokens: check expires_at, call Bitbucket `/rest/api/latest/projects` endpoint para validate
9. Integration test com mock OAuth server valida: full flow, token refresh, error cases (invalid code, expired token)
10. Manual test documentation para setup com real Bitbucket DC OAuth application

### Story 3.3: Personal Access Token (PAT) Strategy

As a **developer**,  
I want **Personal Access Token authentication suportando Bitbucket DC PATs**,  
so that **usuários podem usar auth method mais simples para casos não-interactive**.

**Acceptance Criteria:**

1. Classe `PATStrategy` em `src/auth/strategies/pat.ts` implementa interface AuthStrategy
2. Strategy aceita PAT token via config: `auth.token: string`
3. Strategy adiciona header `Authorization: Bearer <token>` em todas as requests
4. Strategy valida PAT calling `/rest/api/latest/projects` endpoint (se falha 401, token inválido)
5. Strategy não tem refresh logic (PATs são long-lived até revoked)
6. Strategy tem error handling: invalid token, expired token, revoked token retornam clear errors
7. Strategy loga: PAT validation events, expiration warnings (se Bitbucket retorna expiry info)
8. Unit tests validam: token validation, header formatting, error handling
9. Integration test com mock Bitbucket API valida: successful auth, invalid token handling

### Story 3.4: OAuth 1.0a & Basic Auth Fallback Strategies

As a **developer**,  
I want **OAuth 1.0a e Basic HTTP auth como fallback methods para legacy Bitbucket DC**,  
so that **produto funciona com versões antigas de Bitbucket que não suportam OAuth2/PAT**.

**Acceptance Criteria:**

1. Classe `OAuth1Strategy` em `src/auth/strategies/oauth1.ts` implementa OAuth 1.0a three-legged flow (request token → authorize → access token)
2. OAuth1Strategy usa biblioteca `oauth-1.0a` para signature generation (HMAC-SHA1)
3. OAuth1Strategy adiciona OAuth headers: `oauth_token`, `oauth_signature`, etc.
4. Classe `BasicAuthStrategy` em `src/auth/strategies/basic.ts` implementa Basic HTTP Authentication
5. BasicAuthStrategy aceita username + password via config, encode como `Authorization: Basic base64(username:password)`
6. BasicAuthStrategy valida credentials calling `/rest/api/latest/projects` endpoint
7. Both strategies têm warning logs: "OAuth 1.0a is deprecated, consider upgrading to OAuth2", "Basic auth is insecure over HTTP, use HTTPS"
8. Unit tests validam: signature generation (OAuth1), base64 encoding (Basic), error handling
9. Documentation explica: quando usar cada method, security implications, setup instructions

### Story 3.5: Secure Credential Storage with OS Keychain

As a **user**,  
I want **credentials armazenadas de forma segura no OS keychain (macOS/Windows/Linux)**,  
so that **meu access token não fica em plaintext em disco e é protegido pelo sistema operacional**.

**Acceptance Criteria:**

1. Classe `CredentialStorage` em `src/core/credential-storage.ts` implementada usando node-keytar library
2. Storage salva credentials em OS-native keychain: macOS Keychain, Windows Credential Manager, Linux Secret Service
3. Storage API: `save(key, value)`, `load(key)`, `delete(key)`, `list()` - todas async
4. Credentials são armazenadas com namespace: service="bitbucket-dc-mcp", account=bitbucket-url ou profile-name
5. Storage tem fallback: se keychain unavailable (Linux sem libsecret), usa encrypted JSON file `~/.bitbucket-mcp/credentials.enc` com encryption key derived de machine-specific identifier
6. Storage implementa encryption para fallback: AES-256-GCM com random IV
7. Storage valida: credentials não são logados, não estão em error messages, não vazam em stack traces
8. Unit tests com mock keychain validam: save/load/delete, namespace handling, error handling
9. Integration tests em cada platform (Linux/macOS/Windows) validam: keychain integration works, fallback funciona quando keychain unavailable

### Story 3.6: Circuit Breaker Implementation

As a **developer**,  
I want **circuit breaker pattern implementado para proteger contra cascading failures quando Bitbucket DC está down**,  
so that **sistema gracefully degrada e não sobrecarrega Bitbucket com requests quando está com problemas**.

**Acceptance Criteria:**

1. Classe `CircuitBreaker` em `src/core/circuit-breaker.ts` implementada com estados: CLOSED, OPEN, HALF_OPEN
2. Circuit breaker wraps `BitbucketClientService.executeOperation()` method
3. Estado CLOSED: requests passam normalmente, failures são tracked
4. Estado OPEN: requests fail-fast sem chamar Bitbucket, retorna error "Circuit breaker is OPEN, Bitbucket DC may be down"
5. Threshold para abrir: 5 failures consecutivos OU 50% failure rate em 10s window
6. Estado HALF_OPEN: após timeout (30s default), permite 1 request de teste. Se sucesso → CLOSED, se falha → OPEN
7. Circuit breaker tem metrics: state, failure count, success count, last state change timestamp
8. Circuit breaker loga: state transitions com rationale, health check results
9. Circuit breaker é configurável: failure threshold, timeout, window size
10. Unit tests validam: state transitions, thresholds, health checks, concurrent requests handling

### Story 3.7: Graceful Degradation & Error Recovery

As a **user**,  
I want **sistema que degrada gracefully quando componentes falham, mantendo funcionalidade core**,  
so that **não perco toda funcionalidade quando há problema parcial (ex: cache down mas Bitbucket up)**.

**Acceptance Criteria:**

1. Sistema identifica componentes críticos vs opcionais: CRITICAL=(Bitbucket API, Auth), OPTIONAL=(Cache, Embeddings DB para search)
2. Se componente CRITICAL falha: MCP server retorna error clear, sugere recovery action (check credentials, check Bitbucket URL)
3. Se componente OPTIONAL falha: sistema continua operando sem feature, loga warning
4. Cache failures: sistema faz direct calls sem cache, loga "Cache unavailable, operating without caching"
5. Search DB failures: `search_ids` tool retorna error "Semantic search unavailable, please use operation ID directly", mas `get_id` e `call_id` continuam funcionando
6. Sistema implementa health checks: `/health` endpoint (future v1.1) reporta status de cada componente
7. Sistema tem startup resilience: se embeddings.db missing, loga error mas permite `call_id` com known operation IDs
8. Sistema tem shutdown resilience: gracefully fecha connections, flush logs, salva state antes de exit
9. Integration tests validam: degraded operation scenarios (cache down, search down), recovery após component restart

### Story 3.8: Structured Logging & Observability

As a **SRE/DevOps engineer**,  
I want **logging estruturado com correlation IDs e rich context para debugging e monitoring**,  
so that **posso troubleshoot issues rapidamente em produção e integrar com observability tools (ELK, Datadog)**.

**Acceptance Criteria:**

1. Logger configurado com pino: JSON output, log levels (DEBUG, INFO, WARN, ERROR), customizable via env var `LOG_LEVEL`
2. Todos os logs incluem: timestamp, level, correlation_id (uuid gerado por request MCP), service="bitbucket-dc-mcp", version
3. Request logs incluem: tool_name, operation_id (se aplicável), user_agent (do MCP client), latency_ms
4. Error logs incluem: error_type, error_message, stack_trace, context (operation being executed, input params - sanitized)
5. Auth logs incluem: auth_method, auth_status (success/failure), user_id (se disponível), bitbucket_url
6. Performance logs incluem: operation latency histograms, cache hit/miss rates, rate limiting events
7. Sensitive data é sanitizado: credentials, tokens, passwords são masked ("***") em logs
8. Logger tem rotation: logs são rotated daily ou quando atingem 100MB (usando pino-rotating-file)
9. Logger output pode ser configurado: stdout (default), file, ou ambos via config
10. Audit trail implementado: todas as mutações (POST, PUT, DELETE) logadas com INFO level incluindo: operation_id, bitbucket_url, method, path, timestamp, correlation_id, user_id (do Bitbucket), e params sanitizados (NFR16 compliance)
11. Integration tests validam: logs são gerados corretamente, correlation IDs propagam, sensitive data é masked, audit trail completo para mutações

---

