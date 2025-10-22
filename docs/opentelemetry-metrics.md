# OpenTelemetry Metrics

Este documento descreve como configurar e usar métricas OpenTelemetry com o servidor HTTP MCP.

## Visão Geral

O servidor HTTP MCP suporta coleta de métricas usando OpenTelemetry com exportação no formato Prometheus. As métricas são expostas em um endpoint HTTP separado que pode ser raspado (scraped) pelo Prometheus ou qualquer outro sistema de monitoramento compatível.

## Métricas Disponíveis

### Métricas HTTP

- **`http_requests_total`** (Counter)
  - Descrição: Número total de requisições HTTP
  - Labels: `method`, `path`, `status`
  
- **`http_request_duration_seconds`** (Histogram)
  - Descrição: Duração das requisições HTTP em segundos
  - Labels: `method`, `path`, `status`
  
- **`http_request_size_bytes`** (Histogram)
  - Descrição: Tamanho do corpo da requisição em bytes
  - Labels: `method`, `path`, `status`
  
- **`http_response_size_bytes`** (Histogram)
  - Descrição: Tamanho do corpo da resposta em bytes
  - Labels: `method`, `path`, `status`
  
- **`http_active_requests`** (Counter)
  - Descrição: Número atual de requisições ativas

### Métricas MCP

- **`mcp_operations_total`** (Counter)
  - Descrição: Número total de operações MCP
  - Labels: `method`, `status`
  
- **`mcp_operation_duration_seconds`** (Histogram)
  - Descrição: Duração das operações MCP em segundos
  - Labels: `method`, `status`

### Métricas de Autenticação

- **`auth_attempts_total`** (Counter)
  - Descrição: Número total de tentativas de autenticação
  - Labels: `method`
  
- **`auth_failures_total`** (Counter)
  - Descrição: Número total de falhas de autenticação
  - Labels: `method`

## Configuração

### Configuração Básica

Para habilitar as métricas, adicione a configuração `metrics` ao inicializar o servidor HTTP:

```typescript
import { startHttpServer } from 'bitbucket-dc-mcp';

await startHttpServer({
  host: '0.0.0.0',
  port: 3000,
  metrics: {
    enabled: true,
    port: 9090,        // Porta para o endpoint de métricas (padrão: porta principal + 1)
    host: '0.0.0.0',   // Host para o endpoint de métricas (padrão: mesmo do servidor principal)
    endpoint: '/metrics' // Caminho do endpoint (padrão: /metrics)
  }
});
```

### Configuração Mínima

```typescript
await startHttpServer({
  host: '0.0.0.0',
  port: 3000,
  metrics: {
    enabled: true  // Usa valores padrão para port (3001), host (0.0.0.0) e endpoint (/metrics)
  }
});
```

### Valores Padrão

Se não especificado:
- `port`: porta do servidor principal + 1
- `host`: mesmo host do servidor principal
- `endpoint`: `/metrics`

## Uso com Prometheus

### Configuração do Prometheus

Adicione o seguinte job ao seu arquivo `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'bitbucket-dc-mcp'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 15s
```

### Exemplo de Consultas PromQL

**Taxa de requisições por minuto:**
```promql
rate(http_requests_total[1m])
```

**Latência P95 das requisições:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Taxa de erros:**
```promql
sum(rate(http_requests_total{status=~"5.."}[1m])) 
/ 
sum(rate(http_requests_total[1m]))
```

**Requisições ativas:**
```promql
http_active_requests
```

**Taxa de falha de autenticação:**
```promql
sum(rate(auth_failures_total[5m])) 
/ 
sum(rate(auth_attempts_total[5m]))
```

## Uso com Grafana

### Dashboard Recomendado

Você pode criar um dashboard no Grafana com os seguintes painéis:

1. **Taxa de Requisições**
   - Tipo: Graph
   - Consulta: `rate(http_requests_total[1m])`

2. **Latência**
   - Tipo: Graph
   - Consultas:
     - P50: `histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))`
     - P95: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
     - P99: `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))`

3. **Taxa de Erros**
   - Tipo: Single Stat
   - Consulta: `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100`

4. **Requisições por Status**
   - Tipo: Pie Chart
   - Consulta: `sum by (status) (rate(http_requests_total[5m]))`

5. **Autenticação**
   - Tipo: Graph
   - Consultas:
     - Tentativas: `rate(auth_attempts_total[1m])`
     - Falhas: `rate(auth_failures_total[1m])`

## Verificação

Para verificar se as métricas estão funcionando, você pode acessar o endpoint diretamente:

```bash
curl http://localhost:9090/metrics
```

Você deve ver uma saída no formato Prometheus:

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",path="/",status="200"} 42

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="POST",path="/",status="200",le="0.005"} 15
http_request_duration_seconds_bucket{method="POST",path="/",status="200",le="0.01"} 30
...
```

## Considerações de Segurança

### Modo LOCALHOST

Quando o servidor principal está em modo LOCALHOST (binding em 127.0.0.1), o endpoint de métricas também deve estar em localhost para evitar exposição não intencional.

### Modo NETWORK

Quando o servidor principal está em modo NETWORK (binding em 0.0.0.0 ou IP específico):

1. **Recomendação**: Execute o endpoint de métricas em uma porta separada e use firewall para restringir acesso
2. **Alternativa**: Use um host diferente para o endpoint de métricas (por exemplo, bind interno)

### Exemplo de Configuração Segura

```typescript
await startHttpServer({
  host: '0.0.0.0',    // Servidor principal acessível externamente
  port: 3000,
  metrics: {
    enabled: true,
    host: '127.0.0.1',  // Métricas apenas localmente
    port: 9090
  }
});
```

## Troubleshooting

### Endpoint de métricas não responde

1. Verifique se as métricas estão habilitadas na configuração
2. Verifique se a porta não está em uso por outro processo
3. Verifique logs do servidor para erros de inicialização

### Métricas não aparecem no Prometheus

1. Verifique a configuração de scrape no Prometheus
2. Verifique se o endpoint está acessível do servidor Prometheus
3. Verifique firewall e regras de rede

### Valores de métricas incorretos

1. Verifique se há múltiplas instâncias do servidor rodando
2. Verifique se o Prometheus está agregando corretamente
3. Revise as consultas PromQL

## Integração com Outros Sistemas

### Datadog

O Datadog pode coletar métricas Prometheus via seu Prometheus check:

```yaml
# datadog.yaml
prometheus_check:
  instances:
    - prometheus_url: http://localhost:9090/metrics
      namespace: bitbucket_mcp
```

### New Relic

New Relic suporta integração com Prometheus:

```yaml
# newrelic-prometheus.yml
integrations:
  - name: nri-prometheus
    config:
      transformations:
        - description: "Bitbucket MCP metrics"
          source_labels: [job]
          target_label: job
          replacement: bitbucket-dc-mcp
      targets:
        - description: Bitbucket MCP
          urls: ["http://localhost:9090/metrics"]
```

## Exemplo Completo

```typescript
import { startHttpServer } from 'bitbucket-dc-mcp';

async function main() {
  const server = await startHttpServer({
    host: '0.0.0.0',
    port: 3000,
    cors: true,
    maxBodySize: 1024 * 1024, // 1MB
    timeout: 30000,            // 30s
    metrics: {
      enabled: true,
      port: 9090,
      host: '0.0.0.0',
      endpoint: '/metrics'
    }
  });

  console.log('Server running on http://0.0.0.0:3000');
  console.log('Metrics available at http://0.0.0.0:9090/metrics');
}

main().catch(console.error);
```

## Referências

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)

