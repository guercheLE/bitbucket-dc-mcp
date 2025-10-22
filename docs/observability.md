# Observability Guide

This guide explains how to use structured logging and observability features in the Bitbucket Data Center MCP Server.

## Table of Contents

- [Log Structure](#log-structure)
- [Configuration](#configuration)
- [OpenTelemetry Tracing](#opentelemetry-tracing)
- [HTTP Metrics with Prometheus](#http-metrics-with-prometheus)
- [Correlation Context](#correlation-context)
- [Integration with Log Aggregators](#integration-with-log-aggregators)
- [Common Queries](#common-queries)
- [Alert Recommendations](#alert-recommendations)

## Log Structure

All logs are emitted as structured JSON with the following base fields:

```json
{
  "level": "info",
  "time": 1705320000000,
  "correlation_id": "req-abc-123",
  "service": "bitbucket-dc-mcp",
  "version": "1.0.0",
  "msg": "Human-readable message"
}
```

### Base Fields

| Field            | Type   | Description                                    |
|------------------|--------|------------------------------------------------|
| `level`          | string | Log level: debug, info, warn, error            |
| `time`           | number | Unix timestamp in milliseconds                 |
| `correlation_id` | string | UUID for tracing requests across components    |
| `service`        | string | Always "bitbucket-dc-mcp"                           |
| `version`        | string | Server version from package.json               |
| `msg`            | string | Human-readable log message                     |

### Log Levels

- **DEBUG**: Detailed execution flow, API requests/responses (dev only)
- **INFO**: Normal operations, successful requests, state changes
- **WARN**: Degraded mode, fallbacks activated, performance issues
- **ERROR**: Operation failures, exceptions, critical errors

## Configuration

### Environment Variables

```bash
# Log level (DEBUG, INFO, WARN, ERROR)
LOG_LEVEL=INFO

# Log output destination (stdout, file, both)
# IMPORTANT: 'stdout' actually writes to STDERR for MCP compatibility
LOG_OUTPUT=stdout

# Log file path (when LOG_OUTPUT=file or both)
LOG_FILE_PATH=./logs/bitbucket-mcp.log

# Log rotation (daily, hourly, size-based)
LOG_ROTATION=daily

# Max log file size (MB) before rotation
LOG_MAX_SIZE=100

# Max log files to keep
LOG_MAX_FILES=7
```

### ⚠️ Critical: MCP stdio Mode and Logging

When running as an MCP server (the default mode), the server communicates via stdin/stdout using the JSON-RPC protocol. **All logs MUST be written to stderr (file descriptor 2), NOT stdout (file descriptor 1)**, otherwise logs will corrupt the MCP protocol messages and cause connection failures.

**This is automatically handled:**
- When `LOG_OUTPUT=stdout` → logs go to **stderr** (not stdout!)
- When `LOG_OUTPUT=both` → logs go to **stderr** + file
- When `LOG_OUTPUT=file` → logs go to file only

If you see errors like:
```
[error] Client error for command: "Unrecognized key(s) in object: 'level', 'time', 'service', 'version', 'msg'"
```

This means logs are being written to stdout and corrupting the JSON-RPC protocol. The fix has been implemented to automatically redirect to stderr.

### Example Configurations

**Development (verbose logging):**
```bash
LOG_LEVEL=DEBUG
LOG_OUTPUT=stdout
```

**Production (file output with rotation):**
```bash
LOG_LEVEL=INFO
LOG_OUTPUT=file
LOG_FILE_PATH=/var/log/bitbucket-mcp/server.log
LOG_ROTATION=daily
LOG_MAX_SIZE=100
LOG_MAX_FILES=30
```

**Production with both outputs:**
```bash
LOG_LEVEL=INFO
LOG_OUTPUT=both
LOG_FILE_PATH=/var/log/bitbucket-mcp/server.log
```

---

## OpenTelemetry Tracing

The Bitbucket DC MCP Server includes comprehensive **distributed tracing** support using OpenTelemetry. This is especially useful when running in **HTTP server mode** to trace requests across components.

### What is Distributed Tracing?

Distributed tracing helps you understand:
- **Request flow:** How a request travels through different components
- **Performance bottlenecks:** Which operations are slow
- **Error propagation:** Where errors originate and how they cascade
- **Dependencies:** External API calls to Bitbucket DC

### Enabling Tracing

#### Programmatic Configuration

```typescript
import { startHttpServer } from 'bitbucket-dc-mcp';

await startHttpServer({
  host: '0.0.0.0',
  port: 3000,
  tracing: {
    enabled: true,
    serviceName: 'bitbucket-dc-mcp',
    serviceVersion: '2.0.0',
    jaegerEndpoint: 'http://localhost:14268/api/traces',
    consoleExporter: false  // Set to true for debugging
  }
});
```

#### Environment Variables

```bash
# Tracing configuration
OTEL_ENABLED=true
OTEL_SERVICE_NAME=bitbucket-dc-mcp
OTEL_SERVICE_VERSION=2.0.0
OTEL_JAEGER_ENDPOINT=http://localhost:14268/api/traces
OTEL_CONSOLE_EXPORTER=false
```

### Trace Components

The server creates spans for:

| Component | Span Name | Description |
|-----------|-----------|-------------|
| **HTTP Requests** | `http.request` | HTTP request lifecycle |
| **MCP Tools** | `mcp.tool.search_ids`<br>`mcp.tool.get_id`<br>`mcp.tool.call_id` | MCP tool execution |
| **Authentication** | `auth.authenticate` | Authentication flow |
| **Bitbucket API Calls** | `bitbucket.api.<operation>` | External API calls |
| **Cache Operations** | `cache.get`<br>`cache.set` | Cache access |
| **Database Queries** | `db.query` | Embeddings database queries |

### Span Attributes

Each span includes contextual attributes:

```typescript
// HTTP request span
{
  'http.method': 'POST',
  'http.url': '/tools/call',
  'http.status_code': 200,
  'http.client_ip': '192.168.1.100',
  'correlation_id': 'req-abc-123'
}

// MCP tool span
{
  'mcp.tool': 'call_id',
  'mcp.operation_id': 'createRepository',
  'mcp.parameters': '{"projectKey":"PROJ"}',
  'correlation_id': 'req-abc-123'
}

// Bitbucket API span
{
  'bitbucket.operation': 'createRepository',
  'bitbucket.method': 'POST',
  'bitbucket.url': 'https://bitbucket.example.com/rest/api/latest/projects/PROJ/repos',
  'bitbucket.status': 201,
  'correlation_id': 'req-abc-123'
}
```

### Visualization with Jaeger

**Docker Compose Setup:**

```yaml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Collector HTTP
      - "14250:14250"  # Collector gRPC
    environment:
      COLLECTOR_OTLP_ENABLED: true
      SPAN_STORAGE_TYPE: memory
```

**Access Jaeger UI:** http://localhost:16686

**Querying Traces:**
1. Select service: `bitbucket-dc-mcp`
2. Select operation: `http.request` or `mcp.tool.call_id`
3. Filter by tags: `correlation_id=req-abc-123`
4. View trace timeline and flamegraph

### Trace Context Propagation

The server propagates trace context using:
- **W3C Trace Context** standard headers
- **Correlation IDs** for request tracking
- **Baggage** for cross-service metadata

**Example: Incoming HTTP request with trace context:**

```bash
curl -X POST http://localhost:3000/ \
  -H "Content-Type: application/json" \
  -H "traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" \
  -H "tracestate: congo=ucfJifl5GOE,rojo=00f067aa0ba902b7" \
  -d '{...}'
```

The server will:
1. Extract parent trace context
2. Create child span for MCP operation
3. Propagate context to Bitbucket API calls
4. Return trace context in response headers

### Integration with APM Tools

#### Jaeger

Already configured - see Docker Compose example above.

#### Datadog APM

```typescript
await startHttpServer({
  host: '0.0.0.0',
  port: 3000,
  tracing: {
    enabled: true,
    serviceName: 'bitbucket-dc-mcp',
    // Datadog agent receives OTLP
    jaegerEndpoint: 'http://localhost:4318/v1/traces'  
  }
});
```

**Datadog Agent Config (`datadog.yaml`):**

```yaml
apm_config:
  enabled: true
  otlp_config:
    receiver:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318
```

#### New Relic

```typescript
// Use OTLP endpoint
await startHttpServer({
  tracing: {
    enabled: true,
    jaegerEndpoint: 'https://otlp.nr-data.net:4318/v1/traces',
    // Add API key to headers (see New Relic docs)
  }
});
```

### Troubleshooting Tracing

**No traces appearing in Jaeger:**

1. Check Jaeger is running: `docker ps | grep jaeger`
2. Verify endpoint: `curl http://localhost:14268/api/traces`
3. Enable console exporter for debugging:
   ```typescript
   tracing: {
     enabled: true,
     consoleExporter: true  // Logs spans to console
   }
   ```

**High overhead from tracing:**

1. Sample traces instead of capturing all:
   ```typescript
   // TODO: Sampling configuration
   // Currently captures all traces
   ```
2. Reduce span attributes
3. Use batch exporter (default)

**Trace context not propagating:**

1. Verify W3C Trace Context headers are present
2. Check correlation ID is set in logs
3. Ensure `traceparent` header format is valid

For more details, see [OpenTelemetry Metrics Guide](./opentelemetry-metrics.md).

---

## HTTP Metrics with Prometheus

When running in **HTTP server mode**, the server exposes Prometheus-compatible metrics on a separate endpoint.

### Enabling Metrics

```typescript
import { startHttpServer } from 'bitbucket-dc-mcp';

await startHttpServer({
  host: '0.0.0.0',
  port: 3000,
  metrics: {
    enabled: true,
    port: 9090,               // Separate port for metrics
    host: '0.0.0.0',
    endpoint: '/metrics'
  }
});
```

**Metrics endpoint:** http://localhost:9090/metrics

### Available Metrics

#### HTTP Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `http_requests_total` | Counter | Total HTTP requests | `method`, `path`, `status` |
| `http_request_duration_seconds` | Histogram | Request duration | `method`, `path`, `status` |
| `http_request_size_bytes` | Histogram | Request body size | `method`, `path`, `status` |
| `http_response_size_bytes` | Histogram | Response body size | `method`, `path`, `status` |
| `http_active_requests` | Gauge | Current active requests | - |

#### MCP Tool Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `mcp_operations_total` | Counter | Total MCP operations | `method`, `status` |
| `mcp_operation_duration_seconds` | Histogram | Operation duration | `method`, `status` |

#### Authentication Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `auth_attempts_total` | Counter | Auth attempts | `method` |
| `auth_failures_total` | Counter | Auth failures | `method` |

### Scraping with Prometheus

**Prometheus Configuration (`prometheus.yml`):**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'bitbucket-dc-mcp'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 10s
    scrape_timeout: 5s
```

**Start Prometheus:**

```bash
docker run -d -p 9091:9090 \
  -v $PWD/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

**Prometheus UI:** http://localhost:9091

### Example Queries (PromQL)

**Request rate (per second):**

```promql
rate(http_requests_total[5m])
```

**Error rate (percentage):**

```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) / 
sum(rate(http_requests_total[5m])) * 100
```

**P95 latency:**

```promql
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket[5m]))
```

**Active requests:**

```promql
http_active_requests
```

**MCP operations per minute:**

```promql
rate(mcp_operations_total[1m]) * 60
```

**Auth failure rate:**

```promql
rate(auth_failures_total[5m])
```

### Grafana Dashboard

**Docker Compose with Prometheus + Grafana:**

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9091:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  prometheus-data:
  grafana-data:
```

**Grafana Setup:**

1. Access Grafana: http://localhost:3001 (admin/admin)
2. Add Prometheus data source: http://prometheus:9090
3. Import dashboard or create custom panels

**Sample Dashboard Panels:**

- **Request Rate:** `rate(http_requests_total[5m])`
- **Error Rate:** Error rate calculation (see above)
- **Latency Heatmap:** `http_request_duration_seconds_bucket`
- **Active Requests:** `http_active_requests`
- **Top Operations:** `topk(10, sum by (method) (rate(mcp_operations_total[5m])))`

For complete metrics documentation, see [OpenTelemetry Metrics Guide](./opentelemetry-metrics.md).

---

## Correlation Context

The server uses a **correlation context system** to track requests across components. This is critical for:
- Tracing distributed requests
- Debugging multi-step operations
- Audit trail and security logging

### Correlation ID

Every request gets a unique **correlation ID** (UUID format):

```
req-4bf92f35-77b3-4da6-a3ce-929d0e0e4736
```

This ID appears in:
- All log entries for that request
- Trace spans
- Error responses
- HTTP response headers (`X-Request-Id`)

### Using Correlation IDs

**In logs:**

```bash
# Find all logs for a specific request
cat logs/bitbucket-mcp.log | jq 'select(.correlation_id == "req-abc-123")'
```

**In traces:**

```bash
# Jaeger UI: Search by tag
correlation_id=req-abc-123
```

**In support tickets:**

```
Subject: API call failing with 500 error

Correlation ID: req-abc-123
Timestamp: 2025-10-22T14:30:00Z
Operation: call_id with createRepository
```

### Programmatic Access

If building integrations, you can access correlation context:

```typescript
import { getCorrelationId, getCorrelationContext } from 'bitbucket-dc-mcp';

// Get current correlation ID
const correlationId = getCorrelationId();

// Get full context
const context = getCorrelationContext();
console.log(context);
// {
//   correlation_id: 'req-abc-123',
//   trace_id: '4bf92f3577b34da6a3ce929d0e0e4736',
//   span_id: '00f067aa0ba902b7',
//   start_time: 1698000000000
// }
```

---

## Integration with Log Aggregators

### ELK Stack (Elasticsearch, Logstash, Kibana)

**Filebeat Configuration:**

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/bitbucket-mcp/*.log
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ["localhost:9200"]
  index: "bitbucket-mcp-%{+yyyy.MM.dd}"

setup.template.name: "bitbucket-mcp"
setup.template.pattern: "bitbucket-mcp-*"
```

**Kibana Index Pattern:**
- Pattern: `bitbucket-mcp-*`
- Time field: `time`

**Useful Kibana Filters:**
- Service: `service:"bitbucket-dc-mcp"`
- Correlation ID: `correlation_id:"<uuid>"`
- Error logs: `level:"error"`
- Tool invocations: `event:"call_id.execution_start"`

### Datadog

**Datadog Agent Configuration:**

```yaml
logs:
  - type: file
    path: /var/log/bitbucket-mcp/*.log
    service: bitbucket-dc-mcp
    source: nodejs
    sourcecategory: sourcecode
    tags:
      - env:production
      - app:bitbucket-mcp
```

**Datadog Query Examples:**
```
# All errors
service:bitbucket-dc-mcp status:error

# Specific correlation ID
@correlation_id:"req-abc-123"

# Mutation audit trail
@audit_type:mutation

# Slow operations (>1s)
@latency_ms:>1000
```

### Splunk

**Splunk Forwarder Configuration:**

```ini
[monitor:///var/log/bitbucket-mcp/*.log]
sourcetype = _json
index = bitbucket-mcp
```

**Splunk Search Examples:**
```spl
# All logs for service
index="bitbucket-mcp" service="bitbucket-dc-mcp"

# Error rate over time
index="bitbucket-mcp" level="error" | timechart count

# Correlation trace
index="bitbucket-mcp" correlation_id="req-abc-123" | table time event msg

# Average latency by operation
index="bitbucket-mcp" operation_id=* latency_ms=*
| stats avg(latency_ms) by operation_id
```

## Common Queries

### Request Tracing

**Find all logs for a specific request:**

```bash
# Using jq
cat logs/bitbucket-mcp.log | jq 'select(.correlation_id == "req-abc-123")'

# ELK
correlation_id:"req-abc-123"

# Datadog
@correlation_id:"req-abc-123"

# Splunk
index="bitbucket-mcp" correlation_id="req-abc-123"
```

### Error Investigation

**Find all errors in the last hour:**

```bash
# ELK
level:"error" AND @timestamp:[now-1h TO now]

# Datadog
service:bitbucket-dc-mcp status:error -1h

# Splunk
index="bitbucket-mcp" level="error" earliest=-1h
```

**Group errors by type:**

```bash
# ELK (aggregation)
{
  "aggs": {
    "error_types": {
      "terms": { "field": "error_type.keyword", "size": 10 }
    }
  }
}

# Splunk
index="bitbucket-mcp" level="error"
| stats count by error_type
| sort -count
```

### Performance Monitoring

**Operation latency percentiles:**

```bash
# ELK (aggregation)
{
  "aggs": {
    "latency_stats": {
      "percentiles": {
        "field": "latency_ms",
        "percents": [50, 95, 99]
      }
    }
  }
}

# Splunk
index="bitbucket-mcp" latency_ms=*
| stats perc50(latency_ms) perc95(latency_ms) perc99(latency_ms)
```

**Slow operations (>1 second):**

```bash
# ELK
latency_ms:>1000 AND event:"call_id.execution_success"

# Datadog
@latency_ms:>1000 @event:call_id.execution_success

# Splunk
index="bitbucket-mcp" latency_ms>1000 event="call_id.execution_success"
```

### Audit Trail

**All mutations in the last 24 hours:**

```bash
# ELK
audit_type:"mutation" AND @timestamp:[now-24h TO now]

# Datadog
@audit_type:mutation -24h

# Splunk
index="bitbucket-mcp" audit_type="mutation" earliest=-24h
```

**Mutations by user:**

```bash
# ELK (aggregation)
{
  "query": { "term": { "audit_type": "mutation" } },
  "aggs": {
    "users": {
      "terms": { "field": "user_id.keyword", "size": 10 }
    }
  }
}

# Splunk
index="bitbucket-mcp" audit_type="mutation"
| stats count by user_id
| sort -count
```

### Cache Performance

**Cache hit rate:**

```bash
# Splunk
index="bitbucket-mcp" cache_hit=*
| stats count(eval(cache_hit="true")) as hits, count(eval(cache_hit="false")) as misses
| eval hit_rate = round(hits / (hits + misses) * 100, 2)
```

### Authentication Monitoring

**Failed authentication attempts:**

```bash
# ELK
auth_status:"failure" AND @timestamp:[now-1h TO now]

# Datadog
@auth_status:failure -1h

# Splunk
index="bitbucket-mcp" auth_status="failure" earliest=-1h
```

## Alert Recommendations

### Critical Alerts (PagerDuty/OpsGenie)

1. **High Error Rate**
   - Trigger: >5% error rate over 5 minutes
   - Query: `count(level="error") / count(*) > 0.05`
   - Action: Page on-call engineer

2. **Circuit Breaker OPEN**
   - Trigger: Circuit breaker state changes to OPEN
   - Query: `event="circuit_breaker.state_transition" AND new_state="OPEN"`
   - Action: Page on-call engineer

3. **Authentication Failures**
   - Trigger: >10 auth failures in 5 minutes
   - Query: `count(auth_status="failure") > 10`
   - Action: Investigate potential security issue

### Warning Alerts (Slack/Email)

4. **High Latency**
   - Trigger: P95 latency >2 seconds over 10 minutes
   - Query: `percentile(latency_ms, 95) > 2000`
   - Action: Notify team channel

5. **Cache Hit Rate Drop**
   - Trigger: Cache hit rate <50% over 15 minutes
   - Query: `cache_hit_rate < 0.5`
   - Action: Notify team channel

6. **Rate Limiting**
   - Trigger: >100 rate limit rejections in 5 minutes
   - Query: `count(event="rate_limiter.request_rejected") > 100`
   - Action: Notify team channel

7. **Degraded Mode**
   - Trigger: Service enters degraded mode
   - Query: `event="call_id.degraded_mode"`
   - Action: Notify team channel

### Example Alert Configuration (Datadog)

```yaml
name: "Bitbucket MCP - High Error Rate"
type: metric alert
query: |
  sum(last_5m):
    sum:bitbucket.mcp.errors{service:bitbucket-dc-mcp}.as_count() /
    sum:bitbucket.mcp.requests{service:bitbucket-dc-mcp}.as_count() > 0.05
message: |
  {{#is_alert}}
  High error rate detected in Bitbucket MCP Server (>5% in last 5 minutes)
  
  Correlation IDs: @correlation_id
  Error types: @error_type
  {{/is_alert}}
  
  @pagerduty-bitbucket-mcp
tags:
  - service:bitbucket-dc-mcp
  - severity:critical
```

### Example Alert Configuration (Splunk)

```spl
# Alert: High Error Rate
index="bitbucket-mcp"
| bucket _time span=5m
| stats count(eval(level="error")) as errors, count as total by _time
| eval error_rate = errors / total
| where error_rate > 0.05
```

## Best Practices

1. **Always use correlation IDs** when troubleshooting issues - they trace requests end-to-end
2. **Set LOG_LEVEL=INFO in production** - DEBUG logs are verbose and can impact performance
3. **Enable log rotation** to prevent disk space issues
4. **Monitor audit trail** for compliance and security investigations
5. **Set up dashboards** for key metrics (error rate, latency, cache hit rate)
6. **Alert on trends** not individual events - use time windows for rate calculations
7. **Include correlation_id in support tickets** to help engineers trace issues
8. **Review logs regularly** to identify patterns and optimize performance

## Troubleshooting

### No logs appearing

**Check LOG_LEVEL:**
```bash
echo $LOG_LEVEL
```

**Check log output destination:**
```bash
echo $LOG_OUTPUT
```

**Check file permissions:**
```bash
ls -l /var/log/bitbucket-mcp/
```

### Logs not structured (pretty-printed)

Disable pretty printing in production:
```bash
unset LOG_PRETTY
```

### Sensitive data in logs

All credentials should be automatically redacted with `***`. If you see sensitive data:
1. Check the redaction paths in `src/core/logger.ts`
2. Report as a security issue
3. DO NOT commit logs with sensitive data to version control

### Performance impact

If logging impacts performance:
1. Set `LOG_LEVEL=WARN` or `LOG_LEVEL=ERROR`
2. Disable DEBUG logs (they include full API request/response bodies)
3. Use file output instead of stdout (faster)
4. Enable log rotation to prevent large files
