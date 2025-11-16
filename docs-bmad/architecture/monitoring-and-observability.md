# Monitoring and Observability

### Monitoring Stack

- **Frontend Monitoring:** N/A (produto é backend/CLI apenas)
- **Backend Monitoring:** Structured logs (pino JSON) escritos para stdout/file, ingestible por log aggregators (ELK, Datadog, Splunk)
- **Error Tracking:** Logs com severity ERROR + stack traces, alertable via log aggregators
- **Performance Monitoring:** Log entries com latency_ms para cada operation (search, call), p50/p95/p99 calculable via log analysis

**Future (v1.1+):**
- Prometheus `/metrics` endpoint (request counts, latencies, error rates)
- OpenTelemetry integration (distributed tracing, spans)

### Key Metrics

**Frontend Metrics:**
- N/A

**Backend Metrics:**

**Request Metrics:**
- `mcp_tool_calls_total{tool="search_ids|get_id|call_id", status="success|error"}` - Total tool invocations
- `mcp_tool_latency_ms{tool="search_ids|get_id|call_id", quantile="0.5|0.95|0.99"}` - Tool latency distribution
- `bitbucket_api_requests_total{method="GET|POST|PUT|DELETE", status="2xx|4xx|5xx"}` - Bitbucket API calls
- `bitbucket_api_latency_ms{endpoint="/issue|/search|..."` - Bitbucket API response times

**Resource Metrics:**
- `process_memory_bytes{type="rss|heapUsed|heapTotal|external"}` - Memory usage
- `process_cpu_seconds_total` - CPU time
- `cache_hit_rate{cache="query_embeddings|operation_schemas"}` - Cache efficiency
- `sqlite_query_latency_ms` - Vector search performance

**Reliability Metrics:**
- `circuit_breaker_state{name="bitbucket_client", state="closed|open|half_open"}` - Circuit breaker status
- `rate_limiter_rejected_total` - Requests rejected by rate limiter
- `retry_attempts_total{outcome="success|exhausted"}` - Retry statistics

**Logs (Structured JSON via pino):**

```json
{
  "level": "info",
  "time": 1705320000000,
  "correlation_id": "req-abc-123",
  "tool": "search_ids",
  "query": "create issue",
  "results_count": 5,
  "latency_ms": 342,
  "cache_hit": false,
  "msg": "Search completed"
}

{
  "level": "error",
  "time": 1705320001000,
  "correlation_id": "req-xyz-789",
  "tool": "call_id",
  "operation_id": "create_issue",
  "error_code": "AUTHENTICATION_ERROR",
  "error_message": "Authentication failed",
  "stack": "Error: Authentication failed\n    at AuthManager.getAuthHeaders...",
  "msg": "Operation failed"
}
```

**Alerting Recommendations (Log Aggregator Rules):**
- ERROR logs > 10/min → Alert: High error rate
- Circuit breaker state = OPEN → Alert: Bitbucket DC unavailable
- Memory usage > 1.5GB for 5+ min → Warning: Memory leak?
- Latency p95 > 1s for search_ids → Warning: Performance degradation

