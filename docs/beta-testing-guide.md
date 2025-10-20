# Beta Testing Guide

> **📋 Note:** This document serves as a template framework for organizing beta testing programs. It can be activated and customized when a beta testing phase is needed for major releases or new features.

Welcome to the **Bitbucket DataCenter MCP Server** beta testing program! 🎉

Thank you for volunteering to help us test this project before the v1.0 public launch. Your feedback is invaluable and will directly influence the final release.

## Table of Contents

- [Testing Goals & Timeline](#testing-goals--timeline)
- [Setup Instructions](#setup-instructions)
- [Testing Scenarios](#testing-scenarios)
- [How to Provide Feedback](#how-to-provide-feedback)
- [Support & Communication](#support--communication)
- [Checkpoint Schedule](#checkpoint-schedule)
- [FAQ & Troubleshooting](#faq--troubleshooting)

---

## Testing Goals & Timeline

### What We're Testing

This beta program focuses on validating:

1. **Installation & Setup** - Easy zero-config experience
2. **Authentication** - All 4 auth methods work reliably
3. **Core Features** - Semantic search and operation execution
4. **Performance** - Response times meet targets (<500ms search)
5. **Documentation** - Clear, complete, and helpful
6. **Edge Cases** - Error handling, network failures, invalid inputs

### Timeline

- **Duration**: 2 weeks
- **Start Date**: [DATE]
- **End Date**: [DATE]
- **Week 1 Checkpoint**: [DATE/TIME]
- **Week 2 Checkpoint**: [DATE/TIME]
- **Launch Date**: [DATE]

### Expected Time Commitment

- **Setup**: 30-60 minutes
- **Testing Scenarios**: 2-3 hours (can be spread across 2 weeks)
- **Feedback Forms**: 30-60 minutes
- **Checkpoint Meetings**: 2x 15-30 minutes
- **Total**: 3-5 hours over 2 weeks

### What Success Looks Like

- Complete at least 7 out of 10 testing scenarios
- Submit detailed feedback form
- Report any bugs or issues encountered
- Participate in at least one checkpoint meeting

---

## Setup Instructions

### Prerequisites

Before you begin, ensure you have:

1. **Node.js 22+** installed (check with `node --version`)
2. **Access to a Bitbucket DataCenter instance**
   - Can be production or test environment
   - You'll need admin or appropriate permissions for authentication setup
3. **One of these authentication credentials:**
   - OAuth 2.0 credentials (recommended)
   - Personal Access Token (PAT)
   - OAuth 1.0a credentials
   - Basic auth (username/password)

### Installation Method 1: Docker (Recommended)

**Step 1: Pull the Docker image**
```bash
docker pull [DOCKER_ORG]/bitbucket-dc-mcp-server:beta
```

**Step 2: Run the setup wizard**
```bash
docker run --rm -it \
  -v ~/.bitbucket-mcp:/root/.bitbucket-mcp \
  [DOCKER_ORG]/bitbucket-dc-mcp-server:beta setup
```

**Step 3: Follow the interactive prompts**
- Enter your Bitbucket DC base URL
- Select authentication method
- Provide credentials when prompted
- Test the connection

**Step 4: Run the MCP server**
```bash
docker run --rm -i \
  -v ~/.bitbucket-mcp:/root/.bitbucket-mcp \
  [DOCKER_ORG]/bitbucket-dc-mcp-server:beta
```

### Installation Method 2: npm Global Install

**Step 1: Install globally**
```bash
npm install -g bitbucket-dc-mcp@beta
```

**Step 2: Run setup wizard**
```bash
bitbucket-mcp setup
```

**Step 3: Follow interactive prompts** (same as Docker)

**Step 4: Start the MCP server**
```bash
bitbucket-mcp
```

### Verifying Installation

After setup, verify your installation:

1. **Check config file exists:**
   ```bash
   # macOS/Linux
   ls ~/.bitbucket-mcp/config.json
   
   # Windows
   dir %USERPROFILE%\.bitbucket-mcp\config.json
   ```

2. **Test MCP protocol handshake:**
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | bitbucket-mcp
   ```
   
   You should see a JSON response with server capabilities.

3. **Check logs:**
   ```bash
   # macOS/Linux
   tail -f ~/.bitbucket-mcp/logs/app.log
   
   # Windows
   type %USERPROFILE%\.bitbucket-mcp\logs\app.log
   ```

### Troubleshooting Setup Issues

**Issue: Node.js version too old**
- Solution: Install Node.js 22+ from [nodejs.org](https://nodejs.org/)

**Issue: Docker not found**
- Solution: Install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)

**Issue: Setup wizard fails**
- Check: Bitbucket DC URL is correct and accessible
- Check: Firewall/proxy not blocking connection
- Try: Use different authentication method
- Contact: Post in support channel with error message

**Issue: Connection test fails**
- Verify: Credentials are correct
- Verify: User has required permissions in Bitbucket
- Check: Bitbucket DC instance is accessible from your network
- Review: Logs at `~/.bitbucket-mcp/logs/app.log`

---

## Testing Scenarios

Complete as many scenarios as possible. **Aim for at least 7 out of 10**.

For each scenario, note:
- Did it work as expected? (Yes/No)
- How long did it take?
- Any errors or unexpected behavior?
- Suggestions for improvement?

### Scenario 1: OAuth 2.0 Authentication Setup

**Objective**: Configure OAuth 2.0 authentication with PKCE

**Steps:**
1. Run setup wizard: `bitbucket-mcp setup` (or Docker equivalent)
2. Select "OAuth 2.0 (3LO with PKCE)"
3. Enter Bitbucket DC base URL
4. Provide OAuth 2.0 credentials:
   - Client ID
   - Client Secret (optional for PKCE)
5. Complete the OAuth authorization flow in browser
6. Verify connection test succeeds

**Expected Result:**
- Setup completes without errors
- Browser opens for authorization
- Token is securely stored
- Connection test shows "✓ Success"

**Test:**
- ✅ / ❌ Setup completed successfully
- ✅ / ❌ Authorization flow worked smoothly
- ✅ / ❌ Connection test passed

**Notes:**
[Your observations here]

---

### Scenario 2: Personal Access Token (PAT) Setup

**Objective**: Configure PAT authentication

**Steps:**
1. Create a PAT in Bitbucket DC (Settings → Personal Access Tokens)
2. Run setup wizard
3. Select "Personal Access Token (PAT)"
4. Enter Bitbucket DC base URL
5. Paste your PAT when prompted
6. Verify connection test succeeds

**Expected Result:**
- PAT is securely stored in OS keychain
- Connection test succeeds
- No plain-text credentials in config file

**Test:**
- ✅ / ❌ PAT setup completed
- ✅ / ❌ Connection test passed
- ✅ / ❌ Credentials secured properly

**Notes:**
[Your observations here]

---

### Scenario 3: OAuth 1.0a Authentication Setup

**Objective**: Configure legacy OAuth 1.0a authentication

**Steps:**
1. Run setup wizard
2. Select "OAuth 1.0a (Legacy)"
3. Enter Bitbucket DC base URL
4. Provide OAuth 1.0a credentials:
   - Consumer Key
   - Private Key (RSA private key)
5. Complete authorization flow
6. Verify connection test succeeds

**Expected Result:**
- OAuth 1.0a signature validation succeeds
- Request token → access token flow completes
- Connection test passes

**Test:**
- ✅ / ❌ Setup completed
- ✅ / ❌ Authorization flow worked
- ✅ / ❌ Connection test passed

**Notes:**
[Your observations here]

---

### Scenario 4: Basic Authentication Setup

**Objective**: Configure basic username/password authentication

**Steps:**
1. Run setup wizard
2. Select "Basic Auth"
3. Enter Bitbucket DC base URL
4. Enter username
5. Enter password (input is hidden)
6. Verify connection test succeeds

**Expected Result:**
- Credentials stored securely
- Connection test passes
- Warning about Basic Auth security displayed

**Test:**
- ✅ / ❌ Setup completed
- ✅ / ❌ Connection test passed
- ✅ / ❌ Security warning shown

**Notes:**
[Your observations here]

---

### Scenario 5: Semantic Search for Operations

**Objective**: Test natural language search for Bitbucket operations

**Steps:**
1. Start MCP server: `bitbucket-mcp` (or Docker equivalent)
2. Use an MCP client (Claude Desktop or test client) to call `search_ids` tool
3. Test these queries:
   - "create repository"
   - "update issue fields"
   - "add comment"
   - "search issues by JQL"
   - "get repository details"

**Expected Result:**
- Each query returns relevant operation IDs
- Results ranked by relevance (most relevant first)
- Response time <500ms for each query

**Test Queries:**

| Query | Top Result Expected | Actual Result | Response Time | Correct? |
|-------|---------------------|---------------|---------------|----------|
| "create repository" | `createIssue` or similar | | | ✅ / ❌ |
| "update issue fields" | `editIssue` or similar | | | ✅ / ❌ |
| "add comment" | `addComment` or similar | | | ✅ / ❌ |
| "search issues" | `searchForIssuesUsingJql` | | | ✅ / ❌ |
| "get repository details" | `getIssue` or similar | | | ✅ / ❌ |

**Notes:**
[Your observations here]

---

### Scenario 6: Get Operation Schema Details

**Objective**: Retrieve detailed schema for a specific operation

**Steps:**
1. Find an operation ID using search (e.g., "createIssue")
2. Use `get_id` tool to fetch schema:
   ```json
   {
     "operation_id": "createIssue"
   }
   ```
3. Review the returned schema:
   - HTTP method
   - Path template
   - Required parameters
   - Optional parameters
   - Request body schema
   - Response schema

**Expected Result:**
- Complete schema returned
- All parameters documented
- Examples included
- Response time <200ms (cache hit) or <500ms (cache miss)

**Test:**
- ✅ / ❌ Schema retrieved successfully
- ✅ / ❌ All fields present and clear
- ✅ / ❌ Response time acceptable

**Notes:**
[Your observations here]

---

### Scenario 7: Execute Issue Creation Operation

**Objective**: Create a Bitbucket issue using the `call_id` tool

**Steps:**
1. Get schema for `createIssue` operation
2. Prepare request body with required fields:
   ```json
   {
     "fields": {
       "project": {"key": "TEST"},
       "summary": "Beta test issue",
       "description": "Created during beta testing",
       "issuetype": {"name": "Task"}
     }
   }
   ```
3. Execute using `call_id` tool
4. Verify issue created in Bitbucket UI

**Expected Result:**
- Issue created successfully
- Issue key returned (e.g., TEST-123)
- Issue visible in Bitbucket
- Response time <2s

**Test:**
- ✅ / ❌ Issue created successfully
- ✅ / ❌ Response contained issue key
- ✅ / ❌ Visible in Bitbucket UI
- ✅ / ❌ Response time acceptable

**Notes:**
[Your observations here]

---

### Scenario 8: Execute Bulk Operations

**Objective**: Test performance with multiple sequential operations

**Steps:**
1. Create 5 issues using `call_id` in sequence
2. Update each issue's summary
3. Add a comment to each issue
4. Measure total time and individual operation times

**Expected Result:**
- All operations succeed
- No rate limiting errors
- Total time reasonable (<20s for 15 operations)
- Logs show correlation IDs for tracking

**Test:**
- ✅ / ❌ All operations completed
- ✅ / ❌ No errors or timeouts
- ✅ / ❌ Performance acceptable

**Notes:**
[Your observations here]

---

### Scenario 9: Error Handling - Invalid Inputs

**Objective**: Test error handling with invalid inputs

**Steps:**
1. **Invalid authentication**: Provide wrong credentials in setup
   - Expected: Clear error message, not crash
2. **Malformed search query**: Use empty string or special characters
   - Expected: Graceful handling, helpful message
3. **Invalid operation ID**: Request schema for non-existent operation
   - Expected: "Operation not found" error
4. **Missing required fields**: Try creating issue without required fields
   - Expected: Validation error from Bitbucket with details
5. **Network timeout**: Disconnect network briefly during operation
   - Expected: Timeout error, retry mechanism kicks in

**Expected Result:**
- No crashes or hangs
- Clear error messages
- Logs contain debugging information
- Retry logic works for transient failures

**Test:**

| Error Condition | Expected Behavior | Actual Behavior | Pass? |
|----------------|-------------------|-----------------|-------|
| Invalid credentials | Clear error message | | ✅ / ❌ |
| Empty search query | Graceful handling | | ✅ / ❌ |
| Invalid operation ID | "Not found" error | | ✅ / ❌ |
| Missing required fields | Validation error | | ✅ / ❌ |
| Network timeout | Retry + error | | ✅ / ❌ |

**Notes:**
[Your observations here]

---

### Scenario 10: Performance Testing

**Objective**: Validate performance under normal and heavy load

**Steps:**
1. **Search latency**: Perform 20 searches and measure response times
2. **Cache effectiveness**: Request same operation schema 5 times
   - First request: Should be slower (cache miss)
   - Subsequent requests: Should be fast (cache hit)
3. **Concurrent requests**: If possible, simulate 10 concurrent searches
4. **Memory usage**: Monitor memory during testing
   - Check: `ps aux | grep bitbucket-mcp` (Linux/Mac)
   - Check: Task Manager (Windows)

**Expected Result:**
- Search p95 latency <500ms
- Cache hits <100ms
- Memory usage <512MB idle, <1GB under load
- No memory leaks over time

**Test:**
- ✅ / ❌ Search latency meets target
- ✅ / ❌ Cache improves performance
- ✅ / ❌ Memory usage acceptable
- ✅ / ❌ No obvious leaks or slowdowns

**Notes:**
[Your observations here]

---

## How to Provide Feedback

### Feedback Form (Primary Method)

Please complete the structured feedback form: **[FORM LINK]**

The form covers:
- Setup experience
- Feature usability
- Bug reports
- Performance observations
- Documentation clarity
- Feature requests
- Overall satisfaction

**Please submit the form by [DATE]**

### Bug Reports (Critical Issues)

For critical bugs (crashes, data loss, security issues):

1. **Report immediately** in the support channel
2. **Include:**
   - What you were doing
   - What happened (actual behavior)
   - What you expected to happen
   - Error messages or logs
   - Steps to reproduce
   - Your environment (OS, Node version, installation method)

### Feedback Categories

When providing feedback, categorize your input:

**🐛 Bugs**
- Application crashes or hangs
- Features not working as documented
- Error messages unclear or incorrect
- Data loss or corruption

**💡 Feature Requests**
- Missing functionality
- Nice-to-have improvements
- Integration ideas

**📚 Documentation Issues**
- Unclear instructions
- Missing information
- Outdated content
- Typos or errors

**⚡ Performance Issues**
- Slow response times
- High memory usage
- Excessive CPU usage
- Startup delays

**🎨 UX/UI Feedback**
- Confusing workflows
- Poor error messages
- Setup wizard improvements
- CLI output formatting

---

## Support & Communication

### Support Channel

Join our dedicated support channel: **[DISCORD/SLACK LINK]**

**Response Times:**
- **Critical issues**: Within 2-4 hours (business hours)
- **General questions**: Within 24 hours
- **Feature discussions**: Ongoing conversations

**Channel Guidelines:**
- Be respectful and constructive
- Search for existing questions before asking
- Provide context and details
- Share solutions you discover

### Office Hours (Optional)

If needed, we can schedule 1-on-1 debugging sessions:
- **Contact**: [EMAIL]
- **Booking link**: [CALENDLY_LINK]

### Documentation

- **README**: [Link]
- **API Reference**: [Link]
- **Troubleshooting Guide**: [Link]
- **Architecture Docs**: [Link]

---

## Checkpoint Schedule

### Week 1 Checkpoint

**Date/Time**: [DATE/TIME]
**Format**: Group video call or async survey
**Duration**: 15-30 minutes

**Agenda:**
- Progress updates: How many scenarios completed?
- Blocking issues or challenges
- Preliminary feedback themes
- Adjust testing focus if needed

**Preparation:**
- Complete at least 3-5 scenarios
- Note any blocking issues
- Bring questions

### Week 2 Checkpoint

**Date/Time**: [DATE/TIME]
**Format**: Group video call or async survey
**Duration**: 15-30 minutes

**Agenda:**
- Final scenario completion status
- Critical bugs summary
- Overall satisfaction discussion
- Feature priority for v1.1
- Next steps and launch timeline

**Preparation:**
- Complete all scenarios (or note incomplete ones)
- Submit feedback form
- Prepare final thoughts

---

## FAQ & Troubleshooting

### General Questions

**Q: Can I test on multiple operating systems?**
A: Yes! We'd love to see testing across Linux, macOS, and Windows.

**Q: Do I need a production Bitbucket instance?**
A: No, a test/sandbox Bitbucket DC instance is fine.

**Q: What if I can't complete all scenarios?**
A: Aim for at least 7 out of 10. Let us know which ones you skip and why.

**Q: Can I test with multiple authentication methods?**
A: Yes, please do! Testing multiple auth methods is valuable.

**Q: Will my test data be kept private?**
A: Yes, all testing is done on your local machine. No data is sent to us.

### Common Issues

**Issue: "Module not found" error**
```bash
# Solution: Rebuild or reinstall
npm install -g bitbucket-dc-mcp@beta --force
```

**Issue: "Connection refused" error**
```bash
# Check: Bitbucket URL is correct and accessible
curl https://your-bitbucket-instance.com

# Check: No proxy/firewall blocking
# Check: VPN connected (if required)
```

**Issue: "Authentication failed" error**
```bash
# Verify: Credentials are correct
# Try: Different authentication method
# Check: User has required Bitbucket permissions
```

**Issue: "Search returns no results"**
```bash
# Check: Embeddings database exists
ls ~/.bitbucket-mcp/embeddings.db

# Try: Re-run setup wizard
bitbucket-mcp setup

# Check: Logs for errors
tail -f ~/.bitbucket-mcp/logs/app.log
```

**Issue: Slow performance**
```bash
# Check: Node.js version (should be 20+)
node --version

# Check: Bitbucket DC response times
# Check: System resources (CPU, memory)
# Check: Network latency to Bitbucket instance
```

### Getting Unstuck

If you're stuck:

1. **Check logs**: `~/.bitbucket-mcp/logs/app.log`
2. **Review troubleshooting guide**: [Link]
3. **Search support channel**: Someone may have faced the same issue
4. **Ask for help**: Post in support channel with details
5. **Schedule office hours**: For complex issues

---

## Thank You!

We truly appreciate your time and expertise in helping make this project better.

Your feedback will directly impact:
- Bug fixes and stability
- Feature priorities
- Documentation quality
- Overall user experience

**Questions?** Reach out in the support channel or email [EMAIL].

**Ready to start?** Head to [Setup Instructions](#setup-instructions)!

---

*Last updated: [DATE]*
*Beta version: [VERSION]*
