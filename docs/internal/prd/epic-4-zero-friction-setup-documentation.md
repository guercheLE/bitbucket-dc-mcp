# Epic 4: Zero-Friction Setup & Documentation

**Epic Goal:** Criar experiência de setup sem fricção através de wizard interativo CLI, Docker one-liner, e npm global install com auto-discovery de configuração, além de documentação abrangente cobrindo quick start, authentication setup, API reference, troubleshooting, e contributing guidelines - reduzindo setup time para <5 minutos target e preparando produto para v1.0 launch com onboarding experience que delights users. Este epic transforma production-ready system (Epic 3) em launch-ready product com exceptional DX (Developer Experience).

### Story 4.1: Interactive Setup Wizard

As a **new user**,  
I want **setup wizard interativo que me guia através de configuração inicial em <5 minutos**,  
so that **posso começar a usar o produto rapidamente sem ler documentação extensa**.

**Acceptance Criteria:**

1. CLI command `npm run setup` (ou `bitbucket-mcp setup` após global install) inicia wizard
2. Wizard welcome screen explica: what this tool does, what will be configured, estimated time (<5 min)
3. Wizard pergunta: Bitbucket DC base URL (valida format, testa connectivity com HEAD request)
4. Wizard pergunta: Auth method (lista options: OAuth2 [Recommended], PAT [Recommended], OAuth1.0a, Basic) com explanation de cada
5. Wizard coleta credentials baseado em auth method escolhido: OAuth2→client_id/secret, PAT→token, Basic→username/password
6. Wizard testa auth: chama `/rest/api/latest/projects` endpoint, mostra success "✓ Connected successfully" ou error com troubleshooting
7. Wizard pergunta: Optional settings (rate limit, timeout, log level) com smart defaults (most users skip)
8. Wizard salva config em `~/.bitbucket-mcp/config.yml` (YAML format, human-readable)
9. Wizard salva credentials em OS keychain via `CredentialStorage`
10. Wizard final screen: "✓ Setup complete! Next steps: [link to quick start guide]"
11. Wizard tem error handling: network failures, invalid credentials, interrupted setup (can resume)
12. Integration test simulates wizard flow com mock inputs, valida config file criado

### Story 4.2: Docker One-Liner Setup

As a **user**,  
I want **Docker container que roda MCP server com minimal configuration via env vars**,  
so that **posso deploy rapidamente em qualquer ambiente que suporta Docker**.

**Acceptance Criteria:**

1. Dockerfile multi-stage implementado: stage 1=build (TypeScript compilation), stage 2=production (apenas runtime dependencies)
2. Production image é baseado em `node:18-alpine` para minimal size (<200MB)
3. Image inclui embeddings.db pre-built (gerado durante Docker build)
4. Container expõe MCP server via stdio: `docker run --rm -i bitbucket-dc-mcp` aceita MCP protocol messages em stdin
5. Container aceita config via env vars: `BITBUCKET_URL`, `BITBUCKET_AUTH_METHOD`, `BITBUCKET_TOKEN` (PAT), `BITBUCKET_USERNAME`, `BITBUCKET_PASSWORD`
6. Container suporta volume mount para config file: `docker run -v ~/.bitbucket-mcp:/root/.bitbucket-mcp bitbucket-dc-mcp`
7. Container implementa health check: `HEALTHCHECK` directive valida server is running
8. Container tem entrypoint script que: valida required env vars, executa migrations se needed, inicia MCP server
9. Docker Compose example file fornecido para easy local testing
10. Documentation inclui: Docker Hub instructions, env var reference, volume mount patterns, troubleshooting
11. Multi-arch images publicados: amd64 (x86_64), arm64 (Apple Silicon, ARM servers) via GitHub Actions

### Story 4.3: npm Global Install Package

As a **developer**,  
I want **instalar via `npm install -g bitbucket-dc-mcp` e ter comando global `bitbucket-mcp` disponível**,  
so that **posso usar tool como qualquer outra CLI utility sem Docker**.

**Acceptance Criteria:**

1. Package.json configurado com: `bin` field aponta para compiled CLI entry point `dist/cli.js`
2. CLI entry point tem shebang `#!/usr/bin/env node` para execução direta
3. npm install instala package globalmente: `npm install -g bitbucket-dc-mcp` creates symlink `bitbucket-mcp` no PATH
4. Global command `bitbucket-mcp` aceita subcommands: `setup` (wizard), `search <query>`, `call <operationId> <params>`, `config`, `version`, `help`
5. Command `bitbucket-mcp setup` inicia interactive wizard (Story 4.1)
6. Command `bitbucket-mcp search "create issue"` executa standalone search (não via MCP, útil para testing)
7. Command `bitbucket-mcp config show` exibe current config (sanitized credentials)
8. Command `bitbucket-mcp version` exibe version info + check for updates (via npm registry API)
9. Command `bitbucket-mcp help` exibe usage documentation
10. Package pre-install script valida: Node.js version ≥18, platform supported
11. Package post-install script sugere: run `bitbucket-mcp setup` to configure
12. Manual test: install, run setup, execute search command, uninstall (cleanup)

### Story 4.4: Auto-Discovery & Config Validation

As a **user**,  
I want **sistema que auto-descobre config de múltiplas sources e valida na startup**,  
so that **tenho flexibilidade de configuração (env vars, config file) com feedback claro de erros**.

**Acceptance Criteria:**

1. Config loader em `src/core/config-loader.ts` implementado com priority order: 1=CLI flags, 2=Env vars, 3=Config file, 4=Defaults
2. Config file locations checked in order: `./bitbucket-mcp.config.yml`, `~/.bitbucket-mcp/config.yml`, `/etc/bitbucket-mcp/config.yml`
3. Env vars suportadas: `BITBUCKET_URL`, `BITBUCKET_AUTH_METHOD`, `BITBUCKET_TOKEN`, `BITBUCKET_USERNAME`, `BITBUCKET_PASSWORD`, `LOG_LEVEL`, `RATE_LIMIT`, `TIMEOUT`
4. Config schema definido com Zod: required fields (bitbucket_url, auth), optional fields (rate_limit, timeout, log_level)
5. Config validation na startup: invalid config → print clear error message com field, expected value, example
6. Config validation errors incluem: missing required fields, invalid URLs, invalid auth method, invalid numeric ranges
7. Config auto-detection loga: "Loaded config from: ~/.bitbucket-mcp/config.yml", "Overriding auth method from env var BITBUCKET_AUTH_METHOD"
8. Config has sensible defaults: rate_limit=100, timeout=30s, log_level=INFO
9. Config documentation gerada automaticamente: `bitbucket-mcp config help` exibe todas as options com descriptions e defaults
10. Unit tests validam: priority order, schema validation, default values, error messages

### Story 4.5: Comprehensive README & Quick Start

As a **new user**,  
I want **README.md claro e conciso com quick start que me permite usar produto em 5 minutos**,  
so that **entendo value proposition e consigo setup rapidamente sem ler docs extensas**.

**Acceptance Criteria:**

1. README.md estruturado com sections: Project description, Key features, Quick start, Installation, Usage, Documentation links, Contributing, License
2. Project description (1-2 paragraphs): what it is, problem it solves, key differentiators
3. Key features (bullet list): Semantic search >90%, Multi-auth, Production resilience, Zero-config setup, 3 MCP tools
4. Quick start tem 3 paths: Docker (1 comando), npm (2 comandos: install + setup), Source (3 comandos: clone + build + setup)
5. Quick start inclui: expected output, troubleshooting links, "What's next" section
6. Usage section tem examples: basic search, calling operations, common workflows
7. Documentation links apontam para: Full docs site, API reference, Troubleshooting guide, Contributing guidelines
8. README tem badges: Build status, Test coverage, npm version, Docker pulls, License
9. README tem screenshots/GIFs: setup wizard, search results, LLM interaction (Claude Desktop)
10. README reviews: external tech writer review (if possible), beta tester feedback

### Story 4.6: Authentication Setup Guide

As a **user**,  
I want **guia detalhado para setup de cada auth method com screenshots e troubleshooting**,  
so that **posso configurar auth corretamente mesmo sem experiência prévia com Bitbucket DC API**.

**Acceptance Criteria:**

1. Documentation file `docs/authentication.md` criado com sections para cada auth method
2. OAuth 2.0 section: prerequisites (Bitbucket admin access), step-by-step (create OAuth app, configure callback, get client_id/secret), screenshots de Bitbucket UI, common errors
3. PAT section: prerequisites (Bitbucket 8.14+), step-by-step (generate PAT, copy token, configure), expiration handling
4. OAuth 1.0a section: prerequisites (Bitbucket 7.x+), step-by-step (create application link, get consumer key/secret, authorize), legacy warning
5. Basic Auth section: step-by-step (use username + password), security warning (use HTTPS), when to use (local dev only)
6. Troubleshooting section: common errors (401 unauthorized, 403 forbidden, invalid redirect URI), diagnostics commands, FAQ
7. Best practices section: which method to use when, security considerations, token rotation
8. Each section tem: estimated time, difficulty level, linked examples
9. Documentation references: Bitbucket official docs links, OAuth specs, security guidelines
10. Documentation reviewed by 3-5 beta testers, feedback incorporated

### Story 4.7: API Reference & Examples Cookbook

As a **developer**,  
I want **API reference completo para os 3 MCP tools e cookbook com 20+ common use cases**,  
so that **posso rapidamente encontrar como realizar tarefas específicas sem trial-and-error**.

**Acceptance Criteria:**

1. Documentation file `docs/api-reference.md` criado com sections para cada tool: search_ids, get_id, call_id
2. Para cada tool: description, input schema, output schema, examples (3+ variations), error codes, performance notes
3. Examples mostram: LLM prompt → tool call → output, com comments explicando choices
4. Documentation file `docs/cookbook.md` criado com 20+ use cases categorizados: Issues, Users, Projects, Workflows, Sprints, Custom Fields
5. Cookbook examples: "Create issue with custom fields", "Bulk update assignees", "Search issues by JQL", "Get sprint report", "Add comment to issue", "Transition issue workflow", etc.
6. Each cookbook example tem: description, prerequisites, complete code (curl equivalents), expected output, troubleshooting tips
7. Examples são testáveis: integration tests validam cookbook examples work
8. Documentation auto-generated onde possível: tool schemas extracted from code, examples validated
9. Documentation tem search functionality: users can search by keyword (future: docs site with Algolia)
10. Documentation reviewed: internal team + 5 beta testers, common questions added to FAQ

### Story 4.8: Troubleshooting Guide & FAQ

As a **user experiencing issues**,  
I want **troubleshooting guide com diagnostics steps e FAQ com respostas para common questions**,  
so that **posso resolver problemas sozinho sem abrir support tickets**.

**Acceptance Criteria:**

1. Documentation file `docs/troubleshooting.md` criado com sections: Common Issues, Diagnostics, FAQ, Getting Help
2. Common Issues section com 10+ issues: "Cannot connect to Bitbucket", "Authentication fails", "Search returns no results", "Operation timeout", "Rate limiting errors"
3. Para cada issue: symptoms, root causes, step-by-step resolution, prevention tips
4. Diagnostics section com commands: `bitbucket-mcp config validate`, `bitbucket-mcp test-connection`, `bitbucket-mcp search --debug`, log analysis tips
5. FAQ section com 15+ questions: "Which auth method should I use?", "How to update Bitbucket URL?", "Can I use with Bitbucket Cloud?", "How to contribute?", "How to report bugs?"
6. Getting Help section: GitHub issues link, community Discord/Slack (if exists), email support (if applicable)
7. Troubleshooting guide tem: error code reference table, log message interpretation, common symptoms → solutions mapping
8. Documentation has internal search: TOC with anchor links, keywords indexed
9. Troubleshooting guide reviewed by beta testers: real issues they encountered added
10. Troubleshooting guide linked from: error messages (where applicable), README, setup wizard output

### Story 4.9: Contributing Guidelines & Code of Conduct

As a **potential contributor**,  
I want **contributing guidelines claros e code of conduct para comunidade inclusiva**,  
so that **sei como contribuir e me sinto welcome para participar do projeto open-source**.

**Acceptance Criteria:**

1. File `CONTRIBUTING.md` criado com sections: How to contribute, Development setup, Code standards, Testing requirements, PR process, Issue templates
2. How to contribute section: types of contributions (code, docs, bug reports, feature requests), recognition for contributors
3. Development setup section: clone repo, install dependencies, run tests, run locally, pre-commit hooks setup
4. Code standards section: TypeScript guidelines, ESLint/Prettier enforcement, naming conventions, comment standards
5. Testing requirements section: coverage thresholds, test pyramid (unit/integration/e2e), how to write tests, CI pipeline expectations
6. PR process section: branch naming, commit message format, PR template, review process, merge requirements
7. File `CODE_OF_CONDUCT.md` criado: adopts Contributor Covenant v2.1 (industry standard)
8. Issue templates criados: `.github/ISSUE_TEMPLATE/bug_report.md`, `feature_request.md`, `question.md`
9. PR template criado: `.github/PULL_REQUEST_TEMPLATE.md` com checklist (tests added, docs updated, changelog entry)
10. Documentation references: linked from README, mentioned in welcome message for first-time contributors
11. Contributing guide reviewed: 2-3 external open-source contributors provide feedback

### Story 4.10: Beta Testing & Launch Preparation

As a **Product Manager**,  
I want **beta testing program com 10-20 early adopters e launch checklist validated**,  
so that **produto está polished, bugs críticos resolvidos, e pronto para v1.0 public launch**.

**Acceptance Criteria:**

1. Beta tester recruitment: 10-20 developers selecionados de communities (Reddit r/bitbucket, Atlassian Community, Discord servers)
2. Beta testing guide enviado: setup instructions, testing scenarios (10+ workflows to test), feedback form, support channel (dedicated Discord ou Slack)
3. Testing scenarios cobrem: all auth methods, common workflows (CRUD issues), edge cases (network failures, invalid inputs), performance (large result sets)
4. Beta testing timeline: 2 weeks (semanas 10-11 do sprint plan), com checkpoint meetings (week 1, week 2)
5. Feedback collection: structured form (Google Forms/Typeform) + open feedback (Discord), categorizado: Bugs (P0/P1/P2), UX issues, Feature requests, Documentation gaps
6. Bug fixes: P0 bugs (crashes, data loss) → fixed immediately, P1 bugs (major UX issues) → fixed before launch, P2 bugs → backlog for v1.1
7. Launch checklist validado: ✓ Zero P0 bugs, ✓ <3 P1 bugs, ✓ Test coverage ≥80%, ✓ Docs complete, ✓ npm package published, ✓ Docker images pushed, ✓ GitHub release notes prepared
8. Performance validation: latency benchmarks meet targets (p95 <500ms search, <2s call), throughput meets target (≥100 req/s)
9. Launch assets preparados: announcement blog post draft, Twitter/LinkedIn posts, Product Hunt submission draft
10. v1.0 release tagged: semantic version, changelog, migration guide (N/A para v1.0), GitHub release published

---

