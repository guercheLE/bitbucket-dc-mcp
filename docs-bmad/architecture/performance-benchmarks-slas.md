# Performance Benchmarks & SLAs

### Response Time SLAs

| Operation | Target p50 | Target p95 | Target p99 | Measured (Baseline) |
|-----------|-----------|-----------|-----------|---------------------|
| search_ids | <200ms | <500ms | <1s | TBD (Story 1.6-1.8) |
| get_id (cache hit) | <50ms | <100ms | <200ms | TBD |
| get_id (cache miss) | <100ms | <200ms | <300ms | TBD |
| call_id (excluding Bitbucket) | <100ms | <500ms | <1s | TBD |
| MCP handshake | <50ms | <100ms | <200ms | TBD |

**Measurement Strategy:**
- Benchmark suite em `tests/benchmarks/performance.test.ts`
- Track latencies em structured logs (percentiles calculados via log analysis)
- CI/CD fail se regression >20% vs baseline

### Throughput SLAs

| Scenario | Target | Measured (Baseline) |
|----------|--------|---------------------|
| Concurrent searches | 100 req/s | TBD (Story 1.8) |
| Concurrent call_id | 100 req/s | TBD (Story 2.6) |
| Mixed workload | 100 req/s | TBD |

### Resource Consumption SLAs

| Resource | Idle | Under Load (100 req/s) | Max Acceptable |
|----------|------|------------------------|----------------|
| Memory (RSS) | <512MB | <1GB | <2GB |
| CPU (sustained) | <5% | <50% | <80% |
| Startup time | <5s | N/A | <10s |

