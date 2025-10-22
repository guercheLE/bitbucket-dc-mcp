# Servidor HTTP MCP - Guia Completo

> **Versão:** 2.0  
> **Última Atualização:** 22 de outubro de 2025  
> **Tempo de Leitura Estimado:** 15-20 minutos

## Índice

- [Visão Geral](#visão-geral)
- [Guia de Decisão Rápida](#guia-de-decisão-rápida)
- [Modos de Autenticação](#modos-de-autenticação)
  - [Modo LOCALHOST](#modo-localhost-relaxed-auth)
  - [Modo NETWORK](#modo-network-strict-auth)
- [Início Rápido](#início-rápido)
- [Configuração](#configuração)
- [Integração com Prometheus e OpenTelemetry](#integração-com-prometheus-e-opentelemetry)
- [Exemplos de Uso](#exemplos-de-uso)
- [Segurança](#segurança)
- [Solução de Problemas](#solução-de-problemas)
- [Recursos Adicionais](#recursos-adicionais)

---

## Visão Geral

O **Bitbucket Data Center MCP Server** oferece dois modos de operação:

1. **Modo stdio (padrão)** - Comunicação via stdin/stdout usando JSON-RPC (para clientes MCP como Claude Desktop, Cursor)
2. **Modo HTTP** - Servidor HTTP para integrações web e APIs REST

Este guia documenta o **modo HTTP**, que permite:

- ✅ **Integrações Web** - Chamar ferramentas MCP via HTTP POST
- ✅ **APIs REST** - Construir aplicações que consomem Bitbucket via MCP
- ✅ **Monitoramento** - Métricas Prometheus e tracing OpenTelemetry
- ✅ **CORS** - Suporte a requisições cross-origin
- ✅ **Segurança Adaptativa** - Dois modos de autenticação (LOCALHOST vs NETWORK)

**Arquitetura do Servidor HTTP:**

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP MCP Server                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐      ┌──────────────┐                     │
│  │ HTTP Server │─────▶│ Auth Manager │                     │
│  │ (Node.js)   │      │ (Adaptive)   │                     │
│  └─────────────┘      └──────────────┘                     │
│         │                                                   │
│         │              ┌──────────────┐                     │
│         └─────────────▶│ MCP Tools    │                     │
│                        │ (search_ids, │                     │
│                        │  get_id,     │                     │
│                        │  call_id)    │                     │
│                        └──────────────┘                     │
│                                                             │
│  ┌─────────────┐      ┌──────────────┐                     │
│  │ Metrics     │      │ Tracing      │                     │
│  │ (Prometheus)│      │ (OpenTelemetry)                   │
│  └─────────────┘      └──────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │                       │
         ▼                       ▼
   HTTP Clients          Bitbucket DC API
   (curl, fetch,         (REST v3)
    Postman)
```

---

## Guia de Decisão Rápida

**Escolha o modo de operação:**

```
┌─────────────────────────────────────────────────────────────┐
│ Qual é o seu caso de uso?                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
           Local Dev              Produção/Rede
           (127.0.0.1)            (0.0.0.0, IP específico)
                │                       │
                ▼                       ▼
        ┌────────────────┐      ┌────────────────┐
        │ Modo LOCALHOST │      │ Modo NETWORK   │
        │ (Relaxed Auth) │      │ (Strict Auth)  │
        └────────────────┘      └────────────────┘
                │                       │
                │                       │
        • Headers opcionais     • Auth obrigatório
        • Credenciais           • Apenas Basic/PAT
          do config             • URL do config
        • Ideal para dev        • Ideal para prod
```

**Recomendações:**

| Cenário | Modo Recomendado | Razão |
|---------|-----------------|-------|
| **Desenvolvimento local** | LOCALHOST (127.0.0.1) | Facilita testes sem cabeçalhos Auth |
| **Aplicação web** | NETWORK (0.0.0.0) | Segurança reforçada com auth explícito |
| **Produção** | NETWORK (IP específico) | Auditoria e controle de acesso |
| **Testes automatizados** | LOCALHOST | Simplifica setup de testes |
| **API pública** | NETWORK + CORS | Permite integrações externas seguras |

---

## Modos de Autenticação

### Modo LOCALHOST (Relaxed Auth)

**Quando usar:** Desenvolvimento local, testes, ambiente confiável

**Comportamento:**
- Servidor escuta **APENAS** em `127.0.0.1` ou `localhost`
- Headers de autenticação são **opcionais**
- Se não fornecidos, usa credenciais armazenadas (do setup wizard)
- Bitbucket URL pode vir do header `X-Bitbucket-Url` ou config
- **Todas as estratégias de auth** são permitidas (OAuth 2.0, PAT, OAuth 1.0a, Basic)

**Configuração:**

```bash
# CLI
bitbucket-dc-mcp http --host 127.0.0.1 --port 3000

# Programático
await startHttpServer({
  host: '127.0.0.1',
  port: 3000,
  cors: false
});
```

**Exemplo de Requisição:**

```bash
# Sem headers (usa credenciais armazenadas)
curl -X POST http://127.0.0.1:3000/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_ids",
      "arguments": {
        "query": "create repository",
        "limit": 5
      }
    }
  }'

# Com headers (sobrescreve config)
curl -X POST http://127.0.0.1:3000/ \
  -H "Content-Type: application/json" \
  -H "X-Bitbucket-Url: https://bitbucket.example.com" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_id",
      "arguments": {
        "operation_id": "createRepository"
      }
    }
  }'
```

---

### Modo NETWORK (Strict Auth)

**Quando usar:** Produção, ambientes expostos à rede, APIs públicas

**Comportamento:**
- Servidor escuta em **qualquer interface** (`0.0.0.0`, IP específico)
- Headers de autenticação são **obrigatórios**
- **Apenas Basic Auth e PAT** permitidos (OAuth não suportado para segurança)
- Bitbucket URL vem **SEMPRE do config** (não aceita headers)
- Logging de auditoria com IP do cliente

**Configuração:**

```bash
# CLI
bitbucket-dc-mcp http --host 0.0.0.0 --port 3000

# Programático
await startHttpServer({
  host: '0.0.0.0',
  port: 3000,
  cors: true  // Se precisar de CORS
});
```

**Exemplo de Requisição:**

```bash
# Com Basic Auth
curl -X POST http://bitbucket-mcp.example.com:3000/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "call_id",
      "arguments": {
        "operation_id": "getRepositories",
        "parameters": {
          "projectKey": "PROJ"
        }
      }
    }
  }'

# Com PAT (Personal Access Token)
curl -X POST http://bitbucket-mcp.example.com:3000/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_ids",
      "arguments": {
        "query": "list pull requests"
      }
    }
  }'
```

**⚠️ Importante - Modo NETWORK:**
- O header `X-Bitbucket-Url` é **IGNORADO** (usa URL do config)
- OAuth 2.0 e OAuth 1.0a são **BLOQUEADOS** (complexidade de refresh tokens em stateless HTTP)
- IPs dos clientes são **LOGADOS** para auditoria

---

## Início Rápido

### Instalação

```bash
# Instalar globalmente
npm install -g bitbucket-dc-mcp

# Ou usar npx (sem instalação)
npx bitbucket-dc-mcp http --help
```

### Setup Inicial

Se ainda não configurou o servidor:

```bash
# Executar wizard de configuração
bitbucket-dc-mcp setup

# O wizard configura:
# - URL do Bitbucket
# - Método de autenticação (OAuth 2.0, PAT, etc.)
# - Armazena credenciais no keychain do SO
```

### Iniciar Servidor HTTP

#### Modo Localhost (Desenvolvimento)

```bash
# Iniciar em localhost:3000
bitbucket-dc-mcp http

# Ou especificar porta
bitbucket-dc-mcp http --port 8080
```

**Saída Esperada:**

```
[INFO] HTTP MCP server listening on http://127.0.0.1:3000
[INFO] Auth mode: LOCALHOST (relaxed)
[INFO] CORS: disabled
[INFO] Metrics: disabled
```

#### Modo Network (Produção)

```bash
# Iniciar em todas as interfaces
bitbucket-dc-mcp http --host 0.0.0.0 --port 3000 --cors

# Com métricas Prometheus
bitbucket-dc-mcp http \
  --host 0.0.0.0 \
  --port 3000 \
  --cors
```

**Saída Esperada:**

```
[INFO] HTTP MCP server listening on http://0.0.0.0:3000
[INFO] Auth mode: NETWORK (strict)
[INFO] CORS: enabled
[INFO] Metrics: enabled on http://0.0.0.0:9090/metrics
```

### Testar Servidor

```bash
# Testar com search_ids
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_ids",
      "arguments": {
        "query": "create issue",
        "limit": 3
      }
    }
  }'
```

**Resposta Esperada:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"operations\":[{\"operation_id\":\"createIssue\",\"summary\":\"Create issue\",\"similarity_score\":0.95}]}"
      }
    ]
  }
}
```

---

## Configuração

### Opções CLI

```bash
bitbucket-dc-mcp http [options]

Opções:
  --host <host>       Host para bind (default: '127.0.0.1')
                      Use '0.0.0.0' para acesso de rede
  
  --port <port>       Porta para escutar (default: 3000)
  
  --cors              Habilitar CORS (default: false)
                      Necessário para integrações web
```

### Configuração Programática

```typescript
import { startHttpServer } from 'bitbucket-dc-mcp';

const server = await startHttpServer({
  // Server binding
  host: '0.0.0.0',           // '127.0.0.1' para localhost
  port: 3000,
  
  // CORS
  cors: true,                 // Habilitar cross-origin requests
  
  // Limites
  maxBodySize: 1024 * 1024,   // 1MB (default)
  timeout: 30000,             // 30s (default)
  
  // Métricas Prometheus (opcional)
  metrics: {
    enabled: true,
    port: 9090,               // Porta separada para métricas
    host: '0.0.0.0',
    endpoint: '/metrics'      // Caminho do endpoint
  },
  
  // Tracing OpenTelemetry (opcional)
  tracing: {
    enabled: true,
    serviceName: 'bitbucket-dc-mcp',
    serviceVersion: '2.0.0',
    jaegerEndpoint: 'http://localhost:14268/api/traces',
    consoleExporter: false    // true para debug
  }
});

// Servidor está rodando
console.log('Server started successfully');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});
```

### Variáveis de Ambiente

O servidor HTTP respeita as mesmas variáveis do modo stdio:

```bash
# Configuração do Bitbucket
BITBUCKET_URL=https://bitbucket.example.com
BITBUCKET_AUTH_METHOD=pat
BITBUCKET_TOKEN=your_token_here

# Logging
LOG_LEVEL=info              # debug, info, warn, error
LOG_OUTPUT=stdout           # stdout, file, both (stdout = stderr para MCP)

# Rate limiting
RATE_LIMIT=100              # Requisições por segundo
```

---

## Integração com Prometheus e OpenTelemetry

### Habilitar Métricas

```typescript
await startHttpServer({
  host: '0.0.0.0',
  port: 3000,
  metrics: {
    enabled: true,
    port: 9090,               // Porta separada (recomendado)
    host: '0.0.0.0',
    endpoint: '/metrics'
  }
});
```

**Métricas Disponíveis:**

```
# HTTP Metrics
http_requests_total{method, path, status}           # Contador de requisições
http_request_duration_seconds{method, path, status} # Histograma de latência
http_request_size_bytes{method, path, status}       # Tamanho do request
http_response_size_bytes{method, path, status}      # Tamanho do response
http_active_requests                                # Requisições ativas

# MCP Metrics
mcp_operations_total{method, status}                # Operações MCP
mcp_operation_duration_seconds{method, status}      # Duração das operações

# Auth Metrics
auth_attempts_total{method}                         # Tentativas de auth
auth_failures_total{method}                         # Falhas de auth
```

**Scraping com Prometheus:**

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'bitbucket-dc-mcp'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 15s
```

### Habilitar Tracing

```typescript
await startHttpServer({
  host: '0.0.0.0',
  port: 3000,
  tracing: {
    enabled: true,
    serviceName: 'bitbucket-dc-mcp',
    serviceVersion: '2.0.0',
    jaegerEndpoint: 'http://localhost:14268/api/traces',
    consoleExporter: false
  }
});
```

**Docker Compose com Jaeger:**

```yaml
version: '3.8'

services:
  bitbucket-mcp:
    image: ghcr.io/guercheLE/bitbucket-dc-mcp:latest
    ports:
      - "3000:3000"
      - "9090:9090"
    environment:
      BITBUCKET_URL: https://bitbucket.example.com
      BITBUCKET_AUTH_METHOD: pat
      BITBUCKET_TOKEN: ${BITBUCKET_TOKEN}
    command: http --host 0.0.0.0 --port 3000

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Collector HTTP
    environment:
      COLLECTOR_OTLP_ENABLED: true
```

**Visualizar traces:** http://localhost:16686

Veja o [Guia Completo de OpenTelemetry](./opentelemetry-metrics.md) para mais detalhes.

---

## Exemplos de Uso

### Exemplo 1: Buscar Operações (search_ids)

```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_ids",
      "arguments": {
        "query": "list branches in repository",
        "limit": 5
      }
    }
  }'
```

### Exemplo 2: Obter Detalhes da Operação (get_id)

```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_id",
      "arguments": {
        "operation_id": "getBranches"
      }
    }
  }'
```

### Exemplo 3: Executar Operação (call_id)

```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "call_id",
      "arguments": {
        "operation_id": "getBranches",
        "parameters": {
          "projectKey": "PROJ",
          "repositorySlug": "my-repo"
        }
      }
    }
  }'
```

### Exemplo 4: Cliente JavaScript

```javascript
async function searchBitbucketOperations(query) {
  const response = await fetch('http://localhost:3000/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'search_ids',
        arguments: {
          query: query,
          limit: 10
        }
      }
    })
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }

  const result = JSON.parse(data.result.content[0].text);
  return result.operations;
}

// Uso
const operations = await searchBitbucketOperations('create pull request');
console.log(operations);
```

### Exemplo 5: Cliente Python

```python
import requests
import json

def call_bitbucket_mcp(tool_name, arguments):
    """
    Chama uma ferramenta MCP via HTTP
    """
    response = requests.post(
        'http://localhost:3000/',
        headers={'Content-Type': 'application/json'},
        json={
            'jsonrpc': '2.0',
            'id': 1,
            'method': 'tools/call',
            'params': {
                'name': tool_name,
                'arguments': arguments
            }
        }
    )
    
    response.raise_for_status()
    data = response.json()
    
    if 'error' in data:
        raise Exception(data['error']['message'])
    
    result_text = data['result']['content'][0]['text']
    return json.loads(result_text)

# Exemplo: Buscar operações
result = call_bitbucket_mcp('search_ids', {
    'query': 'get repository details',
    'limit': 5
})

print(result['operations'])
```

---

## Segurança

### Best Practices

#### ✅ Produção (Modo NETWORK)

```bash
# 1. Usar HTTPS (reverse proxy com nginx/Apache)
# 2. Apenas PAT ou Basic Auth
# 3. IP binding específico
# 4. Habilitar logging de auditoria

bitbucket-dc-mcp http --host 192.168.1.100 --port 3000
```

#### ✅ Desenvolvimento (Modo LOCALHOST)

```bash
# 1. Apenas localhost
# 2. HTTPS opcional
# 3. Credenciais do config

bitbucket-dc-mcp http --host 127.0.0.1 --port 3000
```

### Configuração de Reverse Proxy (Nginx)

**Recomendado para produção:**

```nginx
server {
    listen 443 ssl http2;
    server_name bitbucket-mcp.example.com;

    ssl_certificate /etc/ssl/certs/bitbucket-mcp.crt;
    ssl_certificate_key /etc/ssl/private/bitbucket-mcp.key;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Metrics endpoint (protegido)
    location /metrics {
        allow 10.0.0.0/8;       # Rede interna
        deny all;
        proxy_pass http://127.0.0.1:9090/metrics;
    }
}
```

### Rate Limiting

```bash
# Configurar via variável de ambiente
RATE_LIMIT=50 bitbucket-dc-mcp http --host 0.0.0.0
```

O servidor implementa token bucket rate limiting internamente.

---

## Solução de Problemas

### Erro: "Method not allowed"

**Causa:** Tentativa de usar método HTTP diferente de POST

**Solução:**

```bash
# ❌ Errado
curl http://localhost:3000/

# ✅ Correto
curl -X POST http://localhost:3000/ -H "Content-Type: application/json" -d '{...}'
```

### Erro: "Authentication required in NETWORK mode"

**Causa:** Servidor em modo NETWORK sem header Authorization

**Solução:**

```bash
# Adicionar header Authorization
curl -X POST http://server:3000/ \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -d '{...}'
```

### Erro: "Request body too large"

**Causa:** Body da requisição excede `maxBodySize`

**Solução:**

```typescript
await startHttpServer({
  host: '0.0.0.0',
  port: 3000,
  maxBodySize: 5 * 1024 * 1024  // 5MB
});
```

### Erro: "Request timeout"

**Causa:** Operação demorou mais que `timeout`

**Solução:**

```typescript
await startHttpServer({
  host: '0.0.0.0',
  port: 3000,
  timeout: 60000  // 60s
});
```

### Servidor não responde

**Diagnóstico:**

```bash
# 1. Verificar se está rodando
ps aux | grep bitbucket-dc-mcp

# 2. Testar conectividade
curl -v http://localhost:3000/

# 3. Verificar logs
LOG_LEVEL=debug bitbucket-dc-mcp http
```

---

## Recursos Adicionais

### Documentação Relacionada

- **[API Reference](./api-reference.md)** - Referência completa das ferramentas MCP
- **[Authentication Guide](./authentication.md)** - Setup de autenticação
- **[Observability Guide](./observability.md)** - Logging e monitoring
- **[OpenTelemetry Metrics](./opentelemetry-metrics.md)** - Métricas e tracing detalhado
- **[Troubleshooting](./troubleshooting.md)** - Solução de problemas gerais
- **[Cookbook](./cookbook.md)** - Exemplos práticos

### Exemplos de Código

- [Repositório GitHub](https://github.com/guercheLE/bitbucket-dc-mcp) - Código-fonte completo
- [Exemplos HTTP](../examples/http/) - Scripts de exemplo

### Suporte

- **Issues:** [GitHub Issues](https://github.com/guercheLE/bitbucket-dc-mcp/issues)
- **Discussões:** [GitHub Discussions](https://github.com/guercheLE/bitbucket-dc-mcp/discussions)
- **Contributing:** [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Última Atualização:** 22 de outubro de 2025  
**Versão do Servidor:** 2.0.0  
**Projeto:** [bitbucket-datacenter-mcp-server](https://github.com/guercheLE/bitbucket-dc-mcp)

