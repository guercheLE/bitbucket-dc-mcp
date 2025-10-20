# OAuth 2.0 Setup Manual Test Guide

This guide provides step-by-step instructions for manually testing OAuth 2.0 authentication with Bitbucket Data Center.

## Prerequisites

Before starting, ensure you have:

- [ ] Bitbucket Data Center instance (v8.0+ recommended)
- [ ] Administrator access to Bitbucket
- [ ] Node.js 22+ installed
- [ ] MCP server built and ready (`npm run build`)
- [ ] Port 8080 available on localhost (or configure alternative port)

## Test Environment

- **Bitbucket DC Version**: _______________
- **Node.js Version**: _______________
- **MCP Server Version**: _______________
- **Test Date**: _______________
- **Tester**: _______________

---

## Step 1: Create OAuth 2.0 Application in Bitbucket

### 1.1 Access Application Links

1. Log in to Bitbucket as administrator
2. Navigate to: **⚙️ Settings → Applications → Application Links**
3. URL path: `https://your-bitbucket.com/plugins/servlet/applinks/listApplicationLinks`

### 1.2 Create New Application Link

1. Click **"Create link"** button
2. Enter application URL: `http://localhost:8080` (or your callback URL)
3. Click **"Continue"**
4. If warning appears about "No response received", click **"Continue"** anyway

### 1.3 Configure Application Details

Fill in the application form:

| Field | Value |
|-------|-------|
| **Application Name** | `Bitbucket MCP Server` |
| **Application Type** | Generic Application |
| **Service Provider Name** | `bitbucket-mcp-server` |
| **Consumer Key** | `bitbucket-mcp-client` (note: this will be your `client_id`) |
| **Shared Secret** | (auto-generated or create secure secret) |
| **Request Token URL** | Leave blank (OAuth 2.0 doesn't use this) |
| **Access Token URL** | `https://your-bitbucket.com/plugins/servlet/oauth/token` |
| **Authorize URL** | `https://your-bitbucket.com/plugins/servlet/oauth/authorize` |

5. Click **"Continue"**

### 1.4 Configure OAuth 2.0 Settings

After creating the application link:

1. Click on the application name in the list
2. Navigate to **"Incoming Authentication"** tab
3. Configure OAuth 2.0 settings:

| Setting | Value |
|---------|-------|
| **Consumer Key** | `bitbucket-mcp-client` (your `client_id`) |
| **Consumer Name** | `Bitbucket MCP Server` |
| **Public Key** | Leave blank (OAuth 2.0 with PKCE doesn't require this) |
| **Callback URL** | `http://localhost:8080/callback` |
| **Allow OAuth 2.0** | ✅ Enabled |
| **Allow PKCE** | ✅ Enabled (important!) |

4. Save the configuration
5. **IMPORTANT**: Copy the **Consumer Key** (client_id) and **Shared Secret** (client_secret) - you'll need these!

### ✅ Verification

- [ ] Application link created successfully
- [ ] OAuth 2.0 enabled
- [ ] PKCE enabled
- [ ] Callback URL configured: `http://localhost:8080/callback`
- [ ] Client ID and client secret saved securely

---

## Step 2: Configure MCP Server

### 2.1 Create Configuration File

Create or update your MCP server configuration file:

**File location**: `config.json` (or as specified in your setup)

```json
{
  "bitbucket_url": "https://your-bitbucket.com",
  "auth_method": "oauth2",
  "oauth2": {
    "client_id": "bitbucket-mcp-client",
    "client_secret": "your-shared-secret-here",
    "redirect_uri": "http://localhost:8080/callback",
    "callback_port": 8080,
    "scope": "read:bitbucket-user read:bitbucket-work write:bitbucket-work",
    "timeout_minutes": 5
  }
}
```

### 2.2 Environment Variables (Alternative)

Alternatively, you can use environment variables:

```bash
export BITBUCKET_URL="https://your-bitbucket.com"
export BITBUCKET_AUTH_METHOD="oauth2"
export BITBUCKET_OAUTH2_CLIENT_ID="bitbucket-mcp-client"
export BITBUCKET_OAUTH2_CLIENT_SECRET="your-shared-secret-here"
export BITBUCKET_OAUTH2_REDIRECT_URI="http://localhost:8080/callback"
export BITBUCKET_OAUTH2_CALLBACK_PORT="8080"
```

### ✅ Verification

- [ ] Configuration file created with correct values
- [ ] `client_id` matches Consumer Key from Bitbucket
- [ ] `client_secret` matches Shared Secret from Bitbucket
- [ ] `bitbucket_url` points to your Bitbucket instance
- [ ] `redirect_uri` matches callback URL in Bitbucket config

---

## Step 3: Run OAuth Authentication Flow

### 3.1 Start MCP Server Setup

Run the setup command to initiate OAuth flow:

```bash
npm run start -- setup
# or
node dist/index.js setup
```

Expected console output:

```
[INFO] OAuth2 authentication initiated
[INFO] Generated OAuth2 authorization URL
[INFO] Opening browser for authentication...
[INFO] Callback server started on port 8080
```

### 3.2 Browser Opens Automatically

The MCP server will automatically open your default browser with the Bitbucket authorization URL.

**URL format**:
```
https://your-bitbucket.com/plugins/servlet/oauth/authorize?
  response_type=code&
  client_id=bitbucket-mcp-client&
  redirect_uri=http://localhost:8080/callback&
  scope=read:bitbucket-user%20read:bitbucket-work%20write:bitbucket-work&
  state=<random-state>&
  code_challenge=<pkce-challenge>&
  code_challenge_method=S256
```

### 3.3 Manual Browser Opening (if needed)

If the browser doesn't open automatically, copy the URL from the console and paste it into your browser.

### ✅ Verification

- [ ] Browser opens automatically
- [ ] Bitbucket login page appears (if not already logged in)
- [ ] Authorization URL contains all required parameters
- [ ] Callback server is running (check console)

---

## Step 4: Authorize Application in Bitbucket

### 4.1 Bitbucket Authorization Page

You should see Bitbucket's OAuth authorization page:

**Expected content**:
- Application name: "Bitbucket MCP Server"
- Requested permissions:
  - Read your user information
  - Read Bitbucket work data
  - Write Bitbucket work data
- **Allow** and **Deny** buttons

### 4.2 Grant Authorization

1. Review the requested permissions
2. Click **"Allow"** button
3. Bitbucket will redirect to the callback URL

### 4.3 Callback Page

After clicking "Allow", you'll be redirected to:

```
http://localhost:8080/callback?code=<auth-code>&state=<state>
```

**Expected browser display**:
```
✓ Authentication Successful!

You can close this window and return to the application.
```

### ✅ Verification

- [ ] Bitbucket authorization page displayed correctly
- [ ] Application name and permissions shown
- [ ] "Allow" button clicked
- [ ] Redirected to callback URL
- [ ] Success message displayed in browser
- [ ] No error messages

---

## Step 5: Verify Token Exchange

### 5.1 Check Console Output

Back in your terminal, you should see:

```
[INFO] Callback received with valid state
[INFO] Access token obtained successfully
[INFO] Token validated successfully with Bitbucket
[INFO] Callback server stopped
[INFO] OAuth2 authentication completed successfully
```

### 5.2 Verify Token Storage

**Current Implementation** (Story 3.2 - No persistent storage yet):

The credentials are stored in memory and logged (without sensitive data).

Check console for output like:

```json
{
  "bitbucket_url": "https://your-bitbucket.com",
  "auth_method": "oauth2",
  "expires_at": "2024-10-18T21:00:00.000Z"
}
```

**Future Implementation** (Story 3.5 - OS Keychain):

Credentials will be stored securely in the operating system keychain:
- **macOS**: Keychain Access
- **Windows**: Credential Manager
- **Linux**: Secret Service API

### ✅ Verification

- [ ] Console shows successful token exchange
- [ ] Token validation succeeded
- [ ] Callback server stopped gracefully
- [ ] No error messages in console
- [ ] Credentials structure looks correct (in logs)

---

## Step 6: Test MCP Tool with OAuth Token

### 6.1 Test Search Tool

Test the semantic search functionality:

```bash
npm run start -- search "create issue"
```

**Expected output**:
```
[INFO] Searching for operations matching: "create issue"
[INFO] Found 5 matching operations

Results:
1. createIssue - Create a new issue in Bitbucket
2. updateIssue - Update an existing issue
...
```

### 6.2 Test Call Tool

Test calling a Bitbucket API operation:

```bash
npm run start -- call get-current-user
```

**Expected output**:
```
[INFO] Executing operation: get-current-user
[INFO] Using OAuth2 authentication
[INFO] Request successful

Response:
{
  "name": "your-username",
  "emailAddress": "your@email.com",
  "displayName": "Your Name",
  ...
}
```

### ✅ Verification

- [ ] Search tool returns results
- [ ] Call tool executes successfully
- [ ] Authorization headers sent correctly
- [ ] API responses are valid
- [ ] No 401 Unauthorized errors

---

## Step 7: Test Token Refresh (Optional)

To test token refresh functionality, you can manually expire the token or wait for it to expire naturally.

### 7.1 Manual Token Expiration

**Note**: This requires modifying the code temporarily for testing.

In `src/auth/strategies/oauth2-strategy.ts`, change the expiration:

```typescript
// Temporarily change expires_in for testing
const expiresAt = new Date(Date.now() + 10 * 1000); // 10 seconds
```

### 7.2 Wait for Expiration

If using the modified code:

1. Wait 10+ seconds
2. Run another MCP command
3. Observe automatic token refresh

**Expected console output**:
```
[INFO] Token expired, refreshing...
[INFO] OAuth2 token refresh initiated
[INFO] Access token refreshed successfully
```

### ✅ Verification

- [ ] Expired token detected
- [ ] Refresh token used automatically
- [ ] New access token obtained
- [ ] API call succeeded after refresh
- [ ] No re-authentication required

---

## Troubleshooting

### Issue: Browser Doesn't Open

**Symptoms**: Console shows auth URL but browser doesn't open.

**Solutions**:
1. Manually copy the URL from console and open in browser
2. Check if another application is blocking browser automation
3. Try different browser as default

### Issue: Port 8080 Already in Use

**Symptoms**: Error "Port 8080 is already in use"

**Solutions**:
1. Stop any applications using port 8080
2. Configure alternative port in `config.json`:
   ```json
   {
     "oauth2": {
       "callback_port": 8081,
       "redirect_uri": "http://localhost:8081/callback"
     }
   }
   ```
3. Update callback URL in Bitbucket application link settings

### Issue: Invalid State Parameter

**Symptoms**: "Invalid state parameter (possible CSRF attack)"

**Solutions**:
1. Clear browser cookies for Bitbucket domain
2. Restart MCP server to generate new state
3. Ensure system clock is synchronized

### Issue: Token Exchange Failed

**Symptoms**: "Token exchange failed: 400 Bad Request"

**Solutions**:
1. Verify `client_id` matches Consumer Key in Bitbucket
2. Verify `client_secret` matches Shared Secret in Bitbucket
3. Check Bitbucket logs for detailed error messages
4. Ensure PKCE is enabled in Bitbucket application link

### Issue: 401 Unauthorized

**Symptoms**: API calls fail with 401 after successful authentication

**Solutions**:
1. Verify OAuth2 scope includes required permissions
2. Check if user account has necessary Bitbucket permissions
3. Ensure token hasn't expired (check `expires_at`)
4. Try re-authenticating

### Issue: Callback Timeout

**Symptoms**: "OAuth2 authentication timed out after 5 minutes"

**Solutions**:
1. Complete authorization faster
2. Increase timeout in config:
   ```json
   {
     "oauth2": {
       "timeout_minutes": 10
     }
   }
   ```
3. Check network connectivity to Bitbucket

---

## Security Considerations

### ✅ Security Checklist

- [ ] Client secret stored securely (not in version control)
- [ ] Callback URL uses localhost (not exposed to internet)
- [ ] HTTPS used for Bitbucket instance (production)
- [ ] Tokens never logged in production
- [ ] Refresh tokens handled securely
- [ ] State parameter validates CSRF protection

### Best Practices

1. **Never commit secrets**: Add `config.json` to `.gitignore`
2. **Use environment variables**: Especially in CI/CD pipelines
3. **Rotate secrets regularly**: Update client_secret periodically
4. **Monitor token usage**: Check Bitbucket audit logs for OAuth activity
5. **Limit scope**: Only request necessary permissions

---

## Test Results

### Test Summary

| Step | Status | Notes |
|------|--------|-------|
| 1. Create OAuth App | ☐ Pass ☐ Fail | |
| 2. Configure MCP Server | ☐ Pass ☐ Fail | |
| 3. Run OAuth Flow | ☐ Pass ☐ Fail | |
| 4. Authorize in Bitbucket | ☐ Pass ☐ Fail | |
| 5. Verify Token Exchange | ☐ Pass ☐ Fail | |
| 6. Test MCP Tools | ☐ Pass ☐ Fail | |
| 7. Test Token Refresh | ☐ Pass ☐ Fail | |

### Overall Result

- [ ] ✅ All tests passed
- [ ] ⚠️ Some tests failed (see notes above)
- [ ] ❌ Critical failures (authentication doesn't work)

### Additional Notes

```
[Space for tester notes, observations, and recommendations]







```

---

## Appendix A: Common OAuth 2.0 Terminology

| Term | Description |
|------|-------------|
| **Authorization Code** | Temporary code exchanged for access token |
| **Access Token** | Token used to authenticate API requests |
| **Refresh Token** | Long-lived token used to obtain new access tokens |
| **PKCE** | Proof Key for Code Exchange - security extension |
| **Client ID** | Public identifier for the OAuth application |
| **Client Secret** | Secret key for OAuth application |
| **Redirect URI** | URL where user is sent after authorization |
| **Scope** | Permissions requested by the application |
| **State** | Random value for CSRF protection |

## Appendix B: Useful Commands

```bash
# Build MCP server
npm run build

# Run setup (OAuth flow)
npm run start -- setup

# Test search
npm run start -- search "query"

# Test API call
npm run start -- call operation-id

# View logs
tail -f logs/mcp-server.log

# Check OAuth config
cat config.json

# Test token validation
npm run start -- validate-token
```

## Appendix C: Support Resources

- **Bitbucket OAuth 2.0 Docs**: https://developer.atlassian.com/server/bitbucket/how-tos/example-basic-authentication/
- **MCP Server Repo**: https://github.com/your-org/bitbucket-datacenter-mcp-server
- **Issue Tracker**: https://github.com/your-org/bitbucket-dc-mcp/issues
- **Community Forum**: https://community.atlassian.com/

---

**Document Version**: 1.0  
**Last Updated**: October 18, 2025  
**Story Reference**: 3.2 - OAuth 2.0 Authentication Strategy
