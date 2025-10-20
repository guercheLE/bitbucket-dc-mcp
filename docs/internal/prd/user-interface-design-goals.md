# User Interface Design Goals

### Overall UX Vision

Este é um produto CLI/backend-focused sem UI gráfica tradicional. A "interface" principal é a experiência conversacional através de LLMs (Claude, ChatGPT, etc.) via Model Context Protocol. O UX goal é tornar a interação com Bitbucket tão natural quanto conversar com um colega desenvolvedor: "liste issues do sprint atual" → sistema entende, encontra endpoint correto, executa, retorna resultado estruturado.

A experiência de setup (wizard interativo CLI) deve ser guiada, clara, e perdoável de erros - similar ao `npx create-next-app` ou `aws configure`. Mensagens de erro devem ser educativas e actionable, não técnicas e obscuras.

### Key Interaction Paradigms

**1. Conversational API Discovery:** Usuário descreve o que quer fazer em linguagem natural, sistema traduz para operação Bitbucket correta através de semantic search, apresenta opções se ambíguo.

**2. Progressive Disclosure:** Setup wizard revela opções avançadas apenas quando necessário. Defaults inteligentes para 80% dos casos. Power users podem bypassar com config file.

**3. Fail-Friendly:** Erros não punem usuário. Validação acontece cedo (antes de chamar Bitbucket). Mensagens sugerem correção. Retries automáticos para erros transientes.

**4. Zero-Assumption Onboarding:** Sistema assume que usuário não conhece API Bitbucket. Busca semântica elimina necessidade de memorizar endpoint names. Schemas retornados incluem exemplos práticos.

### Core Screens and Views

**N/A para este produto** - Não há telas gráficas. A interação ocorre através de:
- Terminal durante setup (wizard interativo)
- LLM chat interface (Claude Desktop, Cursor, etc.)
- Logs estruturados para debugging/observability

### Accessibility

**Not Applicable** - Produto é backend CLI tool sem interface gráfica. Documentação seguirá best practices de plain language para acessibilidade de conteúdo escrito.

### Branding

**Minimal, Developer-First Aesthetic:**
- CLI output usa colors moderados para legibilidade (green=success, yellow=warning, red=error)
- Logo ASCII art simples para terminal
- Documentação usa tom técnico mas acessível, evitando jargão desnecessário
- GitHub repo segue padrões open-source: clear README, badges (build status, coverage), exemplos práticos

### Target Device and Platforms

**Developer Workstations & Servers:**
- **Primary:** macOS e Linux development machines (laptops, desktops)
- **Secondary:** Linux servers (Docker containers, Kubernetes pods, bare metal)
- **Tertiary:** Windows via WSL2 ou Docker Desktop
- **Deployment:** Self-hosted on-premise (data center, private cloud)

Terminal-based, não requer display gráfico. Funciona via SSH. Compatível com CI/CD pipelines.

---

