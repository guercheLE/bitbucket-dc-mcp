# Requirements

### Functional

**FR1:** O sistema deve fornecer busca semântica de endpoints Bitbucket através do tool MCP `search_ids`, aceitando queries em linguagem natural (ex: "como atualizar assignee de issue") e retornando top 5 operações relevantes com scores de confiança >90%

**FR2:** O sistema deve fornecer recuperação completa de schema através do tool MCP `get_id`, incluindo definição do endpoint, parâmetros obrigatórios/opcionais, tipos de dados, exemplos de request/response curl, e links para documentação oficial

**FR3:** O sistema deve fornecer execução validada de operações Bitbucket através do tool MCP `call_id`, com validação automática de input contra schema OpenAPI, tratamento robusto de erros, e normalização de respostas Bitbucket para formato MCP

**FR4:** O sistema deve suportar múltiplos métodos de autenticação Bitbucket DC: OAuth 2.0 (recomendado), Personal Access Token (recomendado), OAuth 1.0a (fallback), e Basic HTTP Authentication (fallback), com refresh automático de tokens OAuth2

**FR5:** O sistema deve processar e transformar a especificação OpenAPI 11.0.1 do Bitbucket DC em tempo de build para gerar: (a) lista de operações com IDs únicos, (b) schemas de validação Zod/AJV, (c) embeddings vetoriais para busca semântica, (d) estruturas de entidades e relacionamentos

**FR6:** O sistema deve armazenar embeddings vetoriais em banco sqlite-vec local, permitindo busca semântica offline com latência <100ms para queries típicas

**FR7:** O sistema deve implementar rate limiting configurável (padrão 100 req/s) para proteger instâncias Bitbucket DC de sobrecarga

**FR8:** O sistema deve implementar retries automáticos com exponential backoff (até 3 tentativas) para operações Bitbucket que falham devido a erros transientes (timeouts, 429 rate limits, 5xx server errors)

**FR9:** O sistema deve implementar circuit breaker pattern para proteger contra cascading failures quando Bitbucket DC está com problemas

**FR10:** O sistema deve fornecer setup zero-friction através de: (a) Docker one-liner `docker run`, (b) npm install global, com wizard interativo guiando configuração em <5 minutos

**FR11:** O sistema deve auto-descobrir configuração através de variáveis de ambiente ou arquivo de configuração, com validação e feedback claro de erros de configuração

**FR12:** O sistema deve manter cache LRU em memória para operações frequentes (schemas, metadados de endpoints) com estratégia de invalidação inteligente

**FR13:** O sistema deve implementar structured logging com níveis configuráveis (DEBUG, INFO, WARN, ERROR) e formatação JSON para facilitar observability

**FR14:** O sistema deve persistir state de autenticação (tokens OAuth, refresh tokens) de forma segura usando OS keychain quando disponível

**FR15:** O sistema deve validar todos inputs de usuário contra schemas OpenAPI antes de enviar requests para Bitbucket DC, retornando erros descritivos em caso de validação falhar

**FR16:** O sistema deve normalizar códigos de erro HTTP Bitbucket (400, 401, 403, 404, 429, 500, 503) para mensagens de erro compreensíveis no formato MCP

**FR17:** O sistema deve suportar configuração de base URL customizada para instâncias Bitbucket DC on-premise

**FR18:** O sistema deve documentar todas as operações Bitbucket disponíveis através do sistema de busca semântica, incluindo operações de issues, projects, users, workflows, custom fields, boards, sprints, e outras entidades Bitbucket

### Non Functional

**NFR1:** O sistema deve atingir latência p95 <500ms para operações `search_ids` e <2s para operações `call_id` (excluindo tempo de resposta do Bitbucket DC)

**NFR2:** O sistema deve suportar throughput mínimo de 100 requests/segundo por instância sob condições normais de operação

**NFR3:** O sistema deve consumir <512MB de memória RAM em baseline e <2GB sob carga pesada

**NFR4:** O sistema deve iniciar em <5 segundos do comando de execução até estar pronto para aceitar requests MCP

**NFR5:** O sistema deve manter >98% de taxa de sucesso em operações `call_id` quando Bitbucket DC está operacional (excluindo erros de validação de input do usuário)

**NFR6:** O sistema deve funcionar em plataformas: Linux (Ubuntu 20.04+, RHEL 8+), macOS (Intel + Apple Silicon), Windows (via WSL2 ou Docker)

**NFR7:** O sistema deve suportar arquiteturas multi-arch para Docker: amd64 (x86_64) e arm64 (Apple Silicon, ARM servers)

**NFR8:** O sistema deve ser stateless em sua arquitetura core, permitindo escalabilidade horizontal através de múltiplas instâncias

**NFR9:** O sistema deve ter cobertura de testes automatizados ≥80% (unit + integration tests) com zero critical bugs conhecidos no lançamento v1.0

**NFR10:** O sistema deve usar HTTPS para todas as comunicações com Bitbucket DC (não permitir HTTP em produção)

**NFR11:** O sistema deve implementar graceful degradation quando funcionalidades auxiliares (cache, logging enriquecido) falham, mantendo funcionalidade core operacional

**NFR12:** O sistema deve ser compatível com Node.js 22+ LTS e TypeScript 5.x

**NFR13:** O sistema deve seguir semantic versioning (semver) para releases e manter changelog detalhado

**NFR14:** O sistema deve fornecer documentação abrangente incluindo: quick start guide, authentication setup, API reference, troubleshooting guide, e contributing guidelines

**NFR15:** O sistema deve suportar air-gapped deployments (offline operation após setup inicial e download de embeddings)

**NFR16:** O sistema deve implementar structured audit trail através de logs JSON para todas as operações executadas via `call_id`

---

