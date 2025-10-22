# OpenTelemetry Metrics - Quick Start

## Visão Geral

O servidor HTTP MCP agora suporta métricas OpenTelemetry com exportação no formato Prometheus.

## Uso Rápido

### Habilitar Métricas

```typescript
import { startHttpServer } from 'bitbucket-dc-mcp';

await startHttpServer({
  host: '0.0.0.0',
  port: 3000,
  metrics: {
    enabled: true,
    port: 9090  // Opcional, padrão é porta principal + 1
  }
});
```

### Acessar Métricas

```bash
curl http://localhost:9090/metrics
```

## Métricas Disponíveis

- `http_requests_total` - Total de requisições HTTP
- `http_request_duration_seconds` - Duração das requisições
- `http_request_size_bytes` - Tamanho das requisições
- `http_response_size_bytes` - Tamanho das respostas
- `http_active_requests` - Requisições ativas
- `mcp_operations_total` - Total de operações MCP
- `mcp_operation_duration_seconds` - Duração das operações MCP
- `auth_attempts_total` - Tentativas de autenticação
- `auth_failures_total` - Falhas de autenticação

## Exemplo Completo

```bash
# Terminal 1: Iniciar servidor com métricas
npx tsx examples/http-server-with-metrics.ts

# Terminal 2: Visualizar métricas
curl http://localhost:9090/metrics

# Terminal 3: Fazer requisições para gerar métricas
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"method":"test"}'
```

## Integração com Prometheus

Veja o arquivo `examples/prometheus.yml` para configuração completa.

Configuração mínima:

```yaml
scrape_configs:
  - job_name: 'bitbucket-dc-mcp'
    static_configs:
      - targets: ['localhost:9090']
```

## Documentação Completa

Para mais informações, consulte: `docs/opentelemetry-metrics.md`

