# Troubleshooting Guide & FAQ

Comprehensive troubleshooting guide and frequently asked questions for the Bitbucket Data Center MCP Server.

## Quick Navigation

**Having an issue?** Jump to the relevant section:

- 🔧 [Common Issues](#common-issues) - Solutions to frequent problems
- 🔍 [Diagnostics](#diagnostics) - Tools to diagnose problems
- ❓ [FAQ](#faq) - Frequently asked questions
- 📋 [Error Code Reference](#error-code-reference) - Complete error code table
- 🆘 [Getting Help](#getting-help) - How to get support

**Quick Symptom Finder:**

| Symptom | Section |
|---------|---------|
| Server starts but shows 0 tools | [MCP Server Startup Failures](#mcp-server-startup-failures) |
| JSON-RPC protocol errors | [MCP Server Startup Failures](#mcp-server-startup-failures) |
| Cannot connect to Bitbucket | [Connection Issues](#cannot-connect-to-bitbucket) |
| 401/403 Authentication errors | [Authentication Fails](#authentication-fails) |
| 404 API endpoint errors | [API Version Issues](#api-version-issues) |
| Search returns no results | [Search Returns No Results](#search-returns-no-results) |
| Request timeouts | [Operation Timeout](#operation-timeout) |
| 429 Rate limit errors | [Rate Limiting Errors](#rate-limiting-errors) |
| Circuit breaker open | [Circuit Breaker Open](#circuit-breaker-open) |
| Memory issues | [Memory Issues](#memory-issues) |
| SSL/TLS certificate errors | [SSL/TLS Errors](#ssltls-errors) |
| Wrong API version | [API Version Issues](#api-version-issues) |
| Docker container problems | [Docker Container Issues](#docker-container-issues) |
| npm install failures | [npm Global Install Issues](#npm-global-install-issues) |

## Table of Contents

- [Common Issues](#common-issues)
  - [Cannot Connect to Bitbucket](#cannot-connect-to-bitbucket)
  - [Authentication Fails](#authentication-fails)
  - [Search Returns No Results](#search-returns-no-results)
  - [Operation Timeout](#operation-timeout)
  - [Rate Limiting Errors](#rate-limiting-errors)
  - [Circuit Breaker Open](#circuit-breaker-open)
  - [Memory Issues](#memory-issues)
  - [Validation Errors](#validation-errors)
  - [SSL/TLS Errors](#ssltls-errors)
  - [API Version Issues](#api-version-issues)
  - [Docker Container Issues](#docker-container-issues)
  - [npm Global Install Issues](#npm-global-install-issues)
- [Diagnostics](#diagnostics)
  - [Diagnostic Commands](#diagnostic-commands)
  - [Log Analysis](#log-analysis)
  - [Health Check Procedures](#health-check-procedures)
- [FAQ](#faq)
  - [Authentication](#authentication-faq)
  - [Configuration](#configuration-faq)
  - [Compatibility](#compatibility-faq)
  - [Usage](#usage-faq)
  - [Performance](#performance-faq)
  - [Troubleshooting](#troubleshooting-faq)
  - [Contributing](#contributing-faq)
- [Error Code Reference](#error-code-reference)
- [Getting Help](#getting-help)

---

## Common Issues

### MCP Server Startup Failures

**Symptoms:**
- MCP client (Cursor, Claude Desktop, etc.) shows "Found 0 tools, 0 prompts, and 0 resources"
- Errors about invalid JSON-RPC messages: `"Unrecognized key(s) in object: 'level', 'time', 'service', 'version', 'msg'"`
- Client errors mentioning `invalid_literal`, `invalid_type`, or `invalid_union`
- Server appears to start but client cannot communicate with it

**Root Cause:**
Log messages are being written to stdout instead of stderr, corrupting the JSON-RPC protocol communication. MCP servers use stdin/stdout for protocol messages, so all logs must go to stderr.

**Resolution:**

This issue has been fixed in version 2.6.3+. If you're experiencing this issue:

1. **Update to the latest version:**
   ```bash
   # If using npx
   npx bitbucket-dc-mcp@latest start
   
   # If globally installed
   npm update -g bitbucket-dc-mcp
   ```

2. **Verify the fix:**
   Check that logs are going to stderr by looking at your MCP client's diagnostic logs. You should NOT see log messages mixed with JSON-RPC protocol messages.

3. **If the issue persists:**
   - Ensure `LOG_OUTPUT` environment variable is not set to a custom value that writes to stdout
   - Check that you don't have custom log configuration that overrides stderr redirection
   - Report the issue with your full configuration

**Technical Details:**
The MCP protocol uses stdio transport where:
- **stdin**: Client → Server protocol messages
- **stdout**: Server → Client protocol messages  
- **stderr**: Server logs and diagnostics

Writing logs to stdout corrupts the JSON-RPC messages and causes protocol errors. The server now automatically redirects all logs to stderr when `LOG_OUTPUT=stdout` (the default).

### Cannot Connect to Bitbucket

**Symptoms:**
- Connection timeout errors
- DNS resolution failures
- "ECONNREFUSED" or "ENOTFOUND" errors
- Requests hanging indefinitely

**Root Causes:**
- Invalid or incorrect Bitbucket URL
- Network connectivity issues
- Firewall blocking requests
- Proxy configuration problems
- Bitbucket instance is down

**Resolution:**

1. **Verify Bitbucket URL format:**
   ```bash
   # Correct format (with protocol)
   https://bitbucket.example.com
   
   # Incorrect (missing protocol)
   bitbucket.example.com  # ❌
   
   # Incorrect (trailing slash)
   https://bitbucket.example.com/  # ❌
   ```

2. **Test connectivity:**
   ```bash
   # Test with curl
   curl -I https://bitbucket.example.com
   
   # Test with bitbucket-mcp
   bitbucket-mcp test-connection
   ```

3. **Check network settings:**
   ```bash
   # Test DNS resolution
   nslookup bitbucket.example.com
   
   # Test with ping
   ping bitbucket.example.com
   ```

4. **Verify firewall/proxy:**
   - Check corporate firewall rules
   - Configure proxy in environment variables if needed:
     ```bash
     export HTTP_PROXY=http://proxy.example.com:8080
     export HTTPS_PROXY=http://proxy.example.com:8080
     ```

**Prevention:**
- Use the setup wizard which validates URLs: `bitbucket-mcp setup`
- Always test connection after configuration changes: `bitbucket-mcp test-connection`
- Document network requirements for your organization

**Related Sections:** [Error Code: SERVICE_UNAVAILABLE](#error-code-reference), [FAQ: Compatibility](#compatibility-faq)

---

### Authentication Fails

**Symptoms:**
- 401 Unauthorized errors
- 403 Forbidden errors
- "Invalid credentials" messages
- "Authentication failed" errors

**Root Causes:**
- Wrong or expired credentials
- Expired access tokens (OAuth2/PAT)
- Insufficient Bitbucket permissions
- Misconfigured auth method
- Credentials not found in keychain

**Resolution:**

1. **Verify credentials are stored:**
   ```bash
   bitbucket-mcp config show
   # Should show "Credentials: Stored securely in keychain"
   ```

2. **Test authentication:**
   ```bash
   bitbucket-mcp test-connection
   # Will verify credentials and show authenticated user
   ```

3. **For Personal Access Token (PAT):**
   - Log into Bitbucket Data Center
   - Navigate to Profile → Personal Access Tokens
   - Check token hasn't expired
   - Regenerate if needed, then run `bitbucket-mcp setup` again

4. **For OAuth 2.0:**
   - Verify Client ID and Client Secret are correct
   - Ensure redirect URI matches: `http://localhost:8080/callback`
   - Re-run setup to refresh tokens: `bitbucket-mcp setup`

5. **For Basic Auth:**
   - Verify username and password
   - Ensure HTTPS is used (Basic Auth over HTTP is insecure)

6. **Check Bitbucket permissions:**
   - User must have appropriate project access
   - Required permissions: Browse Projects, Create Issues, Edit Issues

**Prevention:**
- Use OAuth2 or PAT for production (not Basic Auth)
- Implement token rotation for OAuth2
- Test authentication after setup: `bitbucket-mcp test-connection`
- Monitor token expiration dates

**Related Sections:** [Authentication Guide](authentication.md), [Error Code: AUTHENTICATION_ERROR](#error-code-reference)

---

### Credentials Not Found (Windows Keychain Issues)

**Symptoms:**
- Error message: "No credentials found in storage" or "Credentials not found in keychain"
- Setup wizard completes successfully but test-connection fails
- Log message: `"keytar.setPassword is not a function"`
- Credentials work initially but fail after restart

**Root Cause:**
The `keytar` library (used for OS keychain integration) has compatibility issues on some Windows systems, particularly with Windows Credential Manager. When keytar fails, the system automatically falls back to encrypted file storage, but older versions didn't handle this transition properly.

**Resolution (Automatic - Version 2.11.0+):**

**This issue has been fixed in version 2.11.0+.** The system now:
1. Automatically detects keytar failures during setup
2. Switches to encrypted file storage seamlessly
3. Tests keychain availability before operations
4. Persists the fallback mode across sessions

**If you're on an older version:**
```bash
# Update to latest version
npm update -g bitbucket-dc-mcp

# Re-run setup to save credentials with the fix
bitbucket-dc-mcp setup
```

**Manual Workaround (Force File Storage):**

If you prefer to explicitly use encrypted file storage instead of attempting keychain:

1. **Edit your config file** (`~/.bitbucket-dc-mcp/config.yml` on Windows: `C:\Users\<username>\.bitbucket-dc-mcp\config.yml`):
   ```yaml
   bitbucket_url: https://your-bitbucket.com
   auth_method: pat
   force_file_storage: true  # Add this line
   ```

2. **Or set environment variable:**
   ```bash
   # PowerShell
   $env:BITBUCKET_FORCE_FILE_STORAGE="true"
   
   # CMD
   set BITBUCKET_FORCE_FILE_STORAGE=true
   ```

3. **Re-run setup:**
   ```bash
   bitbucket-dc-mcp setup
   ```

**Verification:**

```bash
# Test connection
bitbucket-dc-mcp test-connection

# Check logs - should see:
# "Credential storage configured to use encrypted file storage (keychain disabled)"
# OR
# "Credentials saved to encrypted fallback file"
```

**Security Note:**
The encrypted file fallback uses AES-256-GCM encryption with machine-specific keys. While not as secure as OS keychain, it provides reasonable protection for single-user systems. The file is located at:
- Windows: `C:\Users\<username>\.bitbucket-dc-mcp\credentials.enc`
- macOS/Linux: `~/.bitbucket-dc-mcp/credentials.enc`

File permissions are set to 0600 (owner read/write only).

**Related Issues:**
- Windows Credential Manager access denied
- Keytar native module compilation errors
- "Cannot find module keytar" errors

**Related Sections:** [Authentication Guide](authentication.md), [Configuration Guide](../README.md#configuration)

---

### Search Returns No Results

**Symptoms:**
- Empty results array from `search_ids` tool
- No operation IDs returned
- Search query seems too specific

**Root Causes:**
- Embeddings database not initialized
- `embeddings.db` file missing or corrupt
- Query terms don't match any operations
- Database not populated with operations

**Resolution:**

1. **Verify database exists:**
   ```bash
   ls -lh data/embeddings.db
   # Should exist and be 3-4MB in size
   ```

2. **Check database contents:**
   ```bash
   sqlite3 data/embeddings.db "SELECT COUNT(*) FROM operations;"
   # Should return ~500 operations
   ```

3. **Rebuild database if missing:**
   ```bash
   # Download OpenAPI spec
   npm run download-openapi
   
   # Generate embeddings
   npm run populate-db
   ```

4. **Try broader search query:**
   ```bash
   # Too specific
   bitbucket-mcp search "create issue with epic link and custom fields"
   
   # Better
   bitbucket-mcp search "create issue"
   ```

5. **Use debug mode to see what's happening:**
   ```bash
   bitbucket-mcp search "your query" --debug
   ```

**Prevention:**
- Validate database during startup
- Include sample queries in documentation
- Run `npm run populate-db` after fresh install

**Related Sections:** [Diagnostics](#diagnostics), [FAQ: Usage](#usage-faq)

---

### Operation Timeout

**Symptoms:**
- Request hangs for 30+ seconds
- Timeout errors: "Request timeout after 30000ms"
- Operations eventually fail with timeout

**Root Causes:**
- Slow Bitbucket instance response times
- High network latency
- Large response payloads
- Bitbucket performing slow database queries

**Resolution:**

1. **Increase timeout in configuration:**
   
   Edit `~/.bitbucket-mcp/config.yml`:
   ```yaml
   timeout: 60000  # 60 seconds (default is 30000)
   ```

2. **Or use environment variable:**
   ```bash
   export TIMEOUT=60000
   ```

3. **Check Bitbucket performance:**
   ```bash
   # Test Bitbucket response time
   time curl -I https://bitbucket.example.com/rest/api/3/myself
   ```

4. **Optimize query parameters:**
   - Limit returned fields: `fields=summary,status` instead of all fields
   - Use pagination for large result sets
   - Reduce `maxResults` parameter

**Prevention:**
- Set appropriate timeout values based on Bitbucket performance
- Monitor Bitbucket response times
- Optimize Bitbucket queries (use JQL filters)
- Consider caching for frequently accessed data

**Related Sections:** [Error Code: TIMEOUT](#error-code-reference), [FAQ: Performance](#performance-faq)

---

### Rate Limiting Errors

**Symptoms:**
- 429 Too Many Requests errors
- "Rate limit exceeded" messages
- `retry_after` header in responses
- Requests start failing after many successful calls

**Root Causes:**
- Too many requests in short time period
- Misconfigured rate limit settings
- Shared API keys across multiple users/services
- Bitbucket Data Center rate limiting enabled

**Resolution:**

1. **Check current rate limit configuration:**
   ```bash
   bitbucket-mcp config show
   # Look for rate_limit setting
   ```

2. **Wait for rate limit reset:**
   - Check `retry_after` value in error response
   - Wait specified duration before retrying

3. **Adjust rate limit in configuration:**
   
   Edit `~/.bitbucket-mcp/config.yml`:
   ```yaml
   rate_limit: 50  # Reduce from default 100 requests/second
   ```

4. **Use dedicated credentials:**
   - Don't share API keys across services
   - Create separate Bitbucket users for different applications

5. **Implement backoff strategy:**
   - MCP server automatically retries with exponential backoff
   - For manual scripts, implement delay between requests

**Prevention:**
- Configure appropriate rate limits for your Bitbucket instance
- Monitor request rates in logs
- Use caching to reduce API calls
- Coordinate with Bitbucket administrators on rate limit policies

**Related Sections:** [Error Code: RATE_LIMIT_EXCEEDED](#error-code-reference), [FAQ: Performance](#performance-faq)

---

### Circuit Breaker Open

**Symptoms:**
- "Circuit breaker OPEN" errors
- All requests failing immediately without attempting connection
- Errors persist for ~60 seconds then recover

**Root Causes:**
- Multiple consecutive failed requests to Bitbucket
- Bitbucket instance is down or experiencing issues
- Network connectivity problems
- Circuit breaker threshold reached (default: 5 failures)

**Resolution:**

1. **Wait for circuit breaker reset:**
   - Default timeout is 60 seconds
   - Circuit breaker will automatically transition to HALF_OPEN
   - If next request succeeds, circuit closes

2. **Check Bitbucket availability:**
   ```bash
   # Test Bitbucket health
   curl https://bitbucket.example.com/status
   
   # Test authentication
   bitbucket-mcp test-connection
   ```

3. **Check server logs for root cause:**
   ```bash
   # Find what caused circuit to open
   cat logs/bitbucket-mcp.log | jq 'select(.event == "circuit_breaker.opened")'
   ```

4. **Restart MCP server to reset circuit:**
   ```bash
   # Only if Bitbucket is confirmed healthy
   # Restart will reset circuit breaker to CLOSED
   ```

**Prevention:**
- Monitor Bitbucket health proactively
- Configure appropriate circuit breaker thresholds
- Set up alerts for circuit breaker state changes

**Related Sections:** [Error Code: CIRCUIT_BREAKER_OPEN](#error-code-reference), [Monitoring](observability.md)

---

### Memory Issues

**Symptoms:**
- Process crashes with OOM (Out of Memory) errors
- Node.js heap out of memory
- Slow performance and high memory usage
- System becomes unresponsive

**Root Causes:**
- Large result sets from Bitbucket API
- Memory leaks in application code
- Insufficient system resources
- Not releasing resources properly

**Resolution:**

1. **Check current memory usage:**
   ```bash
   # On macOS/Linux
   ps aux | grep node
   
   # Monitor in real-time
   top -p $(pgrep -f bitbucket-mcp)
   ```

2. **Increase Node.js heap size:**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=2048"  # 2GB
   npm start
   ```

3. **Limit result set sizes:**
   - Use pagination: `maxResults=50` instead of `maxResults=1000`
   - Limit returned fields: `fields=summary,status`
   - Filter with JQL to reduce data volume

4. **Restart process:**
   ```bash
   # Temporary fix
   npm restart
   ```

**Prevention:**
- Monitor memory usage over time
- Set appropriate query limits
- Regular server restarts in production

**Related Sections:** [FAQ: Performance](#performance-faq), [Monitoring](observability.md)

---

### Validation Errors

**Symptoms:**
- "Invalid parameters" errors
- "Schema validation failed" messages
- 400 Bad Request responses
- Parameter type mismatches

**Root Causes:**
- Wrong parameter types (string instead of number, etc.)
- Missing required fields
- Invalid values (e.g., negative IDs)
- Incorrect JSON structure

**Resolution:**

1. **Get operation schema:**
   ```bash
   # Use get_id tool to see required parameters
   bitbucket-mcp call get_id --param operationId=createIssue
   ```

2. **Check API reference:**
   - See [API Reference](api-reference.md) for complete schemas
   - Review [Cookbook](cookbook.md) for working examples

3. **Common validation issues:**
   ```javascript
   // ❌ Wrong: number as string
   { "id": "12345" }
   
   // ✅ Correct: number as number
   { "id": 12345 }
   ```

**Prevention:**
- Always use `get_id` to retrieve schemas before calling operations
- Refer to working examples in [Cookbook](cookbook.md)
- Use TypeScript for type safety in custom scripts

**Related Sections:** [API Reference](api-reference.md), [Error Code: VALIDATION_ERROR](#error-code-reference)

---

### SSL/TLS Errors

**Symptoms:**
- Certificate verification failures
- "unable to verify the first certificate" errors
- SSL handshake errors
- "self-signed certificate" errors

**Root Causes:**
- Self-signed certificates in dev/test environments
- Expired SSL certificates
- Incomplete certificate chains
- Certificate authority not trusted by OS

**Resolution:**

1. **For development/testing ONLY (not production):**
   ```bash
   # Disable certificate validation (INSECURE!)
   export NODE_TLS_REJECT_UNAUTHORIZED=0
   ```
   
   ⚠️ **WARNING:** Never use this in production! It makes you vulnerable to man-in-the-middle attacks.

2. **For production, install CA certificate:**
   ```bash
   # Add CA cert to Node.js trust store
   export NODE_EXTRA_CA_CERTS=/path/to/ca-certificate.crt
   ```

3. **Verify certificate chain:**
   ```bash
   # Check certificate details
   openssl s_client -connect bitbucket.example.com:443 -showcerts
   ```

**Prevention:**
- Use valid certificates from trusted CAs in production
- Document certificate requirements for your organization
- Monitor certificate expiration dates

**Related Sections:** [Getting Help](#getting-help)

---

### API Version Issues

**Symptoms:**
- 404 errors when calling Bitbucket API endpoints
- Operations fail with "endpoint not found"
- Some operations work, others don't
- Errors mentioning "REST API v2" or "REST API v3"

**Root Causes:**
- Wrong API version configured for your Bitbucket instance
- API version not detected correctly during setup
- Bitbucket instance upgraded but config not updated
- Manual override conflicting with actual API version

**Resolution:**

1. **Check your Bitbucket version:**
   ```bash
   # Test which API version your Bitbucket supports
   curl https://your-bitbucket-url/rest/api/2/serverInfo
   curl https://your-bitbucket-url/rest/api/3/serverInfo
   
   # The one that returns valid JSON (not 404) is correct
   ```

2. **Verify configured API version:**
   ```bash
   bitbucket-dc-mcp config show | grep api_version
   ```

3. **Re-detect API version automatically:**
   ```bash
   # Re-run setup to auto-detect correct version
   bitbucket-dc-mcp setup --force
   ```

4. **Manually override API version:**
   ```bash
   # For Bitbucket 8.x and older
   export BITBUCKET_API_VERSION=2
   
   # For modern Bitbucket instances
   export BITBUCKET_API_VERSION=latest
   ```

5. **Edit config file directly:**
   ```yaml
   # ~/.bitbucket-dc-mcp/config.yml
   bitbucket:
     api_version: "latest"  # Change to "latest" or "1.0"
   ```

**API Version Guide:**
- **Modern Bitbucket Data Center:** Use `latest`
- **Legacy Bitbucket Data Center:** Use `1.0`

**Prevention:**
- Always run `bitbucket-dc-mcp setup` after upgrading Bitbucket
- Monitor Bitbucket upgrade notifications
- Test connection after configuration changes: `bitbucket-dc-mcp test-connection`

**Related Documentation:**
- [API Version Detection Guide](./api-version-detection.md)
- [API Version FAQ](./api-version-faq.md)

---

### Docker Container Issues

**Symptoms:**
- Container fails to start
- stdio communication not working
- "Container exited with code 1" errors
- Environment variables not set

**Root Causes:**
- Missing required environment variables
- Volume mount problems
- Port conflicts
- Incorrect Docker configuration

**Resolution:**

1. **Check Docker logs:**
   ```bash
   docker logs bitbucket-mcp-server
   ```

2. **Verify environment variables:**
   ```bash
   docker exec bitbucket-mcp-server env | grep BITBUCKET
   ```

3. **Use provided docker-compose:**
   ```bash
   # Recommended approach
   docker-compose up -d
   ```

**Prevention:**
- Always use provided `docker-compose.yml`
- Validate configuration before starting container
- See [Docker Guide](docker.md) for complete setup instructions

**Related Sections:** [Docker Guide](docker.md), [Getting Help](#getting-help)

---

### npm Global Install Issues

**Symptoms:**
- `bitbucket-mcp: command not found` after installation
- Permission errors during `npm install -g`
- Node.js version incompatibility warnings

**Root Causes:**
- Node.js version < 20
- npm prefix/PATH configuration issues
- Permission denied for global installs

**Resolution:**

1. **Verify Node.js version:**
   ```bash
   node --version
   # Must be >= 20.0.0
   ```

2. **If Node.js < 20, upgrade:**
   ```bash
   # Using nvm (recommended)
   nvm install 18
   nvm use 18
   nvm alias default 18
   ```

3. **Fix permission errors:**
   
   **Linux/macOS:**
   ```bash
   # Configure npm to use user directory (recommended)
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   npm install -g bitbucket-dc-mcp
   ```
   
   **Windows (PowerShell as Administrator):**
   ```powershell
   npm install -g bitbucket-dc-mcp
   ```

**Prevention:**
- Document Node.js requirements in your setup process
- Use nvm for Node.js version management
- Configure npm prefix to avoid permission issues

**Related Sections:** [FAQ: Compatibility](#compatibility-faq)

---

## Diagnostics

### Diagnostic Commands

The `bitbucket-mcp` CLI provides several diagnostic commands to help troubleshoot issues.

#### `bitbucket-mcp config validate`

**Purpose:** Validate configuration file syntax and values

**Usage:**
```bash
bitbucket-mcp config validate [--config path/to/config.yml]
```

**What it checks:**
- ✅ Configuration file exists
- ✅ Required fields present (bitbucket_url, auth_method)
- ✅ Credentials stored in keychain
- ✅ Network connectivity to Bitbucket
- ✅ Authentication works

**Output:**
```
🔍 Validating configuration...

✅ Configuration file is valid
   URL: https://bitbucket.example.com
   Auth: pat

🔑 Checking credentials...

✅ Credentials found in keychain

🌐 Testing Bitbucket connectivity...

✅ Configuration validated successfully
```

**When to use:**
- After modifying configuration
- Debugging connection issues
- Before deploying to production

---

#### `bitbucket-mcp test-connection`

**Purpose:** Test connectivity and authentication to Bitbucket instance

**Usage:**
```bash
bitbucket-mcp test-connection [--debug]
```

**What it does:**
1. Verifies configuration file exists
2. Validates required fields
3. Checks credentials in keychain
4. Tests network connectivity
5. Authenticates with Bitbucket
6. Retrieves authenticated user information

**Output:**
```
🔍 Testing Bitbucket Data Center connection...

✅ Configuration file found
✅ Configuration is valid
   URL: https://bitbucket.example.com
   Auth Method: pat
✅ Credentials found in keychain

🌐 Testing network connectivity and authentication...

✅ Connection successful!
✅ Authentication verified

Authenticated User Information:
   Display Name: John Doe
   Email: john.doe@example.com
   Account ID: 5d8c6c7e8e7e7e7e7e7e7e7e
   Active: Yes

🎉 Your Bitbucket MCP server is configured correctly!
```

**When to use:**
- After initial setup
- When debugging auth issues
- Before troubleshooting other problems
- To verify Bitbucket availability

---

#### `bitbucket-mcp search --debug`

**Purpose:** Execute search with verbose debug logging

**Usage:**
```bash
bitbucket-mcp search "your query" --debug [--limit 10]
```

**What it shows:**
- Query embedding generation
- Database query execution
- Similarity scores
- Matched operations
- Performance metrics

**When to use:**
- Search returns unexpected results
- Debugging relevance issues
- Performance troubleshooting

---

### Log Analysis

#### Log Location

**Stdout (default):**
- Logs written to stdout when using stdio transport
- Redirect to file: `npm start > logs/bitbucket-mcp.log 2>&1`

#### Log Format

Structured JSON logs via **pino** library:

```json
{
  "level": "info",
  "time": 1705320000000,
  "correlation_id": "req-xyz-789",
  "tool": "call_id",
  "operation_id": "createIssue",
  "method": "POST",
  "path": "/rest/api/3/issue",
  "status": 201,
  "latency_ms": 342,
  "msg": "Bitbucket API request completed"
}
```

#### Key Log Fields

| Field | Description | Example |
|-------|-------------|---------|
| `level` | Log severity | `error`, `warn`, `info`, `debug` |
| `correlation_id` | Request trace ID | `req-xyz-789` |
| `tool` | MCP tool name | `call_id`, `search_ids` |
| `operation_id` | Bitbucket operation | `createIssue`, `getIssue` |
| `latency_ms` | Response time | `342` |
| `error_code` | Error code | `AUTHENTICATION_ERROR` |

#### Log Filtering Examples

**Find all errors:**
```bash
cat logs/bitbucket-mcp.log | jq 'select(.level == "error")'
```

**Trace specific request:**
```bash
cat logs/bitbucket-mcp.log | jq 'select(.correlation_id == "req-abc-123")'
```

**Find slow operations (>1s):**
```bash
cat logs/bitbucket-mcp.log | jq 'select(.latency_ms > 1000)'
```

---

### Health Check Procedures

#### Check Database

**Verify embeddings.db exists and is valid:**

```bash
# Check file exists
ls -lh data/embeddings.db
# Should be 3-4MB

# Check database contents
sqlite3 data/embeddings.db "SELECT COUNT(*) FROM operations;"
# Should return ~500
```

#### Check Node.js Version

```bash
node --version
# Should be >= 20.0.0
```

#### Check Dependencies

```bash
npm list --depth=0
# Should show all dependencies installed
```

#### End-to-End Health Check

```bash
# 1. Validate configuration
bitbucket-mcp config validate

# 2. Test connectivity
bitbucket-mcp test-connection

# 3. Test search functionality
bitbucket-mcp search "create issue"
```

---

## FAQ

### Authentication FAQ

#### Q: Which auth method should I use?

**A:** It depends on your environment:

- **OAuth 2.0** (Recommended for production): Most secure, supports token refresh
- **Personal Access Token (PAT)** (Recommended for production): Simple, secure, Bitbucket 8.14+
- **OAuth 1.0a**: Legacy method for Bitbucket 7.x+, complex setup
- **Basic Auth**: Username/password, local development only, NOT for production

See [Authentication Guide](authentication.md) for detailed comparison.

#### Q: How do I generate a Personal Access Token?

**A:** Follow these steps:

1. Log into Bitbucket Data Center
2. Click your profile picture → Profile
3. Click "Personal Access Tokens" in sidebar
4. Click "Create token"
5. Give it a name and set expiration
6. Copy the token (shown only once!)
7. Run `bitbucket-mcp setup` and select PAT method

#### Q: Can I use multiple auth methods?

**A:** No. You must choose one auth method per configuration.

---

### Configuration FAQ

#### Q: How do I update my Bitbucket URL?

**A:** Two options:

**Option 1 - Re-run setup:**
```bash
bitbucket-mcp setup --force
```

**Option 2 - Edit config manually:**
```bash
vi ~/.bitbucket-mcp/config.yml
bitbucket-mcp config validate
```

#### Q: Where is the config file stored?

**A:** Default locations (searched in order):

1. `./bitbucket-mcp.config.yml` (current directory)
2. `~/.bitbucket-mcp/config.yml` (user home)
3. `/etc/bitbucket-mcp/config.yml` (system-wide)

To find your active config:
```bash
bitbucket-mcp config path
```

#### Q: Can I use environment variables?

**A:** Yes! Environment variables override config file settings:

```bash
export BITBUCKET_URL=https://bitbucket.example.com
export BITBUCKET_AUTH_METHOD=pat
export BITBUCKET_TOKEN=your-token-here
export BITBUCKET_API_VERSION=3  # Optional: Override API version
export LOG_LEVEL=debug
```

#### Q: How do I configure API version?

**A:** The API version is automatically detected during setup. You can override it in three ways:

**Option 1 - Environment Variable:**
```bash
export BITBUCKET_API_VERSION=latest  # For modern instances
export BITBUCKET_API_VERSION=1.0     # For legacy instances
```

**Option 2 - Config File:**
```yaml
# ~/.bitbucket-mcp/config.yml
bitbucket:
  api_version: "latest"  # or "1.0"
```

**Option 3 - Re-run Setup:**
```bash
bitbucket-mcp setup --force  # Will auto-detect correct version
```

**See also:**
- [API Version Detection Guide](./api-version-detection.md)
- [API Version FAQ](./api-version-faq.md)

---

### Compatibility FAQ

#### Q: Can I use this with Bitbucket Cloud?

**A:** No. This MCP server is designed specifically for **Bitbucket Data Center** (self-hosted).

#### Q: What Bitbucket versions are supported?

**A:** 

- **Minimum:** Bitbucket Data Center 7.x+ with REST API support
- **Recommended:** Bitbucket Data Center 8.14+ for PAT support
- **Tested with:** Bitbucket Data Center 8.x and 9.x

**API Version Compatibility:**
- **Bitbucket 8.x and older:** Uses REST API v2 (automatically detected)
- **Bitbucket 9.x and newer:** Uses REST API v3 (automatically detected)

The server automatically detects which API version your Bitbucket instance supports during setup. See [API Version Detection Guide](./api-version-detection.md) for details.

#### Q: What platforms are supported?

**A:** All platforms with Node.js 22+:

- ✅ macOS (Intel and Apple Silicon)
- ✅ Linux (Ubuntu, RHEL, CentOS, Debian)
- ✅ Windows 10/11
- ✅ Docker containers

---

### Usage FAQ

#### Q: How do I search for operations?

**A:** Use the `search_ids` MCP tool or `bitbucket-mcp search` command:

```bash
bitbucket-mcp search "create issue" --limit 5
```

#### Q: What if search returns no results?

**A:** Try these troubleshooting steps:

1. Use broader search terms
2. Verify database is initialized: `ls -lh data/embeddings.db`
3. Rebuild database: `npm run populate-db`
4. Use debug mode: `bitbucket-mcp search "query" --debug`

#### Q: How do I know which parameters an operation needs?

**A:** Use the `get_id` tool:

```bash
bitbucket-mcp call get_id --param operationId=createIssue
```

---

### Performance FAQ

#### Q: Why is search slow?

**A:** First search generates embedding (~100-200ms). Subsequent searches are faster due to caching.

**Expected performance:**
- First search: < 500ms
- Subsequent searches: < 100ms

#### Q: Can I increase the timeout?

**A:** Yes, in configuration:

```yaml
timeout: 60000  # 60 seconds (default 30000)
```

#### Q: How many requests per second can it handle?

**A:** Depends on `rate_limit` configuration (default: 100 req/s).

---

### Troubleshooting FAQ

#### Q: How do I enable debug logging?

**A:** Set `LOG_LEVEL=debug`:

```bash
export LOG_LEVEL=debug
```

#### Q: Where are the logs?

**A:** Logs go to stdout by default. To save to file:

```bash
npm start > logs/bitbucket-mcp.log 2>&1
```

#### Q: How do I report bugs?

**A:** Open a GitHub issue with:

1. Environment info (OS, Node.js version, Bitbucket version)
2. Error logs and stack trace
3. Reproduction steps
4. Sanitized configuration

---

### Contributing FAQ

#### Q: How can I contribute?

**A:** See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

Quick start:
```bash
git clone https://github.com/guercheLE/bitbucket-dc-mcp
npm install
npm test
```

#### Q: Can I add new features?

**A:** Yes! Please open a feature request issue first to discuss.

#### Q: How do I run tests?

**A:** 

```bash
npm test              # All tests
npm run test:unit     # Unit tests only
npm run test:e2e      # E2E tests
```

---

## Error Code Reference

Complete reference table for all error codes returned by the MCP server.

| Code | HTTP Status | Description | Common Causes | Solution |
|------|-------------|-------------|---------------|----------|
| `VALIDATION_ERROR` | 400 | Invalid input parameters | Wrong parameter types, missing required fields | Check API reference with `get_id` tool. See [Validation Errors](#validation-errors) |
| `AUTHENTICATION_ERROR` | 401 | Authentication failed | Invalid credentials, expired tokens | Verify credentials, run `bitbucket-mcp test-connection`. See [Authentication Fails](#authentication-fails) |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions | User lacks required Bitbucket permissions | Check Bitbucket user permissions, verify PAT scopes |
| `NOT_FOUND` | 404 | Resource not found | Invalid operation ID, issue doesn't exist | Verify resource exists, check operation ID |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded | Too many requests | Wait for `retry_after` period, reduce request rate. See [Rate Limiting Errors](#rate-limiting-errors) |
| `TIMEOUT` | 408 | Request timeout | Slow Bitbucket instance, network latency | Increase timeout, optimize queries. See [Operation Timeout](#operation-timeout) |
| `SERVICE_UNAVAILABLE` | 503 | Bitbucket DC unavailable | Bitbucket instance down, network issues | Check Bitbucket status, verify connectivity. See [Cannot Connect to Bitbucket](#cannot-connect-to-bitbucket) |
| `CIRCUIT_BREAKER_OPEN` | 503 | Circuit breaker triggered | Multiple consecutive failures | Wait 60s for reset, verify Bitbucket availability. See [Circuit Breaker Open](#circuit-breaker-open) |
| `INTERNAL_ERROR` | 500 | Unexpected server error | Bugs, unhandled exceptions | Check logs with `correlation_id`, report bug if reproducible |
| `MODEL_LOAD_ERROR` | 500 | Embedding model failed to load | Missing model files, corrupted model | Reinstall package, run `npm install` |
| `DATABASE_ERROR` | 500 | Database operation failed | Corrupted embeddings.db, permission issues | Rebuild database: `npm run populate-db` |
| `CREDENTIAL_STORAGE_ERROR` | 500 | Keychain access failed | Keychain unavailable, permission denied | Check keychain access, reinstall keychain dependencies |

### Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Authentication failed: 401 Unauthorized",
    "details": {},
    "timestamp": "2025-10-19T10:30:00.000Z",
    "correlation_id": "req-abc-123"
  }
}
```

### Using correlation_id

The `correlation_id` field allows you to trace errors through logs:

```bash
cat logs/bitbucket-mcp.log | jq 'select(.correlation_id == "req-abc-123")'
```

---

## Getting Help

### Before Asking for Help

Please complete this checklist:

- [ ] Checked [Common Issues](#common-issues) section
- [ ] Reviewed [FAQ](#faq)
- [ ] Searched [existing GitHub issues](https://github.com/guercheLE/bitbucket-dc-mcp/issues)
- [ ] Ran diagnostic commands: `bitbucket-mcp config validate`, `bitbucket-mcp test-connection`
- [ ] Collected error logs and messages

### GitHub Issues

**Report bugs or request features:**

🔗 https://github.com/guercheLE/bitbucket-dc-mcp/issues

**What to include:**

1. **Environment information:**
   ```bash
   node --version
   npm --version
   bitbucket-mcp version
   ```

2. **Error logs:**
   - Full error message and stack trace
   - Relevant log entries (sanitized!)
   - Output from diagnostic commands

3. **Reproduction steps:**
   - Minimal steps to reproduce
   - Expected vs actual behavior

4. **Configuration:**
   - Sanitized config file (remove credentials!)
   - Environment variables used

### Documentation

- [README](../README.md) - Getting started
- [Authentication Guide](authentication.md) - Auth setup
- [API Reference](api-reference.md) - Tool reference
- [Cookbook](cookbook.md) - Usage examples
- [Architecture](internal/architecture.md) - Technical details
- [Contributing](../CONTRIBUTING.md) - Contribution guidelines

---

**Last Updated:** October 19, 2025  
**Version:** 1.2.0  
**Feedback:** [Open an issue](https://github.com/guercheLE/bitbucket-dc-mcp/issues/new) or submit a pull request!
