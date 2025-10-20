# Observability Guide

This guide explains how to use structured logging and observability features in the Bitbucket Data Center MCP Server.

## Table of Contents

- [Log Structure](#log-structure)
- [Configuration](#configuration)
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
