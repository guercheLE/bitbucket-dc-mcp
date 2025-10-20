# Testing Scenarios - Detailed Specifications

This document provides comprehensive details for all beta testing scenarios, including expected behaviors, edge cases, and test data requirements.

## Table of Contents

- [Authentication Method Scenarios](#authentication-method-scenarios)
- [Common Workflow Scenarios](#common-workflow-scenarios)
- [Edge Case Scenarios](#edge-case-scenarios)
- [Performance Testing Scenarios](#performance-testing-scenarios)
- [Test Data Requirements](#test-data-requirements)

---

## Authentication Method Scenarios

### OAuth 2.0 (3LO with PKCE)

**Full Flow with PKCE:**

1. **Setup Phase:**
   - Configure OAuth 2.0 application in Bitbucket DC
   - Callback URL: `http://localhost:3000/callback` (or configured)
   - Enable PKCE (Proof Key for Code Exchange)
   - Note Client ID and Client Secret

2. **Authorization Flow:**
   ```
   Step 1: Generate code verifier and challenge
   Step 2: Redirect to /oauth/authorize with:
     - client_id
     - response_type=code
     - redirect_uri
     - code_challenge
     - code_challenge_method=S256
   Step 3: User authorizes in browser
   Step 4: Receive authorization code at callback
   Step 5: Exchange code for tokens at /oauth/token with:
     - code
     - code_verifier
     - client_id
     - grant_type=authorization_code
   Step 6: Receive access_token and refresh_token
   ```

3. **Token Refresh:**
   - Access token expires (typically 1 hour)
   - Automatically refresh using refresh_token
   - Should be transparent to user
   - Log token refresh events

4. **Expected Behaviors:**
   - ✅ Browser opens automatically for authorization
   - ✅ Tokens stored securely (OS keychain, not config file)
   - ✅ Refresh happens automatically before expiry
   - ✅ Clear error if authorization denied
   - ✅ Retry mechanism for network failures

5. **Test Cases:**
   - [ ] Fresh authorization (no existing tokens)
   - [ ] Re-authorization (tokens exist but expired)
   - [ ] Token refresh during active session
   - [ ] Authorization denied by user
   - [ ] Network failure during auth flow
   - [ ] Invalid client_id or secret

---

### Personal Access Token (PAT)

**Token Setup and Expiration Handling:**

1. **PAT Creation in Bitbucket:**
   ```
   Navigate: Bitbucket Settings → Personal Access Tokens
   Click: Create token
   Name: "MCP Server Beta Testing"
   Expiry: 30/60/90 days or custom
   Copy token (shown only once)
   ```

2. **Configuration:**
   - Paste token during setup wizard
   - Token stored in OS keychain
   - Not logged or visible in config
   - Redacted in logs: `pat: <redacted>`

3. **Expiration Handling:**
   - PATs have expiration date
   - Server should detect 401 errors
   - Clear error message: "Token expired, please re-run setup"
   - No automatic refresh (PATs are long-lived)

4. **Expected Behaviors:**
   - ✅ Token accepted if valid format
   - ✅ Connection test succeeds with valid token
   - ✅ 401 error handled gracefully
   - ✅ Token never logged in plain text
   - ✅ Stored securely in keychain

5. **Test Cases:**
   - [ ] Fresh PAT setup
   - [ ] Invalid PAT format
   - [ ] Expired PAT (simulate with revoked token)
   - [ ] PAT with insufficient permissions
   - [ ] Verify token not in config file
   - [ ] Verify token redacted in logs

---

### OAuth 1.0a (Legacy)

**Legacy Flow with Signature Validation:**

1. **Setup Phase:**
   - Create application link in Bitbucket DC
   - Configure as incoming link (OAuth 1.0a)
   - Generate RSA key pair (2048-bit)
   - Consumer key: `bitbucket-mcp-server`
   - Consumer callback: `oob` (out-of-band)

2. **Three-Legged OAuth Flow:**
   ```
   Step 1: Request token
     POST /plugins/servlet/oauth/request-token
     Headers: OAuth signature with consumer key + private key
     
   Step 2: Authorization
     Redirect user to /plugins/servlet/oauth/authorize
     User approves, receives verification code
     
   Step 3: Access token
     POST /plugins/servlet/oauth/access-token
     Include: request token + verifier + signature
     Receive: access token + token secret
   ```

3. **Signature Generation:**
   - Every request signed with HMAC-SHA1
   - Signature base string: method + URL + sorted params
   - Signing key: consumer_secret&token_secret
   - Include: oauth_signature, oauth_timestamp, oauth_nonce

4. **Expected Behaviors:**
   - ✅ RSA private key validated (PEM format)
   - ✅ Signature generation correct (RFC 5849)
   - ✅ Timestamp and nonce prevent replay attacks
   - ✅ Access token persisted securely
   - ✅ Works with Bitbucket Data Center (all versions)

5. **Test Cases:**
   - [ ] Full three-legged flow
   - [ ] Invalid RSA private key format
   - [ ] Signature validation failure
   - [ ] Timestamp too old/future (skew tolerance)
   - [ ] Duplicate nonce detection
   - [ ] Access token reuse across sessions

---

### Basic Authentication

**Username/Password Validation:**

1. **Setup Phase:**
   - Prompt for username (email or username)
   - Prompt for password (masked input)
   - Validate format before attempting connection
   - Display security warning

2. **Security Warning:**
   ```
   ⚠️  Warning: Basic Auth is less secure than OAuth/PAT
   
   Risks:
   - Credentials stored locally
   - No token expiration
   - Full account access
   
   Recommended: Use OAuth 2.0 or PAT for production
   
   Continue with Basic Auth? (y/N)
   ```

3. **Credential Storage:**
   - Username in config.json (plain text)
   - Password in OS keychain (encrypted)
   - Base64 encoding for HTTP header
   - Redacted in logs: `auth: Basic <redacted>`

4. **Expected Behaviors:**
   - ✅ Clear security warning displayed
   - ✅ Password never logged or shown
   - ✅ Works with all Bitbucket DC versions
   - ✅ Simple fallback when OAuth unavailable
   - ✅ Connection test validates credentials

5. **Test Cases:**
   - [ ] Valid username/password
   - [ ] Invalid credentials (401 error)
   - [ ] Empty username or password
   - [ ] Special characters in password
   - [ ] Account locked (too many failed attempts)
   - [ ] Password changed externally

---

## Common Workflow Scenarios

### Create Issue with Required Fields

**Objective:** Create a Bitbucket issue with only required fields

**Prerequisites:**
- Valid authentication configured
- Project key exists (e.g., "TEST")
- User has "Create Issues" permission

**Steps:**

1. **Search for operation:**
   ```json
   Tool: search_ids
   Input: {"query": "create issue"}
   Expected: "createIssue" in top 3 results
   ```

2. **Get operation schema:**
   ```json
   Tool: get_id
   Input: {"operation_id": "createIssue"}
   Expected: Full schema with required fields listed
   ```

3. **Prepare minimal request:**
   ```json
   {
     "fields": {
       "project": {"key": "TEST"},
       "summary": "Beta test issue - minimal fields",
       "issuetype": {"name": "Task"}
     }
   }
   ```

4. **Execute operation:**
   ```json
   Tool: call_id
   Input: {
     "operation_id": "createIssue",
     "parameters": {},
     "requestBody": { ... }
   }
   ```

5. **Verify result:**
   - Response contains `key` (e.g., "TEST-123")
   - Response contains `id` (numeric)
   - Response contains `self` URL
   - Issue visible in Bitbucket UI

**Expected Behaviors:**
- ✅ Issue created within 2 seconds
- ✅ All required fields accepted
- ✅ Default values applied for optional fields
- ✅ Audit log entry created in Bitbucket

**Edge Cases:**
- ❌ Invalid project key → 404 error
- ❌ Missing required field → 400 error with details
- ❌ Invalid issuetype → 400 error
- ❌ No permission → 403 error

---

### Create Issue with Custom Fields

**Objective:** Create issue with custom fields (e.g., custom text, select, number)

**Prerequisites:**
- Project has custom fields defined
- User can view and edit custom fields
- Custom field IDs known (e.g., "customfield_10001")

**Steps:**

1. **Get project metadata:**
   ```json
   Tool: search_ids
   Query: "get project metadata"
   Expected: "getProjectMetadata" or similar
   ```

2. **Fetch custom field definitions:**
   - Parse response for custom fields
   - Note field IDs, types, and constraints

3. **Prepare request with custom fields:**
   ```json
   {
     "fields": {
       "project": {"key": "TEST"},
       "summary": "Issue with custom fields",
       "issuetype": {"name": "Task"},
       "customfield_10001": "Custom text value",
       "customfield_10002": {"value": "Option A"},
       "customfield_10003": 42.5
     }
   }
   ```

4. **Execute and verify:**
   - Issue created successfully
   - Custom field values set correctly
   - Visible in Bitbucket UI custom field section

**Expected Behaviors:**
- ✅ Custom fields accepted by type (text, select, number, date, etc.)
- ✅ Validation errors clear for invalid values
- ✅ Optional custom fields can be omitted

**Edge Cases:**
- ❌ Invalid custom field ID → 400 error
- ❌ Wrong value type → 400 error (e.g., string for number field)
- ❌ Required custom field missing → 400 error

---

### Update Issue Fields

**Objective:** Update existing issue fields (summary, description, assignee, etc.)

**Steps:**

1. **Search for update operation:**
   ```json
   Query: "update issue fields"
   Expected: "editIssue" or "updateIssue"
   ```

2. **Get schema for editIssue:**
   - Note required parameters: `issueIdOrKey`
   - Note supported fields in request body

3. **Update single field (summary):**
   ```json
   {
     "operation_id": "editIssue",
     "parameters": {"issueIdOrKey": "TEST-123"},
     "requestBody": {
       "fields": {
         "summary": "Updated summary text"
       }
     }
   }
   ```

4. **Update multiple fields:**
   ```json
   {
     "fields": {
       "summary": "New summary",
       "description": "New description",
       "assignee": {"name": "jsmith"}
     }
   }
   ```

5. **Verify updates:**
   - Changes reflected in Bitbucket UI
   - Issue history shows changes
   - Notification sent (if configured)

**Expected Behaviors:**
- ✅ Updates applied within 2 seconds
- ✅ Only specified fields modified
- ✅ Other fields unchanged
- ✅ Audit trail updated

**Edge Cases:**
- ❌ Issue doesn't exist → 404 error
- ❌ No edit permission → 403 error
- ❌ Invalid assignee → 400 error
- ❌ Protected field (e.g., reporter) → may be rejected

---

### Search Issues by JQL-Equivalent Query

**Objective:** Use semantic search to find "search issues" operation, then execute JQL query

**Steps:**

1. **Search for JQL operation:**
   ```json
   Query: "search issues by JQL"
   Expected: "searchForIssuesUsingJql" or "searchForIssuesUsingJqlPost"
   ```

2. **Prepare JQL query:**
   ```
   project = TEST AND status = "In Progress"
   ```

3. **Execute search:**
   ```json
   {
     "operation_id": "searchForIssuesUsingJql",
     "parameters": {
       "jql": "project = TEST AND status = \"In Progress\"",
       "maxResults": 50
     }
   }
   ```

4. **Parse results:**
   - Array of issues with fields
   - Total count of matches
   - Pagination info (startAt, maxResults)

**Expected Behaviors:**
- ✅ JQL syntax validated by Bitbucket
- ✅ Results returned within 3 seconds
- ✅ Fields configurable via `fields` parameter
- ✅ Pagination works correctly

**Edge Cases:**
- ❌ Invalid JQL syntax → 400 error with explanation
- ❌ No matching issues → Empty array, not error
- ❌ Too many results → Paginate with startAt

---

### Add Comment to Issue

**Objective:** Add comment to existing issue

**Steps:**

1. **Search for comment operation:**
   ```json
   Query: "add comment to issue"
   Expected: "addComment"
   ```

2. **Prepare comment:**
   ```json
   {
     "operation_id": "addComment",
     "parameters": {"issueIdOrKey": "TEST-123"},
     "requestBody": {
       "body": "This is a comment from beta testing."
     }
   }
   ```

3. **Execute and verify:**
   - Comment appears in issue
   - Author is authenticated user
   - Timestamp accurate

**Expected Behaviors:**
- ✅ Comment added within 1 second
- ✅ Markdown/Wiki formatting supported (depending on Bitbucket config)
- ✅ Visibility restrictions work (if specified)

---

### Transition Issue Through Workflow

**Objective:** Move issue through workflow states (e.g., To Do → In Progress → Done)

**Steps:**

1. **Get available transitions:**
   ```json
   Query: "get issue transitions"
   Operation: "getTransitions"
   Parameters: {"issueIdOrKey": "TEST-123"}
   ```

2. **Select transition ID:**
   - Parse response for transition IDs and names
   - Choose "In Progress" transition (ID varies by workflow)

3. **Execute transition:**
   ```json
   {
     "operation_id": "doTransition",
     "parameters": {"issueIdOrKey": "TEST-123"},
     "requestBody": {
       "transition": {"id": "21"}
     }
   }
   ```

4. **Verify new status:**
   - Issue status changed in UI
   - Workflow history updated

**Expected Behaviors:**
- ✅ Only available transitions executable
- ✅ Workflow rules enforced (conditions, validators, post-functions)
- ✅ Required fields on screen prompted

**Edge Cases:**
- ❌ Invalid transition ID → 400 error
- ❌ Transition not allowed → 400 error with reason
- ❌ Required fields missing → 400 error

---

### Bulk Operations (Multiple Issues)

**Objective:** Create and update multiple issues efficiently

**Steps:**

1. **Create 5 issues sequentially:**
   ```
   For i = 1 to 5:
     create_issue("TEST-Bulk-" + i)
   ```

2. **Measure timing:**
   - Record start time
   - Track each operation latency
   - Record total time

3. **Update all created issues:**
   ```
   For each issue:
     update_summary("Updated in bulk test")
   ```

4. **Add comments to all:**
   ```
   For each issue:
     add_comment("Bulk operation complete")
   ```

**Expected Behaviors:**
- ✅ All operations succeed
- ✅ No rate limiting errors (<50 req/s)
- ✅ Total time reasonable (15 ops < 30s)
- ✅ Bitbucket performance not degraded

**Performance Targets:**
- Create issue: <2s each
- Update issue: <1s each
- Add comment: <1s each
- Total for 15 operations: <25s

---

## Edge Case Scenarios

### Network Failures During Operation Execution

**Test Scenarios:**

1. **Complete network loss:**
   - Disconnect WiFi/Ethernet during operation
   - Expected: Timeout after 30s
   - Expected: Retry mechanism activated
   - Expected: Clear error message: "Network unreachable"

2. **Intermittent connectivity:**
   - Simulate packet loss (tc/netem on Linux)
   - Expected: Some retries succeed
   - Expected: Circuit breaker may open if too many failures

3. **Slow network (high latency):**
   - Add latency: ping >1000ms
   - Expected: Operations complete but slowly
   - Expected: Timeout increased for slow connections

4. **DNS failure:**
   - Invalid Bitbucket hostname
   - Expected: DNS resolution error
   - Expected: Clear message to check URL

**Expected Behaviors:**
- ✅ No crashes or hangs
- ✅ Retry up to 3 times with exponential backoff
- ✅ Circuit breaker opens after 5 failures
- ✅ Logs show network errors with context

---

### Invalid Credentials or Expired Tokens

**Test Scenarios:**

1. **OAuth 2.0 access token expired:**
   - Simulate by waiting until expiry
   - Expected: Auto-refresh using refresh_token
   - Expected: Transparent to user
   - Expected: Log entry: "Token refreshed"

2. **OAuth 2.0 refresh token expired:**
   - Simulate by revoking refresh token
   - Expected: Error: "Re-authentication required"
   - Expected: Prompt to run setup again

3. **PAT expired or revoked:**
   - Delete PAT in Bitbucket
   - Expected: 401 error on next request
   - Expected: Clear message: "Token invalid, re-run setup"

4. **Basic Auth password changed:**
   - Change password in Bitbucket
   - Expected: 401 error
   - Expected: Prompt to update credentials

5. **OAuth 1.0a consumer key revoked:**
   - Delete application link in Bitbucket
   - Expected: 401 error
   - Expected: Message: "Application link not found"

**Expected Behaviors:**
- ✅ Auth failures detected immediately (not retried)
- ✅ Clear instructions for resolution
- ✅ No sensitive data logged
- ✅ Setup wizard can be re-run to fix

---

### Malformed Input Parameters

**Test Scenarios:**

1. **Empty search query:**
   ```json
   {"query": ""}
   ```
   Expected: Validation error or return all results (document behavior)

2. **Special characters in query:**
   ```json
   {"query": "!@#$%^&*()"}
   ```
   Expected: Escaped and processed or validation error

3. **Null/undefined operation_id:**
   ```json
   {"operation_id": null}
   ```
   Expected: 400 error: "operation_id required"

4. **Invalid operation_id format:**
   ```json
   {"operation_id": "does-not-exist"}
   ```
   Expected: 404 error: "Operation not found"

5. **Missing required fields:**
   ```json
   createIssue without "project" field
   ```
   Expected: 400 error from Bitbucket with field name

6. **Wrong data type:**
   ```json
   {"maxResults": "not a number"}
   ```
   Expected: Validation error before sending to Bitbucket

**Expected Behaviors:**
- ✅ Input validation before API calls
- ✅ Zod schemas catch type errors
- ✅ Clear error messages with field names
- ✅ No crashes from malformed input

---

### Rate Limiting Triggers

**Test Scenarios:**

1. **Send 100 requests in 1 second:**
   - May trigger Bitbucket rate limiting
   - Expected: 429 status code
   - Expected: Retry-After header respected
   - Expected: Exponential backoff activated

2. **Sustained high traffic:**
   - 200 requests over 10 seconds
   - Expected: Some requests queued/delayed
   - Expected: Circuit breaker may open temporarily

3. **Single slow request:**
   - Request taking >30s (Bitbucket processing time)
   - Expected: Timeout after configured duration
   - Expected: Partial result or error

**Expected Behaviors:**
- ✅ Rate limit errors handled gracefully
- ✅ Retry-After header respected
- ✅ Not treated as application error
- ✅ Logs indicate rate limiting

---

### Circuit Breaker Activation

**Test Scenarios:**

1. **Bitbucket DC instance down:**
   - Stop Bitbucket or block port
   - Expected: Circuit opens after 5 failures
   - Expected: Subsequent requests fail fast (no retries)
   - Expected: Circuit half-opens after 30s to test recovery

2. **Bitbucket responding with 500 errors:**
   - Simulate server errors
   - Expected: Circuit opens after threshold
   - Expected: Error logged with details

3. **Recovery scenario:**
   - Fix Bitbucket issue
   - Expected: Circuit half-opens
   - Expected: Test request succeeds
   - Expected: Circuit closes, normal operation resumes

**Expected Behaviors:**
- ✅ Circuit breaker prevents cascading failures
- ✅ Fail-fast when circuit open
- ✅ Automatic recovery when Bitbucket restored
- ✅ Logs show circuit state changes

---

### Large Response Payloads (>1MB)

**Test Scenarios:**

1. **Search returning 1000+ issues:**
   ```json
   {"jql": "project = TEST", "maxResults": 1000}
   ```
   Expected: Paginated results, not all at once

2. **Issue with large description (100KB+):**
   - Create issue with very long description
   - Expected: Handled without memory issues
   - Expected: Response time increases proportionally

3. **Attachments list (100+ attachments):**
   - Issue with many attachments
   - Expected: Metadata returned efficiently
   - Expected: Actual file content not downloaded unless requested

**Expected Behaviors:**
- ✅ Streaming or chunked responses
- ✅ Memory usage stays <1GB
- ✅ No crashes from large payloads
- ✅ Pagination encouraged for large result sets

---

## Performance Testing Scenarios

### Search Latency Benchmarks

**Objective:** Measure p50, p95, p99 latencies for search operations

**Test Procedure:**

1. **Run 100 search queries:**
   ```javascript
   const queries = [
     "create issue",
     "update issue",
     "delete issue",
     "add comment",
     "get issue",
     // ... 95 more varied queries
   ];
   
   for (const query of queries) {
     const start = Date.now();
     await search_ids({ query });
     const latency = Date.now() - start;
     recordLatency(latency);
   }
   ```

2. **Calculate percentiles:**
   - Sort latencies
   - p50 (median): latencies[50]
   - p95: latencies[95]
   - p99: latencies[99]

3. **Compare against targets:**
   - p50 <300ms ✅
   - p95 <500ms ✅
   - p99 <1000ms ✅

**Variables to Test:**
- Query complexity (single word vs multi-word)
- Query length (short vs long)
- Cold start vs warm cache
- Concurrent searches

**Expected Results:**
- p95 latency <500ms for typical queries
- Cache significantly improves repeat queries
- Cosine similarity calculation <50ms

---

### Call_id Latency Benchmarks

**Objective:** Measure end-to-end latency excluding Bitbucket response time

**Test Procedure:**

1. **Execute 50 operations:**
   ```javascript
   const operations = [
     { op: "getIssue", params: { issueIdOrKey: "TEST-1" } },
     { op: "searchForIssuesUsingJql", params: { jql: "project=TEST" } },
     // ... 48 more operations
   ];
   
   for (const op of operations) {
     const start = Date.now();
     await call_id(op);
     const latency = Date.now() - start;
     recordLatency(latency, excluding Bitbucket response time);
   }
   ```

2. **Measure overhead:**
   - Total time = overhead + Bitbucket response time
   - Overhead = schema lookup + validation + HTTP client setup
   - Target overhead: <500ms

3. **Percentiles:**
   - p50 overhead <200ms
   - p95 overhead <500ms
   - p99 overhead <1000ms

**Expected Results:**
- MCP server overhead minimal (<10% of total)
- Bitbucket response time dominates (external)
- Caching reduces overhead significantly

---

### Concurrent Requests Benchmarking

**Objective:** Measure throughput and success rate under load

**Test Procedure:**

1. **10 concurrent requests:**
   ```javascript
   const promises = Array(10).fill().map(() => 
     search_ids({ query: "create issue" })
   );
   await Promise.all(promises);
   ```
   Expected: All succeed, <1s total time

2. **50 concurrent requests:**
   ```javascript
   const promises = Array(50).fill().map(() => 
     search_ids({ query: randomQuery() })
   );
   const results = await Promise.allSettled(promises);
   const successRate = results.filter(r => r.status === "fulfilled").length / 50;
   ```
   Expected: >95% success rate

3. **100 concurrent requests:**
   - Expected: Circuit breaker may activate
   - Expected: Some requests queued/throttled
   - Expected: >90% eventual success

**Metrics:**
- Requests per second (RPS)
- Success rate (%)
- Average latency under load
- Memory usage under load

**Targets:**
- ≥100 req/s throughput
- >95% success rate at 100 req/s
- Memory <1GB under load

---

### Resource Consumption Tests

**Objective:** Monitor memory and CPU usage during testing

**Test Procedure:**

1. **Idle monitoring:**
   ```bash
   # Start server
   bitbucket-mcp
   
   # Monitor resources
   ps aux | grep bitbucket-mcp
   # Or use Activity Monitor / Task Manager
   ```
   Expected: <512MB memory, <5% CPU

2. **Under load:**
   ```javascript
   // Send 1000 requests over 10 seconds
   for (let i = 0; i < 1000; i++) {
     search_ids({ query: randomQuery() });
     await sleep(10); // 100 req/s
   }
   ```
   Expected: <1GB memory, <50% CPU (sustained)

3. **Memory leak test:**
   - Run 10,000 operations over 10 minutes
   - Monitor memory every minute
   - Expected: Memory stable, no continuous growth

4. **CPU spike test:**
   - 100 concurrent searches
   - Monitor CPU during burst
   - Expected: Spike <80%, returns to baseline after

**Metrics:**
- Memory (RSS) idle: Target <512MB
- Memory under load: Target <1GB
- CPU idle: Target <5%
- CPU under load: Target <50% sustained

---

## Test Data Requirements

### Bitbucket DataCenter Instance

**Minimum Requirements:**

1. **Bitbucket Version:** 8.0+ or 9.0+
2. **Access Level:** Admin or user with permissions:
   - Create/Edit issues
   - Add comments
   - View projects
   - Create application links (for OAuth setup)

3. **Test Project:**
   - Project Key: "TEST" (or any)
   - At least one issue type: Task
   - Default workflow (To Do → In Progress → Done)
   - At least 10 existing issues for search testing

### Test Users

**Multiple Users Recommended:**

1. **Admin User:**
   - Full permissions
   - Can create application links
   - Can manage OAuth applications

2. **Standard User:**
   - Create/edit issues in TEST project
   - Cannot access admin settings
   - Tests permission boundaries

3. **Limited User:**
   - Read-only access
   - Tests 403 errors for restricted operations

### Sample Issues

**Create these issues for testing:**

1. **10 Sample Tasks:**
   - TEST-1 to TEST-10
   - Various statuses (To Do, In Progress, Done)
   - Different assignees
   - Some with comments, some without

2. **Issues with Custom Fields:**
   - TEST-11 with text custom field
   - TEST-12 with select custom field
   - TEST-13 with number custom field
   - TEST-14 with date custom field

3. **Issues for Search Testing:**
   - Variety of summaries containing common keywords
   - Different priorities, statuses
   - Tags/labels for filtering

### Authentication Credentials

**Prepare in Advance:**

1. **OAuth 2.0:**
   - Application configured in Bitbucket
   - Client ID and Secret
   - Callback URL: http://localhost:3000/callback

2. **Personal Access Token:**
   - Generated in Bitbucket user settings
   - Not expired
   - Note token value securely

3. **OAuth 1.0a:**
   - Application link created
   - RSA key pair generated
   - Consumer key configured

4. **Basic Auth:**
   - Username/email
   - Password
   - Account not locked

### Network Environment

**Considerations:**

1. **Firewall Rules:**
   - Allow outbound HTTPS to Bitbucket instance
   - Allow localhost:3000 for OAuth callback

2. **VPN:**
   - Connect if Bitbucket is behind VPN
   - Ensure stable connection

3. **Proxy:**
   - Configure if required
   - Test proxy settings work with curl/browser

4. **DNS:**
   - Bitbucket hostname resolves correctly
   - No DNS caching issues

---

**End of Testing Scenarios Document**

---

*This document should be provided to beta testers along with the main beta testing guide. It serves as a reference for expected behaviors and edge cases to test.*
