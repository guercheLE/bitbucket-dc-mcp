# Security Threat Model

### Threat Categories

**1. Credential Theft**
- **Threat:** Attacker gains access to Bitbucket credentials stored by MCP server
- **Probability:** Low (15%)
- **Impact:** High (full Bitbucket access compromise)
- **Mitigation Actions:**
  1. **Use OS Keychain** (macOS Keychain, Windows Credential Manager, Linux Secret Service)
  2. **Fallback encryption:** AES-256-GCM with machine-specific key (if keychain unavailable)
  3. **Never log credentials:** Configure pino redaction for `password`, `token`, `access_token`, `refresh_token` fields
  4. **File permissions:** Set `~/.bitbucket-mcp/config.yml` to 0600 (owner read/write only)
  5. **Memory security:** Clear sensitive variables after use (`codeVerifier = null` post-OAuth)
- **Detection:** Monitor auth failures, keychain access logs, file permission changes
- **Residual Risk:** LOW (requires OS-level compromise or root access)

**2. API Abuse**
- **Threat:** LLM ou malicious user abusa Bitbucket API via MCP server (bulk deletes, spam issues)
- **Probability:** Medium (30%)
- **Impact:** High (data loss, Bitbucket instance disruption)
- **Mitigation Actions:**
  1. **Rate limiting:** Token bucket 100 req/s per instance (configurable via `RATE_LIMIT` env var)
  2. **Audit trail:** Log all `call_id` mutations (POST/PUT/DELETE) with full params (sanitized)
  3. **Input validation:** Zod schemas validate all params before Bitbucket API calls
  4. **Operation allowlist (v1.2+):** Config option to restrict allowed operations (e.g., only read operations)
  5. **Dry-run mode (v1.2+):** Preview changes before executing destructive operations
- **Detection:** Monitor high request volumes, unusual operation patterns (e.g., 100 delete requests in 1 minute)
- **Residual Risk:** MEDIUM (requires careful LLM prompting, future allowlist reduces to LOW)

**3. Dependency Vulnerabilities**
- **Threat:** npm package vulnerabilities exploited (supply chain attack, remote code execution)
- **Probability:** Medium (25%)
- **Impact:** High (server compromise, credential theft)
- **Mitigation Actions:**
  1. **Automated scanning:** Dependabot alerts enabled, GitHub Security tab monitored
  2. **CI/CD checks:** `npm audit --production` in GitHub Actions, fail build on high-severity
  3. **Lock file committed:** `package-lock.json` ensures reproducible builds
  4. **Minimal dependencies:** 11 direct dependencies only (avoid bloat)
  5. **Regular updates:** Monthly dependency review, security patches within 48 hours
  6. **Manual review:** Audit diffs for new dependencies, check npm package reputation
- **Detection:** Dependabot PRs, npm audit output, Snyk alerts (optional)
- **Residual Risk:** LOW (active monitoring + quick patching < 48h)

**4. MCP Protocol Exploits**
- **Threat:** Malicious MCP client sends crafted stdin messages to crash server or inject code
- **Probability:** Low (10%)
- **Impact:** Medium (server crash, potential RCE if SDK has bugs)
- **Mitigation Actions:**
  1. **Official SDK:** Use `@modelcontextprotocol/sdk` (Anthropic-maintained, security-audited)
  2. **Input validation:** Validate all MCP messages against JSON-RPC schema before processing
  3. **Timeout limits:** 60s per tool call, 5s for protocol handshake (prevent DoS)
  4. **Sandboxing (v1.2+):** Consider running MCP server in Docker container (limited privileges)
  5. **SDK pinning:** Lock SDK version until security review of new releases
- **Detection:** Unexpected crashes, malformed JSON-RPC errors, timeout alerts
- **Residual Risk:** LOW (protocol designed by Anthropic with security focus, SDK actively maintained)

**5. Bitbucket DC Compromise via Proxy**
- **Threat:** MCP server used as proxy to attack Bitbucket DC instance (DDoS, brute force, exploit known Bitbucket vulnerabilities)
- **Probability:** Low (20%)
- **Impact:** High (Bitbucket instance down, data breach)
- **Mitigation Actions:**
  1. **HTTPS enforcement:** Reject HTTP connections to Bitbucket (production mode), validate TLS certificates
  2. **Credential validation:** Test credentials with `/myself` endpoint before allowing operations
  3. **Rate limiting:** Prevent overwhelming Bitbucket with 100 req/s limit (configurable lower)
  4. **Circuit breaker:** Auto-disable when Bitbucket returns 5 consecutive errors (protect from cascading failures)
  5. **Operation validation:** Only execute operations defined in OpenAPI spec (no arbitrary endpoints)
  6. **No raw SQL/code execution:** Never allow Bitbucket Script Runner or raw JQL injection
- **Detection:** Monitor rate limit events, circuit breaker triggers, Bitbucket DC admin alerts
- **Residual Risk:** LOW (server validates operations against schema, doesn't allow arbitrary HTTP requests)

### Security Checklist (Pre-launch)

- [ ] Zero high-severity npm audit vulnerabilities
- [ ] All auth methods tested (OAuth2, PAT, OAuth1, Basic)
- [ ] Credentials never logged (pino redaction configured)
- [ ] HTTPS enforced para Bitbucket DC (reject HTTP in production)
- [ ] Input validation 100% coverage (all MCP tool inputs)
- [ ] OS Keychain integration tested (macOS, Windows, Linux)
- [ ] Fallback encryption tested (AES-256-GCM)
- [ ] Rate limiting tested (prevents Bitbucket overload)
- [ ] Audit trail complete (all call_id mutations logged)
- [ ] Security documentation reviewed (authentication.md)

