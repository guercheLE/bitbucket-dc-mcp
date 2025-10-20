# Authentication Setup Guide

> **Version:** 1.0  
> **Last Updated:** October 18, 2025  
> **Estimated Read Time:** 10-15 minutes

## Table of Contents

- [Overview](#overview)
- [Quick Decision Guide](#quick-decision-guide)
- [Authentication Methods](#authentication-methods)
  - [1. OAuth 2.0 with PKCE (Recommended for Production)](#1-oauth-20-with-pkce-recommended-for-production)
  - [2. Personal Access Token (PAT) (Recommended for Development)](#2-personal-access-token-pat-recommended-for-development)
  - [3. OAuth 1.0a (Legacy Bitbucket Support)](#3-oauth-10a-legacy-bitbucket-support)
  - [4. Basic HTTP Authentication (Development Only)](#4-basic-http-authentication-development-only)
- [Comparison Table](#comparison-table)
- [Secure Credential Storage](#secure-credential-storage)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)
- [Additional Resources](#additional-resources)

## Overview

Authentication is critical for securely connecting the Bitbucket Data Center MCP Server to your Bitbucket instance. This guide provides comprehensive, step-by-step instructions for configuring each supported authentication method.

**Why Authentication Matters:**
- **Security:** Protects your Bitbucket data from unauthorized access
- **Auditability:** Tracks who performs operations via the MCP server
- **Compliance:** Meets enterprise security and regulatory requirements
- **Access Control:** Enforces user permissions and role-based access

This MCP server supports multiple authentication methods for Bitbucket Data Center, each with different security profiles and use cases:

| Method | Security | Ease of Use | Bitbucket DC Version | Recommended For |
|--------|----------|-------------|-----------------|-----------------|
| **OAuth 2.0 (PKCE)** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Moderate | 8.0+ | **Production (Recommended)** |
| **Personal Access Token (PAT)** | ⭐⭐⭐⭐ Very Good | ⭐⭐⭐⭐⭐ Very Easy | 8.14+ | **Production & Development** |
| **OAuth 1.0a** | ⭐⭐⭐ Good | ⭐⭐ Complex | All versions | **Legacy Bitbucket < 8.0** |
| **Basic Auth** | ⭐ Poor | ⭐⭐⭐⭐⭐ Very Easy | All versions | **Local Dev/Testing Only** |

## Quick Decision Guide

**Choose your authentication method based on your use case:**

```
┌─────────────────────────────────────────────────────────────┐
│ What is your Bitbucket Data Center version?                     │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
           Bitbucket 8.14+              Bitbucket 8.0-8.13         Bitbucket < 8.0
                │                       │                      │
                ▼                       ▼                      ▼
       ┌────────────────┐      ┌────────────────┐    ┌────────────────┐
       │ Production or  │      │ Production     │    │ OAuth 1.0a     │
       │ Development?   │      │ Environment?   │    │ (Legacy)       │
       └────────────────┘      └────────────────┘    └────────────────┘
          │         │                  │
     Production  Development        Yes/No
          │         │                  │
          ▼         ▼                  ▼
    ┌─────────┐ ┌─────────┐      ┌─────────┐
    │ OAuth   │ │   PAT   │      │ OAuth   │
    │  2.0    │ │ (Easy!) │      │  2.0    │
    └─────────┘ └─────────┘      └─────────┘

Local Development/Testing ONLY:
  └─> Basic Auth (with HTTPS MANDATORY)
```

**Quick Recommendations:**

| Scenario | Recommended Method | Reason |
|----------|-------------------|--------|
| **Production deployment** | OAuth 2.0 | Best security, token refresh, PKCE protection |
| **CI/CD pipelines** | PAT | No browser interaction, easy automation |
| **Local development** | PAT | Simplest setup, no OAuth callback server |
| **Legacy Bitbucket < 8.0** | OAuth 1.0a | Only modern option for old versions |
| **Quick testing (HTTPS only)** | Basic Auth | Fastest setup (⚠️ dev/test only) |
| **Multiple environments** | PAT | Easy to manage multiple tokens |
| **Shared/team server** | OAuth 2.0 | User-specific authorization |

---

## Authentication Methods

### 1. OAuth 2.0 with PKCE (Recommended for Production)

> **⏱️ Estimated Setup Time:** 10-15 minutes  
> **🎯 Difficulty Level:** Medium  
> **✅ Best for:** Production environments with Bitbucket DC 8.0+

**Security Features:**
- PKCE (Proof Key for Code Exchange) prevents authorization code interception
- Token refresh extends session without re-authentication
- State parameter provides CSRF protection
- No credentials stored - only tokens
- User-specific authorization (not shared credentials)

#### Prerequisites

Before starting OAuth 2.0 setup, ensure you have:

- ✅ **Bitbucket Administrator Access** - Required to create OAuth 2.0 applications
- ✅ **Bitbucket Data Center 8.0+** - OAuth 2.0 is not available in older versions
- ✅ **HTTPS Enabled** - Strongly recommended for production (HTTP works for localhost only)
- ✅ **Network Access** - Bitbucket server must be accessible from MCP server
- ✅ **Port Availability** - Default callback port 8080 (or custom port) must be available

**Version Check:**
```bash
# Verify your Bitbucket version supports OAuth 2.0
curl -s https://bitbucket.example.com/rest/api/2/serverInfo | jq '.version'
# Should return 8.0.0 or higher
```

#### Step-by-Step Setup Guide

##### Step 1: Create OAuth 2.0 Application in Bitbucket

1. **Access Bitbucket Administration Console:**
   - Log in to Bitbucket as an administrator
   - Click the **gear icon** (⚙️) in the top right
   - Select **"Manage apps"** from the dropdown menu

   <!-- Screenshot: Bitbucket admin menu navigation -->
   ![Bitbucket Admin Menu](./images/auth/oauth2-01-admin-menu.png)

2. **Navigate to Application Links:**
   - In the left sidebar, scroll to **"Integrations"** section
   - Click **"Application Links"**
   - You'll see a list of existing application links (may be empty)

   <!-- Screenshot: Application Links page -->
   ![Application Links Page](./images/auth/oauth2-02-application-links.png)

3. **Create New Application Link:**
   - Click **"Create link"** button (top right)
   - Select **"External application"** from the dropdown
   - Choose **"Incoming"** direction (Bitbucket receives requests from MCP server)
   - Click **"Continue"**

   <!-- Screenshot: Create application link dialog -->
   ![Create Application Link](./images/auth/oauth2-03-create-link.png)

4. **Configure OAuth 2.0 Application:**
   - **Application Name:** `Bitbucket MCP Server` (or your preferred name)
   - **Redirect URL:** `http://localhost:8080/callback` (for local development)
     - **Production:** Use your server's callback URL (e.g., `https://mcp-server.example.com/oauth/callback`)
   - **Permissions/Scopes:** Select the following:
     - ✅ `read:bitbucket-user` - Read user information
     - ✅ `read:bitbucket-work` - Read Bitbucket issues, projects, etc.
     - ✅ `write:bitbucket-work` - Create/update issues, comments, etc.
     - ✅ `offline_access` - Enable refresh token (recommended)
   - Click **"Save"**

   <!-- Screenshot: OAuth 2.0 application configuration -->
   ![OAuth 2.0 Configuration](./images/auth/oauth2-04-app-config.png)

5. **Obtain Client ID and Client Secret:**
   - After saving, you'll see the newly created application in the list
   - Click on the application name to view details
   - **Client ID:** Copy this value (e.g., `abc123xyz789`)
   - **Client Secret:** Click **"Show secret"** and copy the value
     - ⚠️ **IMPORTANT:** Client secret is shown only once! Save it securely.
     - If you lose it, you'll need to regenerate a new secret

   <!-- Screenshot: Client credentials display -->
   ![Client Credentials](./images/auth/oauth2-05-credentials.png)

##### Step 2: Configure MCP Server

**Option A: Using Environment Variables** (Recommended for development)

```bash
# Required configuration
export BITBUCKET_URL="https://bitbucket.example.com"
export BITBUCKET_AUTH_METHOD="oauth2"
export OAUTH2_CLIENT_ID="your-client-id-from-step-1"
export OAUTH2_CLIENT_SECRET="your-client-secret-from-step-1"

# Optional configuration (with defaults)
export OAUTH2_REDIRECT_URI="http://localhost:8080/callback"  # Default
export OAUTH2_CALLBACK_PORT="8080"                           # Default
export OAUTH2_TIMEOUT_MINUTES="5"                           # Default
```

**Option B: Using Configuration File** (Recommended for production)

Create or edit `~/.bitbucket-mcp/config.yml`:

```yaml
bitbucket_url: https://bitbucket.example.com
auth_method: oauth2

oauth2:
  client_id: "your-client-id-from-step-1"
  client_secret: "your-client-secret-from-step-1"
  redirect_uri: "http://localhost:8080/callback"
  callback_port: 8080
  scope: "read:bitbucket-user read:bitbucket-work write:bitbucket-work offline_access"
  timeout_minutes: 5
```

**Option C: Using Interactive Setup Wizard** (Easiest)

```bash
# Run the setup wizard
npx bitbucket-mcp-server setup

# Follow the prompts:
# 1. Select "OAuth 2.0 (PKCE)"
# 2. Enter Bitbucket URL
# 3. Enter client_id
# 4. Enter client_secret
# 5. Confirm callback URL
# 6. Wizard will open browser for authorization
```

##### Step 3: Authenticate and Authorize

1. **Start the MCP Server:**
   ```bash
   npx bitbucket-mcp-server start
   ```

2. **Automatic Browser Authorization:**
   - Server will automatically open your default browser
   - You'll be redirected to Bitbucket's authorization page
   - URL format: `https://bitbucket.example.com/oauth/authorize?client_id=...&response_type=code&...`

   <!-- Screenshot: Bitbucket authorization page -->
   ![Bitbucket Authorization Page](./images/auth/oauth2-06-authorize-page.png)

3. **Grant Access:**
   - Review the requested permissions
   - Click **"Authorize"** or **"Allow"** button
   - Bitbucket will redirect back to the callback URL

   <!-- Screenshot: Authorization success -->
   ![Authorization Success](./images/auth/oauth2-07-auth-success.png)

4. **Automatic Token Exchange:**
   - MCP server automatically exchanges authorization code for access token
   - You'll see a success message in the terminal:
     ```
     ✅ OAuth 2.0 authentication successful!
     ✅ Access token obtained and stored securely
     ✅ Refresh token saved for automatic renewal
     🔒 Credentials stored in OS keychain
     ```

5. **Verify Connection:**
   ```bash
   # Test the connection
   npx bitbucket-mcp-server test-connection
   
   # Expected output:
   # ✅ Connected to Bitbucket: https://bitbucket.example.com
   # ✅ Authenticated as: john.doe@example.com
   # ✅ Token expires: 2025-10-19 14:30:00 UTC
   ```

#### Common OAuth 2.0 Errors

##### Error: `invalid_client`

**Symptom:**
```json
{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}
```

**Causes:**
- Incorrect `client_id` or `client_secret`
- Client secret was regenerated in Bitbucket (old secret no longer valid)
- Application link was deleted in Bitbucket

**Solutions:**
1. Verify `client_id` and `client_secret` match values in Bitbucket admin console
2. Check for typos or extra whitespace in credentials
3. Regenerate client secret in Bitbucket and update configuration
4. Ensure application link exists and is enabled in Bitbucket

##### Error: `invalid_redirect_uri`

**Symptom:**
```json
{
  "error": "invalid_request",
  "error_description": "redirect_uri does not match configured value"
}
```

**Causes:**
- Redirect URI in configuration doesn't match Bitbucket application link setting
- Protocol mismatch (http vs https)
- Port mismatch (e.g., :8080 vs :3000)
- Trailing slash mismatch (`/callback` vs `/callback/`)

**Solutions:**
1. Check exact redirect URI in Bitbucket application link configuration
2. Ensure protocol matches (http:// vs https://)
3. Verify port matches (default: 8080)
4. Match trailing slashes exactly
5. Update configuration or Bitbucket application link to match

**Example Fix:**
```yaml
# Bitbucket application link has: http://localhost:8080/callback
# Configuration must match EXACTLY:
oauth2:
  redirect_uri: "http://localhost:8080/callback"  # No trailing slash
```

##### Error: `invalid_grant`

**Symptom:**
```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code expired or invalid"
}
```

**Causes:**
- Authorization code expired (default: 10 minutes after user authorization)
- Authorization code already used (OAuth 2.0 codes are single-use)
- User cancelled authorization
- Clock skew between MCP server and Bitbucket server

**Solutions:**
1. Complete authorization flow faster (don't wait too long after clicking "Authorize")
2. Don't refresh the callback page (codes are single-use)
3. Try authorization flow again from the beginning
4. Check system clock is synchronized (use NTP):
   ```bash
   # Check system time
   date
   
   # Synchronize clock (Linux)
   sudo ntpdate time.nist.gov
   ```

##### Error: `access_denied`

**Symptom:**
```json
{
  "error": "access_denied",
  "error_description": "User denied authorization"
}
```

**Causes:**
- User clicked "Deny" or "Cancel" on Bitbucket authorization page
- User lacks required Bitbucket permissions
- Application link disabled by administrator

**Solutions:**
1. Click "Authorize" when prompted (not "Deny")
2. Verify Bitbucket user has necessary permissions (read/write access to projects)
3. Check with Bitbucket administrator if application link is enabled

##### Error: `callback_timeout`

**Symptom:**
```
Error: OAuth callback timed out after 5 minutes
```

**Causes:**
- User didn't complete authorization within timeout window
- Browser didn't open automatically
- Callback port blocked by firewall

**Solutions:**
1. Complete authorization faster (default timeout: 5 minutes)
2. Increase timeout in configuration:
   ```yaml
   oauth2:
     timeout_minutes: 10  # Increase to 10 minutes
   ```
3. Manually open authorization URL if browser doesn't auto-open
4. Check firewall allows incoming connections on callback port (8080)

#### Configuration Examples

**Production Deployment:**

```yaml
# ~/.bitbucket-mcp/config.yml
bitbucket_url: https://bitbucket.company.com
auth_method: oauth2

oauth2:
  client_id: "prod_client_id_abc123"
  client_secret: "${BITBUCKET_OAUTH_SECRET}"  # Use env var for secret
  redirect_uri: "https://mcp-server.company.com/oauth/callback"
  callback_port: 443
  scope: "read:bitbucket-user read:bitbucket-work write:bitbucket-work offline_access"
  timeout_minutes: 5
```

**Development/Testing:**

```yaml
# ~/.bitbucket-mcp/config.yml
bitbucket_url: https://bitbucket-dev.company.com
auth_method: oauth2

oauth2:
  client_id: "dev_client_id_xyz789"
  client_secret: "${BITBUCKET_OAUTH_SECRET_DEV}"
  redirect_uri: "http://localhost:8080/callback"
  callback_port: 8080
  scope: "read:bitbucket-user read:bitbucket-work write:bitbucket-work offline_access"
  timeout_minutes: 10  # Longer timeout for debugging
```

#### Additional Resources

- [Bitbucket OAuth 2.0 Official Documentation](https://developer.atlassian.com/server/bitbucket/how-tos/example-basic-authentication/)
- [OAuth 2.0 RFC 6749 Specification](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC 7636 Specification](https://tools.ietf.org/html/rfc7636)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---

---

### 2. Personal Access Token (PAT) (Recommended for Development)

> **⏱️ Estimated Setup Time:** 5 minutes  
> **🎯 Difficulty Level:** Easy  
> **✅ Best for:** Development, CI/CD, and production environments with Bitbucket DC 8.14+

**Security Features:**
- Token-based authentication (no passwords transmitted)
- Tokens can be revoked individually without affecting other sessions
- Scoped permissions (can limit access to specific operations)
- Easy to rotate and manage
- No browser interaction required (great for automation)

#### Prerequisites

Before generating a Personal Access Token, ensure you have:

- ✅ **Bitbucket Data Center 8.14+** - PAT feature not available in older versions
- ✅ **Bitbucket User Account** - With appropriate permissions for desired operations
- ✅ **Permission to Create Tokens** - Some organizations restrict PAT creation
- ✅ **HTTPS Enabled** - Strongly recommended to protect token in transit

**Version Check:**
```bash
# Verify your Bitbucket version supports PAT
curl -s https://bitbucket.example.com/rest/api/2/serverInfo | jq '.version'
# Should return 8.14.0 or higher
```

#### Step-by-Step Setup Guide

##### Step 1: Generate Personal Access Token in Bitbucket

1. **Access Your Bitbucket Profile:**
   - Log in to Bitbucket with your user account
   - Click your **profile picture** (top right corner)
   - Select **"Profile"** from the dropdown menu

   <!-- Screenshot: Profile menu -->
   ![Profile Menu](./images/auth/pat-01-profile-menu.png)

2. **Navigate to Personal Access Tokens:**
   - On your profile page, look for the left sidebar
   - Click **"Personal Access Tokens"** under the "Security" section
   - You'll see a list of existing tokens (may be empty)

   <!-- Screenshot: Personal Access Tokens page -->
   ![Personal Access Tokens Page](./images/auth/pat-02-tokens-page.png)

3. **Create New Token:**
   - Click **"Create token"** button (top right)
   - A dialog will appear for token configuration

   <!-- Screenshot: Create token dialog -->
   ![Create Token Dialog](./images/auth/pat-03-create-dialog.png)

4. **Configure Token Details:**
   - **Token Name:** `MCP Server - Development` (use descriptive names)
     - Best practice: Include environment (dev/staging/prod) and purpose
     - Example: `MCP Server - CI/CD Pipeline`, `MCP Server - Local Dev`
   - **Expiration Date:** (Optional but recommended)
     - **90 days:** Good balance for development tokens
     - **1 year:** For long-term production use (require rotation process)
     - **No expiration:** ⚠️ Not recommended for security reasons
   - Click **"Create"**

   <!-- Screenshot: Token configuration form -->
   ![Token Configuration](./images/auth/pat-04-token-config.png)

5. **Copy Token Immediately:**
   - ⚠️ **CRITICAL:** Token is shown **ONLY ONCE** after creation
   - A dialog displays your new token: `NjA3ODk2MDQ5Mjc5OmrXn...` (example)
   - Click **"Copy"** button or manually select and copy the entire token
   - Store securely (password manager, secrets vault, environment variable)
   - **You cannot retrieve this token again!** If lost, create a new one.

   <!-- Screenshot: Token display dialog -->
   ![Token Created](./images/auth/pat-05-token-display.png)

6. **Verify Token Created:**
   - After copying and closing dialog, you'll see the token in your list
   - Displays: Token name, creation date, expiration date, last used
   - You can revoke or delete tokens from this list

   <!-- Screenshot: Token list with new token -->
   ![Token List](./images/auth/pat-06-token-list.png)

##### Step 2: Configure MCP Server

**Option A: Using Environment Variables** (Recommended for development)

```bash
# Required configuration
export BITBUCKET_URL="https://bitbucket.example.com"
export BITBUCKET_AUTH_METHOD="pat"
export BITBUCKET_PAT_TOKEN="NjA3ODk2MDQ5Mjc5OmrXn..."  # Your token from Step 1

# Verify configuration
echo "Bitbucket URL: $BITBUCKET_URL"
echo "Auth Method: $BITBUCKET_AUTH_METHOD"
echo "Token configured: ${BITBUCKET_PAT_TOKEN:0:10}..." # Shows first 10 chars only
```

**Option B: Using Configuration File** (Recommended for production)

Create or edit `~/.bitbucket-mcp/config.yml`:

```yaml
bitbucket_url: https://bitbucket.example.com
auth_method: pat

pat:
  # Option 1: Direct token (not recommended - use env var instead)
  token: "${BITBUCKET_PAT_TOKEN}"  # References environment variable
  
  # Option 2: Token from OS keychain (stored after first use)
  # The MCP server will prompt for token on first run and store securely
```

**Best Practice Configuration (using environment variable):**

```yaml
# config.yml - no secrets in file
bitbucket_url: https://bitbucket.example.com
auth_method: pat
```

```bash
# .env file or shell environment
export BITBUCKET_PAT_TOKEN="your-token-here"
```

**Option C: Using Interactive Setup Wizard** (Easiest)

```bash
# Run the setup wizard
npx bitbucket-mcp-server setup

# Follow the prompts:
# 1. Select "Personal Access Token (PAT)"
# 2. Enter Bitbucket URL
# 3. Paste your PAT token
# 4. Token will be stored securely in OS keychain
```

##### Step 3: Test Connection

1. **Start MCP Server:**
   ```bash
   npx bitbucket-mcp-server start
   ```

2. **Automatic Token Validation:**
   - Server validates token by calling Bitbucket API
   - Stores token securely in OS keychain (no re-entry needed)
   - You'll see success message:
     ```
     ✅ PAT authentication successful!
     ✅ Connected as: john.doe@example.com
     🔒 Token stored securely in OS keychain
     ```

3. **Verify Connection:**
   ```bash
   # Test the connection
   npx bitbucket-mcp-server test-connection
   
   # Expected output:
   # ✅ Connected to Bitbucket: https://bitbucket.example.com
   # ✅ Authenticated as: john.doe@example.com (PAT)
   # ✅ Token valid (expires: 2026-01-15 or "Never" if no expiration)
   ```

#### Token Expiration Handling

##### Monitoring Token Expiration

PAT tokens can have expiration dates. The MCP server helps you manage them:

**Check Token Expiration:**
```bash
# View token info
npx bitbucket-mcp-server auth info

# Output:
# Auth Method: Personal Access Token (PAT)
# Bitbucket URL: https://bitbucket.example.com
# User: john.doe@example.com
# Token Created: 2025-10-18
# Token Expires: 2026-01-15 (89 days remaining)
# Last Used: 2025-10-18 10:30:00 UTC
```

**Expiration Warnings:**
- **30 days before expiration:** Server logs warning on startup
- **7 days before expiration:** Server logs warning on every operation
- **1 day before expiration:** Server logs critical warning
- **After expiration:** Authentication fails with clear error message

##### Renewing/Rotating Tokens

**When to Rotate:**
- Before expiration (recommended: 7-14 days before)
- Every 90 days (security best practice)
- After suspected compromise
- When changing environments (dev → staging → production)

**Rotation Process:**

1. **Generate New Token** (follow Step 1 above)
   - Create new token with same name + version (e.g., `MCP Server - Dev v2`)
   - Keep old token active until rotation complete

2. **Update Configuration:**
   ```bash
   # Update environment variable
   export BITBUCKET_PAT_TOKEN="new-token-here"
   
   # Or update via setup wizard
   npx bitbucket-mcp-server setup --reconfigure
   ```

3. **Test New Token:**
   ```bash
   # Verify new token works
   npx bitbucket-mcp-server test-connection
   ```

4. **Revoke Old Token:**
   - Return to Bitbucket → Profile → Personal Access Tokens
   - Find old token in list
   - Click **"Revoke"** or **"Delete"**
   - Confirm revocation

**Automated Rotation (CI/CD):**

```bash
#!/bin/bash
# rotate-bitbucket-pat.sh - Example rotation script

# Generate new token (manual step - Bitbucket doesn't support API token generation)
echo "Generate new PAT in Bitbucket UI and paste here:"
read -s NEW_TOKEN

# Update secret in your secrets manager
# Example for AWS Secrets Manager:
aws secretsmanager update-secret \
  --secret-id bitbucket-mcp-pat \
  --secret-string "$NEW_TOKEN"

# Restart MCP server to use new token
systemctl restart bitbucket-mcp-server

# Verify connection
npx bitbucket-mcp-server test-connection

# Schedule old token revocation (grace period)
echo "Revoke old token in Bitbucket UI after verifying new token works"
```

##### Handling Expired Tokens

**Error When Token Expires:**
```json
{
  "error": "AuthenticationError",
  "message": "Personal Access Token expired",
  "details": {
    "expired_at": "2026-01-15T00:00:00Z",
    "days_expired": 5
  },
  "troubleshooting_url": "https://github.com/your-org/bitbucket-mcp-server/docs/authentication.md#token-expiration-handling"
}
```

**Resolution:**
1. Generate new PAT token in Bitbucket (follow Step 1)
2. Update configuration with new token
3. Restart MCP server
4. Verify connection works

#### Common PAT Errors

##### Error: `invalid_token` / `401 Unauthorized`

**Symptom:**
```json
{
  "error": "AuthenticationError",
  "message": "Invalid Personal Access Token",
  "status": 401
}
```

**Causes:**
- Token copied incorrectly (extra spaces, truncated)
- Token expired
- Token revoked by user or administrator
- Token created for different Bitbucket instance

**Solutions:**
1. Verify token is complete (no spaces, line breaks, or truncation)
2. Check token expiration date in Bitbucket UI
3. Verify token exists in Personal Access Tokens list (not revoked)
4. Regenerate token if necessary
5. Ensure token is for correct Bitbucket instance URL

**Debugging:**
```bash
# Test token directly with curl
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://bitbucket.example.com/rest/api/2/myself

# Expected: JSON with your user info
# If error: Check token validity
```

##### Error: `insufficient_permissions` / `403 Forbidden`

**Symptom:**
```json
{
  "error": "AuthorizationError",
  "message": "User lacks required permissions",
  "status": 403,
  "required_permissions": ["BROWSE_PROJECTS", "CREATE_ISSUES"]
}
```

**Causes:**
- User account lacks Bitbucket permissions for requested operation
- Token scope doesn't include required permissions (if scoped tokens enabled)
- Project-level permissions not granted

**Solutions:**
1. Verify user has necessary Bitbucket permissions:
   - Browse Projects
   - Create Issues
   - Edit Issues
   - Add Comments
   - (etc., depending on operations needed)
2. Contact Bitbucket administrator to grant permissions
3. For scoped tokens: Verify token scope includes required permissions
4. Test with different operation to identify which permission is missing

##### Error: `invalid_token_format`

**Symptom:**
```
Error: Invalid PAT token format
Expected format: Base64-encoded string
```

**Causes:**
- Token contains invalid characters
- Token was modified after copying
- Using OAuth token instead of PAT token

**Solutions:**
1. Recopy token from Bitbucket (ensure no extra spaces or line breaks)
2. Verify using actual PAT token (not OAuth access token)
3. Regenerate token if corrupted

#### Security Best Practices for PAT

**Token Storage:**
- ✅ Store in environment variables or secrets manager (HashiCorp Vault, AWS Secrets Manager)
- ✅ Use OS keychain integration (automatic with this MCP server)
- ✅ Encrypt at rest if stored in files
- ❌ Never commit to version control (add to `.gitignore`)
- ❌ Never log token values (server auto-redacts in logs)
- ❌ Never share tokens between team members (create individual tokens)

**Token Lifecycle:**
- ✅ Set expiration dates (recommended: 90 days for dev, 1 year max for prod)
- ✅ Rotate tokens regularly (before expiration)
- ✅ Revoke unused or compromised tokens immediately
- ✅ Use descriptive names (include purpose and environment)
- ✅ Document token owners and purposes

**Token Permissions:**
- ✅ Use least privilege (minimum permissions required)
- ✅ Create separate tokens for different purposes (read-only vs read-write)
- ✅ Separate tokens per environment (dev/staging/prod)
- ❌ Never reuse production tokens in development

**Monitoring:**
- ✅ Monitor token usage in Bitbucket audit logs
- ✅ Set up expiration alerts (7-30 days before)
- ✅ Review and revoke unused tokens quarterly
- ✅ Track last-used dates

#### Configuration Examples

**Development Environment:**

```yaml
# ~/.bitbucket-mcp/config.yml
bitbucket_url: https://bitbucket-dev.company.com
auth_method: pat

# Token loaded from environment variable
# Set via: export BITBUCKET_PAT_TOKEN="your-dev-token"
```

**CI/CD Pipeline:**

```yaml
# config.yml (in CI environment)
bitbucket_url: https://bitbucket.company.com
auth_method: pat

# Token injected by CI system:
# - GitHub Actions: ${{ secrets.BITBUCKET_PAT_TOKEN }}
# - GitLab CI: $BITBUCKET_PAT_TOKEN
# - Jenkins: credentials('bitbucket-pat-token')
```

**Production Deployment:**

```yaml
# /etc/bitbucket-mcp/config.yml
bitbucket_url: https://bitbucket.company.com
auth_method: pat

# Token loaded from secrets manager
# E.g., AWS: $(aws secretsmanager get-secret-value --secret-id bitbucket-pat | jq -r .SecretString)
```

#### Additional Resources

- [Bitbucket Personal Access Tokens Official Documentation](https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html)
- [Bitbucket Data Center 8.14 Release Notes](https://confluence.atlassian.com/jirasoftware/jira-software-8-14-x-release-notes-1018783348.html)
- [Personal Access Token Security Best Practices](https://www.atlassian.com/engineering/api-tokens-security)

---

---

### 3. OAuth 1.0a (Legacy Bitbucket Support)

> **⏱️ Estimated Setup Time:** 15-20 minutes  
> **🎯 Difficulty Level:** Hard  
> **✅ Best for:** Legacy Bitbucket Data Center versions < 8.0 that don't support OAuth 2.0/PAT

> **⚠️ DEPRECATION WARNING:** OAuth 1.0a is deprecated by Atlassian. Use OAuth 2.0 or PAT for new implementations.  
> **Migration Recommended:** If your Bitbucket version supports OAuth 2.0 (8.0+) or PAT (8.14+), use those instead.

**Security Features:**
- HMAC-SHA1 or RSA-SHA1 signature generation (more secure than Basic Auth)
- Request signing prevents tampering and replay attacks
- Tokens can be revoked by user without password change
- Consumer key/secret for application identity

**Limitations:**
- No token refresh mechanism (requires re-authorization when token expires)
- Complex signature generation for every request (performance overhead)
- Requires RSA key pair generation and management
- Deprecated by Atlassian (limited future support)

#### Prerequisites

Before configuring OAuth 1.0a, ensure you have:

- ✅ **Bitbucket Data Center 7.x or higher** - OAuth 1.0a available in all modern versions
- ✅ **Bitbucket Administrator Access** - Required to create Application Links
- ✅ **OpenSSL or Similar Tool** - For generating RSA key pairs
- ✅ **Command-Line Access** - For key generation and configuration
- ✅ **HTTPS Enabled** - Strongly recommended (HTTP works for localhost only)

**Version Check:**
```bash
# Verify Bitbucket version
curl -s https://bitbucket.example.com/rest/api/2/serverInfo | jq '.version'
# OAuth 1.0a works with Bitbucket 7.x+ (all versions)
```

#### Step-by-Step Setup Guide

##### Step 1: Generate RSA Key Pair

OAuth 1.0a with RSA-SHA1 signatures requires an RSA public/private key pair.

1. **Generate Private Key:**
   ```bash
   # Generate 2048-bit RSA private key
   openssl genrsa -out bitbucket_oauth_private_key.pem 2048
   
   # Verify private key
   openssl rsa -in bitbucket_oauth_private_key.pem -check
   ```

2. **Generate Public Key:**
   ```bash
   # Extract public key from private key
   openssl rsa -in bitbucket_oauth_private_key.pem \
     -pubout -out bitbucket_oauth_public_key.pem
   
   # View public key
   cat bitbucket_oauth_public_key.pem
   ```

3. **Convert Private Key to PKCS8 Format (if needed):**
   ```bash
   # Some Bitbucket versions require PKCS8 format
   openssl pkcs8 -topk8 -nocrypt \
     -in bitbucket_oauth_private_key.pem \
     -out bitbucket_oauth_private_key_pkcs8.pem
   ```

4. **Secure Your Private Key:**
   ```bash
   # Set restrictive permissions (owner read-only)
   chmod 400 bitbucket_oauth_private_key.pem
   
   # Move to secure location
   mv bitbucket_oauth_private_key.pem ~/.bitbucket-mcp/oauth_private_key.pem
   mv bitbucket_oauth_public_key.pem ~/.bitbucket-mcp/oauth_public_key.pem
   ```

**Key Security:**
- ⚠️ **Never commit private keys to version control**
- ⚠️ **Never share private keys** (even within your team)
- ✅ Store private keys securely (restricted file permissions, encrypted storage)
- ✅ Back up keys securely (encrypted backup)
- ✅ Generate separate keys per environment (dev/staging/prod)

##### Step 2: Create Application Link in Bitbucket

1. **Access Bitbucket Administration Console:**
   - Log in to Bitbucket as an administrator
   - Click the **gear icon** (⚙️) in the top right
   - Select **"Manage apps"** or **"Add-ons"** from the dropdown menu

   <!-- Screenshot: Bitbucket admin menu for OAuth 1.0a -->
   ![Bitbucket Admin Menu](./images/auth/oauth1-01-admin-menu.png)

2. **Navigate to Application Links:**
   - In the left sidebar, scroll to **"Integrations"** section
   - Click **"Application Links"**
   - You'll see a list of existing application links

   <!-- Screenshot: Application Links page -->
   ![Application Links Page](./images/auth/oauth1-02-application-links.png)

3. **Create New Application Link:**
   - Click **"Create link"** button (or **"Add application link"** in older Bitbucket versions)
   - Enter application URL: `http://localhost:8080` (or your MCP server URL)
   - Click **"Create new link"** or **"Continue"**
   
   **Note:** The URL is informational only for OAuth 1.0a (used for display purposes)

   <!-- Screenshot: Create application link -->
   ![Create Application Link](./images/auth/oauth1-03-create-link.png)

4. **Configure Application Details (First Screen):**
   - **Application Name:** `Bitbucket MCP Server`
   - **Application Type:** Generic Application
   - **Service Provider Name:** `Bitbucket MCP Server` (optional)
   - **Consumer Key:** `bitbucket-mcp-server` (you choose this - remember it!)
   - **Shared Secret:** (leave blank for public key authentication)
   - **Request Token URL:** `http://localhost:8080/oauth/request-token` (informational)
   - **Access Token URL:** `http://localhost:8080/oauth/access-token` (informational)
   - **Authorize URL:** `http://localhost:8080/oauth/authorize` (informational)
   - Check **"Create incoming link"** checkbox
   - Click **"Continue"**

   <!-- Screenshot: Application link configuration -->
   ![Application Link Configuration](./images/auth/oauth1-04-app-config.png)

5. **Configure Incoming Authentication (Second Screen):**
   - **Consumer Key:** `bitbucket-mcp-server` (must match from previous screen)
   - **Consumer Name:** `Bitbucket MCP Server`
   - **Public Key:** Paste contents of `bitbucket_oauth_public_key.pem` here
     ```bash
     # Copy public key to clipboard
     cat ~/.bitbucket-mcp/oauth_public_key.pem | pbcopy  # macOS
     cat ~/.bitbucket-mcp/oauth_public_key.pem | xclip -selection clipboard  # Linux
     ```
     The public key should look like:
     ```
     -----BEGIN PUBLIC KEY-----
     MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
     ...
     -----END PUBLIC KEY-----
     ```
   - **Consumer Callback URL:** `http://localhost:8080/callback`
   - Check **"Allow 2-Legged OAuth"** if needed (for server-to-server, no user authorization)
   - Click **"Continue"** or **"Save"**

   <!-- Screenshot: Incoming authentication configuration -->
   ![Incoming Authentication Config](./images/auth/oauth1-05-incoming-auth.png)

6. **Verify Application Link Created:**
   - You'll see the new application link in the list
   - Status should show **"Configured"** or **"Active"**
   - Note the **Consumer Key** (you'll need this for MCP server configuration)

   <!-- Screenshot: Application link created -->
   ![Application Link Created](./images/auth/oauth1-06-link-created.png)

##### Step 3: Configure MCP Server

**Option A: Using Environment Variables**

```bash
# Required configuration
export BITBUCKET_URL="https://bitbucket.example.com"
export BITBUCKET_AUTH_METHOD="oauth1"
export OAUTH1_CONSUMER_KEY="bitbucket-mcp-server"  # From Step 2
export OAUTH1_PRIVATE_KEY_PATH="$HOME/.bitbucket-mcp/oauth_private_key.pem"

# Optional configuration (with defaults)
export OAUTH1_CALLBACK_URL="http://localhost:8080/callback"  # Default
export OAUTH1_CALLBACK_PORT="8080"                           # Default
export OAUTH1_TIMEOUT_MINUTES="5"                           # Default
export OAUTH1_SIGNATURE_METHOD="RSA-SHA1"                    # Default (or HMAC-SHA1)
```

**Option B: Using Configuration File**

Create or edit `~/.bitbucket-mcp/config.yml`:

```yaml
bitbucket_url: https://bitbucket.example.com
auth_method: oauth1

oauth1:
  consumer_key: "bitbucket-mcp-server"  # From Step 2
  private_key_path: "~/.bitbucket-mcp/oauth_private_key.pem"  # Path to private key
  signature_method: "RSA-SHA1"  # or "HMAC-SHA1" (if using shared secret)
  callback_url: "http://localhost:8080/callback"
  callback_port: 8080
  timeout_minutes: 5
```

**Option C: Using HMAC-SHA1 (Shared Secret) Instead of RSA**

If you prefer shared secret over RSA keys:

```yaml
bitbucket_url: https://bitbucket.example.com
auth_method: oauth1

oauth1:
  consumer_key: "bitbucket-mcp-server"
  consumer_secret: "your-shared-secret"  # From Application Link setup
  signature_method: "HMAC-SHA1"
  callback_url: "http://localhost:8080/callback"
  callback_port: 8080
  timeout_minutes: 5
```

**Note:** RSA-SHA1 is more secure than HMAC-SHA1 and recommended.

##### Step 4: Authenticate via Three-Legged OAuth Flow

OAuth 1.0a uses a three-legged flow to obtain user authorization:

1. **Start MCP Server:**
   ```bash
   npx bitbucket-mcp-server start
   ```

2. **Automatic Browser Authorization:**
   - Server generates request token and opens browser automatically
   - You'll be redirected to Bitbucket's authorization page
   - URL format: `https://bitbucket.example.com/plugins/servlet/oauth/authorize?oauth_token=...`

   <!-- Screenshot: OAuth 1.0a authorization page -->
   ![OAuth 1.0a Authorization Page](./images/auth/oauth1-07-authorize-page.png)

3. **Grant Access:**
   - Log in to Bitbucket (if not already logged in)
   - Review the requested permissions
   - Click **"Allow"** button to authorize the application
   - Bitbucket will redirect back to callback URL with verifier code

   <!-- Screenshot: Authorization success -->
   ![Authorization Success](./images/auth/oauth1-08-auth-success.png)

4. **Automatic Token Exchange:**
   - MCP server automatically exchanges request token + verifier for access token
   - You'll see a success message in the terminal:
     ```
     ✅ OAuth 1.0a authentication successful!
     ✅ Access token obtained and stored securely
     🔒 Credentials stored in OS keychain
     ```

5. **Verify Connection:**
   ```bash
   # Test the connection
   npx bitbucket-mcp-server test-connection
   
   # Expected output:
   # ✅ Connected to Bitbucket: https://bitbucket.example.com
   # ✅ Authenticated as: john.doe@example.com (OAuth 1.0a)
   # ✅ Access token valid
   ```

#### OAuth 1.0a Three-Legged Flow Explained

```
┌─────────────┐                                  ┌──────────────┐
│ MCP Server  │                                  │ Bitbucket Server  │
└──────┬──────┘                                  └──────┬───────┘
       │                                                │
       │ 1. Request Token (with consumer key)          │
       │──────────────────────────────────────────────>│
       │                                                │
       │ 2. Temporary Credentials (request token)      │
       │<──────────────────────────────────────────────│
       │                                                │
       │ 3. Redirect User to Authorization URL         │
       │──────────────────────────────────────────────>│
       │                                                │
       │           ┌────────────────────┐               │
       │           │  User Browser      │               │
       │           │  4. User logs in   │               │
       │           │  5. User clicks    │               │
       │           │     "Authorize"    │               │
       │           └────────────────────┘               │
       │                                                │
       │ 6. Callback with oauth_verifier               │
       │<──────────────────────────────────────────────│
       │                                                │
       │ 7. Exchange token + verifier for access token │
       │──────────────────────────────────────────────>│
       │                                                │
       │ 8. Access Token (final credentials)           │
       │<──────────────────────────────────────────────│
       │                                                │
       │ 9. Make API calls (signed with access token)  │
       │──────────────────────────────────────────────>│
       │                                                │
```

**Flow Steps:**
1. **Request Token:** MCP server requests temporary credentials using consumer key
2. **Temporary Credentials:** Bitbucket returns request token (temporary, single-use)
3. **User Authorization:** Server opens browser to Bitbucket authorization page
4. **User Login:** User authenticates with Bitbucket (if not logged in)
5. **User Approval:** User clicks "Allow" to authorize application
6. **Callback with Verifier:** Bitbucket redirects to callback URL with oauth_verifier code
7. **Token Exchange:** Server exchanges request token + verifier for access token
8. **Access Token:** Bitbucket returns long-lived access token (used for API calls)
9. **API Calls:** All subsequent requests signed with access token

#### Common OAuth 1.0a Errors

##### Error: `signature_invalid`

**Symptom:**
```json
{
  "error": "oauth_problem=signature_invalid",
  "message": "The signature is invalid"
}
```

**Causes:**
- Private key doesn't match public key configured in Bitbucket Application Link
- Incorrect consumer key
- Clock skew between MCP server and Bitbucket server (OAuth 1.0a uses timestamps)
- Wrong signature method (RSA-SHA1 vs HMAC-SHA1)
- Private key file corrupted or wrong format

**Solutions:**
1. Verify private key matches public key:
   ```bash
   # Extract public key from private key
   openssl rsa -in oauth_private_key.pem -pubout
   
   # Compare with public key in Bitbucket Application Link
   ```
2. Verify consumer key matches exactly (case-sensitive)
3. Synchronize system clock:
   ```bash
   # Check system time
   date
   
   # Synchronize (Linux)
   sudo ntpdate time.nist.gov
   
   # Synchronize (macOS)
   sudo sntp -sS time.apple.com
   ```
4. Verify signature method matches (RSA-SHA1 or HMAC-SHA1)
5. Regenerate key pair if corrupted

##### Error: `token_rejected`

**Symptom:**
```json
{
  "error": "oauth_problem=token_rejected",
  "message": "The request token has been denied"
}
```

**Causes:**
- User clicked "Deny" during authorization
- Request token expired (default: 10 minutes)
- Request token already used (OAuth 1.0a tokens are single-use)
- Application Link disabled or deleted in Bitbucket

**Solutions:**
1. Start authorization flow again from beginning
2. Complete authorization faster (within 10 minutes)
3. Don't refresh callback page (tokens are single-use)
4. Verify Application Link exists and is enabled in Bitbucket admin console

##### Error: `timestamp_refused`

**Symptom:**
```json
{
  "error": "oauth_problem=timestamp_refused",
  "message": "The timestamp is too far from the current time"
}
```

**Causes:**
- Clock skew between MCP server and Bitbucket server exceeds tolerance (usually 5 minutes)
- System time incorrectly set
- Timezone configuration issues

**Solutions:**
1. Synchronize system clock with NTP:
   ```bash
   # Check current time
   date
   
   # Expected: Should match actual UTC time within a few seconds
   
   # Synchronize clock
   sudo ntpdate pool.ntp.org  # Linux
   sudo sntp -sS time.apple.com  # macOS
   ```
2. Verify timezone configuration:
   ```bash
   # Check timezone
   timedatectl  # Linux
   date  # macOS/Linux
   ```
3. Enable automatic time synchronization:
   ```bash
   # Enable NTP (Linux)
   sudo timedatectl set-ntp true
   ```

##### Error: `consumer_key_unknown`

**Symptom:**
```json
{
  "error": "oauth_problem=consumer_key_unknown",
  "message": "Consumer key unknown"
}
```

**Causes:**
- Consumer key in configuration doesn't match Application Link
- Application Link deleted in Bitbucket
- Typo in consumer key (case-sensitive)

**Solutions:**
1. Verify consumer key matches Application Link exactly:
   - Go to Bitbucket → Application Links
   - Check consumer key for your application
   - Update configuration to match exactly (case-sensitive)
2. Recreate Application Link if deleted
3. Check for typos or extra whitespace

##### Error: `nonce_used`

**Symptom:**
```json
{
  "error": "oauth_problem=nonce_used",
  "message": "Nonce has already been used"
}
```

**Causes:**
- OAuth nonce (number used once) was reused
- Request was replayed (possibly due to retry logic)
- Clock issues causing nonce collision

**Solutions:**
1. Retry request (server will generate new nonce)
2. Check for duplicate request handling in your code
3. Verify system clock is synchronized (nonce includes timestamp)

#### Security Best Practices for OAuth 1.0a

**Private Key Management:**
- ✅ Generate separate key pairs per environment (dev/staging/prod)
- ✅ Store private keys with restrictive permissions (chmod 400)
- ✅ Never commit private keys to version control
- ✅ Use encrypted storage for private keys
- ✅ Back up keys securely (encrypted backups)
- ❌ Never share private keys between applications or team members
- ❌ Never transmit private keys over insecure channels

**Consumer Key Security:**
- ✅ Use unique consumer keys per environment
- ✅ Use descriptive consumer keys (e.g., `bitbucket-mcp-prod`, `bitbucket-mcp-dev`)
- ✅ Revoke unused consumer keys in Application Links

**Token Lifecycle:**
- ⚠️ OAuth 1.0a access tokens don't expire automatically (long-lived)
- ✅ Revoke tokens when no longer needed
- ✅ Monitor token usage in Bitbucket audit logs
- ✅ Rotate tokens periodically (every 90-180 days)

**Monitoring:**
- ✅ Log OAuth 1.0a authentication events
- ✅ Monitor for signature failures (could indicate attack)
- ✅ Alert on unusual authorization patterns

#### Configuration Examples

**Production Deployment (RSA-SHA1):**

```yaml
# /etc/bitbucket-mcp/config.yml
bitbucket_url: https://bitbucket.company.com
auth_method: oauth1

oauth1:
  consumer_key: "bitbucket-mcp-prod"
  private_key_path: "/etc/bitbucket-mcp/secrets/oauth_private_key.pem"
  signature_method: "RSA-SHA1"
  callback_url: "https://mcp-server.company.com/oauth/callback"
  callback_port: 443
  timeout_minutes: 5
```

**Development/Testing:**

```yaml
# ~/.bitbucket-mcp/config.yml
bitbucket_url: https://bitbucket-dev.company.com
auth_method: oauth1

oauth1:
  consumer_key: "bitbucket-mcp-dev"
  private_key_path: "~/.bitbucket-mcp/oauth_private_key.pem"
  signature_method: "RSA-SHA1"
  callback_url: "http://localhost:8080/callback"
  callback_port: 8080
  timeout_minutes: 10  # Longer timeout for debugging
```

#### Migration to OAuth 2.0 or PAT

**If your Bitbucket version supports modern auth methods, migration is strongly recommended:**

**Migration Checklist:**
- [ ] Verify Bitbucket version (8.0+ for OAuth 2.0, 8.14+ for PAT)
- [ ] Set up new authentication method (OAuth 2.0 or PAT)
- [ ] Test new auth method in development environment
- [ ] Update production configuration
- [ ] Delete old OAuth 1.0a Application Link in Bitbucket
- [ ] Remove OAuth 1.0a private keys from servers

**Why Migrate:**
- ✅ Simpler implementation (no signature generation)
- ✅ Better performance (fewer cryptographic operations)
- ✅ Token refresh support (OAuth 2.0)
- ✅ Modern security standards
- ✅ Better Atlassian support and documentation
- ✅ Easier troubleshooting

See [Migration Guide](#migration-guide) for detailed steps.

#### Additional Resources

- [Bitbucket OAuth 1.0a Official Documentation](https://developer.atlassian.com/server/bitbucket/how-tos/example-basic-authentication/)
- [OAuth 1.0 RFC 5849 Specification](https://tools.ietf.org/html/rfc5849)
- [OAuth 1.0a Security Considerations](https://tools.ietf.org/html/rfc5849#section-4)
- [OpenSSL Key Generation Guide](https://www.openssl.org/docs/man1.1.1/man1/genrsa.html)

---

---

### 4. Basic HTTP Authentication (Development Only)

> **⏱️ Estimated Setup Time:** 2 minutes  
> **🎯 Difficulty Level:** Easy  
> **✅ Best for:** Local development and quick testing ONLY (with HTTPS)

> **⚠️ SECURITY WARNING:** Basic Authentication is inherently insecure.  
> **HTTPS is MANDATORY. NEVER use in production over HTTP.**  
> **Recommended:** Use OAuth 2.0 or PAT instead whenever possible.

**Security Risks:**
- ❌ Credentials are base64-encoded (NOT encrypted - easily reversible)
- ❌ Username and password sent with EVERY request (high exposure)
- ❌ No token expiration or refresh mechanism
- ❌ Password cannot be revoked without changing it
- ❌ **Credentials exposed in plaintext over HTTP**
- ❌ No protection against replay attacks
- ❌ Single password compromise = full account access

**When to Use Basic Auth:**
- ✅ Local development and testing ONLY
- ✅ Temporary testing with HTTPS-enabled Bitbucket
- ✅ Quick prototyping (switch to better auth before production)
- ✅ Legacy systems where OAuth is not available (with HTTPS)
- ❌ **NEVER in production environments**
- ❌ **NEVER over HTTP** (credentials exposed in plaintext)

#### Prerequisites

Before using Basic Authentication, ensure:

- ✅ **HTTPS Enabled** - **MANDATORY** (HTTP exposes credentials in plaintext)
- ✅ **Development/Testing Environment** - Not for production use
- ✅ **Bitbucket User Account** - With username and password
- ⚠️ **Plan to Migrate** - Switch to OAuth 2.0 or PAT before production

**HTTPS Verification:**
```bash
# Verify Bitbucket uses HTTPS (URL must start with https://)
echo $BITBUCKET_URL
# Expected: https://bitbucket.example.com (NOT http://)

# The MCP server will ERROR and refuse to start if using HTTP with Basic Auth
```

#### Step-by-Step Setup Guide

##### Step 1: Verify Your Bitbucket Credentials

1. **Test Login via Browser:**
   - Navigate to your Bitbucket instance: `https://bitbucket.example.com`
   - Log in with your username and password
   - Verify access works correctly

2. **Note Your Credentials:**
   - **Username:** Your Bitbucket username (e.g., `john.doe` or `john.doe@example.com`)
   - **Password:** Your Bitbucket account password
   - ⚠️ **Never commit these to version control**

#### Step 2: Configure MCP Server

**Option A: Using Environment Variables** (Recommended - no credentials in files)

```bash
# Required configuration
export BITBUCKET_URL="https://bitbucket.example.com"  # MUST be HTTPS!
export BITBUCKET_AUTH_METHOD="basic"
export BASIC_AUTH_USERNAME="your-username"
export BASIC_AUTH_PASSWORD="your-password"

# Verify HTTPS (server will refuse to start with HTTP)
if [[ $BITBUCKET_URL == http://* ]]; then
  echo "ERROR: Basic Auth requires HTTPS. Change to https://"
  exit 1
fi
```

**Option B: Using Configuration File** (Use environment variables for credentials)

Create or edit `~/.bitbucket-mcp/config.yml`:

```yaml
bitbucket_url: https://bitbucket.example.com  # MUST be HTTPS!
auth_method: basic

basic:
  # DO NOT hardcode credentials in config file
  # Use environment variables instead
  username: "${BASIC_AUTH_USERNAME}"
  password: "${BASIC_AUTH_PASSWORD}"
```

Then set environment variables:
```bash
export BASIC_AUTH_USERNAME="your-username"
export BASIC_AUTH_PASSWORD="your-password"
```

**Option C: Using Interactive Setup Wizard**

```bash
# Run the setup wizard
npx bitbucket-mcp-server setup

# Follow the prompts:
# 1. Select "Basic Auth (Development Only)"
# 2. Enter Bitbucket URL (will warn if HTTP detected)
# 3. Enter username
# 4. Enter password (hidden input)
# 5. Credentials stored securely in OS keychain
```

##### Step 3: Test Connection

1. **Start MCP Server:**
   ```bash
   npx bitbucket-mcp-server start
   ```

2. **Security Warnings:**
   - If using HTTP, server will ERROR and refuse to start:
     ```
     ❌ SECURITY ERROR: Basic Auth over HTTP is forbidden
     ❌ HTTP exposes credentials in plaintext
     ✅ Solution: Change BITBUCKET_URL to use HTTPS
     ```
   - If using HTTPS, server will warn:
     ```
     ⚠️ WARNING: Basic Auth detected (development only)
     ⚠️ Migrate to OAuth 2.0 or PAT before production
     ✅ Credentials will be stored encrypted in OS keychain
     ```

3. **Automatic Credential Validation:**
   - Server validates credentials by calling Bitbucket API
   - Stores credentials encrypted in OS keychain (no re-entry needed)
   - You'll see success message:
     ```
     ✅ Basic Auth authentication successful
     ✅ Connected as: john.doe@example.com
     🔒 Credentials stored encrypted in OS keychain
     ⚠️ Remember: Basic Auth is for development only
     ```

4. **Verify Connection:**
   ```bash
   # Test the connection
   npx bitbucket-mcp-server test-connection
   
   # Expected output:
   # ✅ Connected to Bitbucket: https://bitbucket.example.com
   # ✅ Authenticated as: john.doe@example.com (Basic Auth)
   # ⚠️ Warning: Basic Auth detected (migrate to OAuth 2.0/PAT)
   ```

#### How Basic Auth Works

**Authentication Mechanism:**

1. **Credential Encoding:**
   ```
   # Credentials combined and base64-encoded
   username:password → base64(username:password)
   
   # Example:
   john.doe:secret123 → am9obi5kb2U6c2VjcmV0MTIz
   ```

2. **Authorization Header:**
   ```http
   GET /rest/api/2/myself HTTP/1.1
   Host: bitbucket.example.com
   Authorization: Basic am9obi5kb2U6c2VjcmV0MTIz
   ```

3. **Every Request Includes Credentials:**
   - Username and password sent with **every single API call**
   - No token mechanism (can't revoke without changing password)
   - Higher risk of credential exposure

**⚠️ Security Implication:**
- Base64 is **encoding, NOT encryption** (easily reversible)
- Anyone intercepting HTTP traffic can decode credentials instantly:
  ```bash
  # Decoding is trivial
  echo "am9obi5kb2U6c2VjcmV0MTIz" | base64 --decode
  # Output: john.doe:secret123
  ```
- **This is why HTTPS is MANDATORY**

#### Common Basic Auth Errors

##### Error: `401 Unauthorized` / `invalid_credentials`

**Symptom:**
```json
{
  "error": "AuthenticationError",
  "message": "Invalid username or password",
  "status": 401
}
```

**Causes:**
- Incorrect username or password
- Password recently changed in Bitbucket
- Account locked due to failed login attempts
- Typo in credentials (extra spaces, wrong case)

**Solutions:**
1. Verify username and password by logging into Bitbucket UI
2. Check for typos, extra spaces, or case sensitivity
3. Reset password if forgotten
4. Check Bitbucket account status (not locked or disabled)
5. For email-based usernames, verify exact email format

**Debugging:**
```bash
# Test credentials directly with curl
curl -u "username:password" \
  https://bitbucket.example.com/rest/api/2/myself

# Expected: JSON with your user info
# If error: Credentials are incorrect
```

##### Error: `403 Forbidden` / `insufficient_permissions`

**Symptom:**
```json
{
  "error": "AuthorizationError",
  "message": "User lacks required permissions",
  "status": 403
}
```

**Causes:**
- User account lacks Bitbucket permissions for requested operation
- Account has restricted access (limited to specific projects)
- CAPTCHA required (too many failed login attempts)

**Solutions:**
1. Verify user has necessary Bitbucket permissions (browse projects, create issues, etc.)
2. Contact Bitbucket administrator to grant permissions
3. Unlock account if CAPTCHA-locked (log in via Bitbucket UI to clear)
4. Test with different operation to identify which permission is missing

##### Error: `account_locked`

**Symptom:**
```
Error: Account locked due to failed login attempts
Please unlock via Bitbucket UI
```

**Causes:**
- Too many failed login attempts
- CAPTCHA challenge triggered
- Security policy enforced account lock

**Solutions:**
1. Log in to Bitbucket UI manually
2. Complete CAPTCHA if presented
3. Contact Bitbucket administrator to unlock account
4. Wait for automatic unlock (usually 30 minutes)

##### Error: `http_basic_auth_forbidden`

**Symptom:**
```
❌ SECURITY ERROR: Basic Auth over HTTP is forbidden
❌ HTTP exposes credentials in plaintext
✅ Solution: Change BITBUCKET_URL to use HTTPS
```

**Causes:**
- Bitbucket URL uses `http://` instead of `https://`
- Server enforces HTTPS for Basic Auth (by design for security)

**Solutions:**
1. Update `BITBUCKET_URL` to use HTTPS:
   ```bash
   # Change from:
   export BITBUCKET_URL="http://bitbucket.example.com"
   
   # To:
   export BITBUCKET_URL="https://bitbucket.example.com"
   ```
2. Ensure Bitbucket instance has HTTPS enabled
3. If Bitbucket doesn't support HTTPS, use OAuth 2.0 or PAT instead

#### Security Best Practices for Basic Auth

**Credential Storage:**
- ✅ Use environment variables (never hardcode in config files)
- ✅ Use OS keychain integration (automatic with this MCP server)
- ✅ Clear bash history after setting credentials:
  ```bash
  # Set credentials
  export BASIC_AUTH_PASSWORD="secret"
  
  # Clear history entry
  history -d $(history 1 | awk '{print $1}')
  ```
- ❌ Never commit credentials to version control
- ❌ Never log credentials (server auto-redacts)
- ❌ Never share credentials between team members

**Transport Security:**
- ✅ **ALWAYS use HTTPS** (mandatory)
- ✅ Verify SSL/TLS certificates
- ❌ Never use HTTP (server will refuse)
- ❌ Never disable SSL verification

**Credential Management:**
- ✅ Use strong, unique passwords
- ✅ Change password regularly (every 90 days)
- ✅ Use different credentials per environment (dev/staging/prod)
- ✅ Migrate to OAuth 2.0 or PAT as soon as possible
- ❌ Never reuse passwords from other systems
- ❌ Never share account credentials

**Migration Planning:**
- ✅ Plan migration to OAuth 2.0 or PAT before production
- ✅ Test OAuth 2.0/PAT in development first
- ✅ Document migration timeline
- ✅ Set reminder to migrate (don't forget!)

**Monitoring:**
- ✅ Monitor failed login attempts
- ✅ Watch for account lock events
- ✅ Alert on Basic Auth usage in production (should never happen)

#### Configuration Examples

**Local Development:**

```yaml
# ~/.bitbucket-mcp/config.yml
bitbucket_url: https://bitbucket-dev.company.com
auth_method: basic

# Credentials loaded from environment (not in file)
# Set via: export BASIC_AUTH_USERNAME="dev-user"
#          export BASIC_AUTH_PASSWORD="dev-password"
```

```bash
# .env file (add to .gitignore!)
BITBUCKET_URL=https://bitbucket-dev.company.com
BITBUCKET_AUTH_METHOD=basic
BASIC_AUTH_USERNAME=dev-user
BASIC_AUTH_PASSWORD=dev-password
```

**Quick Testing (Temporary):**

```bash
# One-time test (credentials not persisted)
BITBUCKET_URL=https://bitbucket.example.com \
BITBUCKET_AUTH_METHOD=basic \
BASIC_AUTH_USERNAME=test-user \
BASIC_AUTH_PASSWORD=test-pass \
npx bitbucket-mcp-server test-connection
```

#### Migration from Basic Auth

**When to Migrate:**
- ✅ Before production deployment (mandatory)
- ✅ When Bitbucket version supports OAuth 2.0 (8.0+) or PAT (8.14+)
- ✅ When setting up CI/CD pipelines
- ✅ When team members need individual access (not shared credentials)

**Migration Options:**

1. **Migrate to Personal Access Token (Recommended for Development):**
   - ✅ Easiest migration path
   - ✅ No browser interaction needed
   - ✅ Individual tokens per developer
   - See [PAT Setup Guide](#2-personal-access-token-pat-recommended-for-development)

2. **Migrate to OAuth 2.0 (Recommended for Production):**
   - ✅ Best security
   - ✅ Token refresh support
   - ✅ User-specific authorization
   - See [OAuth 2.0 Setup Guide](#1-oauth-20-with-pkce-recommended-for-production)

**Migration Steps:**
1. Set up new auth method (OAuth 2.0 or PAT)
2. Test new auth method in development
3. Update configuration to new auth method
4. Remove Basic Auth credentials from environment
5. Verify new auth method works
6. Delete old credentials from OS keychain:
   ```bash
   npx bitbucket-mcp-server auth delete
   ```

See [Migration Guide](#migration-guide) for detailed steps.

#### Why Basic Auth Should Be Avoided

**Security Concerns:**
| Risk | Impact | Mitigation |
|------|--------|------------|
| **Credential Reuse** | Same password in multiple systems | Use PAT (separate token) |
| **No Revocation** | Can't revoke without changing password | Use OAuth/PAT (revocable tokens) |
| **Full Account Access** | Compromise = full Bitbucket access | Use scoped tokens (OAuth/PAT) |
| **Credential Exposure** | Sent with every request | Use token-based auth |
| **No Expiration** | Credentials valid indefinitely | Use tokens with expiration |
| **Plaintext over HTTP** | Credentials easily intercepted | Use HTTPS (required by this server) |

**Comparison with Better Alternatives:**

| Feature | Basic Auth | PAT | OAuth 2.0 |
|---------|------------|-----|-----------|
| **Setup Time** | 2 min | 5 min | 10-15 min |
| **Security** | ⭐ Poor | ⭐⭐⭐⭐ Very Good | ⭐⭐⭐⭐⭐ Excellent |
| **Revocation** | ❌ No (change password) | ✅ Yes (revoke token) | ✅ Yes (revoke token) |
| **Scope Control** | ❌ No (full account access) | ✅ Yes (scoped permissions) | ✅ Yes (scoped permissions) |
| **Token Refresh** | ❌ No | ❌ No | ✅ Yes |
| **Individual Access** | ❌ No (shared credentials) | ✅ Yes (individual tokens) | ✅ Yes (user-specific) |
| **Production Ready** | ❌ **NO** | ✅ Yes | ✅ Yes |

**Conclusion:** Basic Auth is suitable **only for quick local testing**. Migrate to OAuth 2.0 or PAT before any production use.

#### Additional Resources

- [HTTP Basic Authentication RFC 7617](https://tools.ietf.org/html/rfc7617)
- [Bitbucket Authentication Documentation](https://developer.atlassian.com/server/bitbucket/how-tos/example-basic-authentication/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

---

## Comparison Table

| Feature | OAuth 2.0 | PAT | OAuth 1.0a | Basic Auth |
|---------|-----------|-----|------------|------------|
| **Security** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Ease of Setup** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Token Refresh** | ✅ Yes | ❌ No (long-lived) | ❌ No | ❌ No |
| **Revocable** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **HTTPS Required** | Recommended | Recommended | Recommended | **MANDATORY** |
| **Bitbucket DC Version** | 8.0+ | 8.14+ | All versions | All versions |
| **Browser Interaction** | Initial only | No | Initial only | No |
| **Production Ready** | ✅ Yes | ✅ Yes | ⚠️ Legacy only | ❌ **NO** |

---

## Secure Credential Storage

The MCP server implements secure credential storage using OS-native keychains (Story 3.5). This ensures that your authentication credentials are stored safely and never exposed in plaintext.

### Storage Mechanisms

**Platform-Specific Keychain Integration:**

- **macOS:** Keychain Access
  - Credentials stored in Login Keychain
  - Protected by macOS security framework
  - Accessible via Keychain Access.app (search for "bitbucket-dc-mcp")
  - Requires user authentication to access

- **Windows:** Credential Manager
  - Credentials stored in Windows Credential Vault
  - Protected by Windows security
  - Accessible via Control Panel → Credential Manager
  - Stored as "Generic Credentials" under "bitbucket-dc-mcp"

- **Linux:** Secret Service API
  - Compatible with GNOME Keyring, KDE Wallet, etc.
  - Requires `libsecret` installed
  - Protected by desktop environment security
  - Accessible via Seahorse (GNOME) or KWalletManager (KDE)

**Encrypted File Fallback:**

If the OS keychain is unavailable (e.g., Linux without libsecret, headless servers), the server automatically falls back to encrypted file storage:

- Location: `~/.bitbucket-mcp/credentials.enc`
- Encryption: AES-256-GCM with machine-specific keys
- Key Derivation: PBKDF2 (100,000 iterations) from machine ID
- File Permissions: 0600 (owner read/write only)
- Machine ID Sources:
  - macOS: Hardware UUID
  - Windows: Machine GUID
  - Linux: `/etc/machine-id` or `/var/lib/dbus/machine-id`
  - Fallback: Hash of hostname + username

### What Gets Stored

Different authentication methods store different credential data:

```typescript
// OAuth 2.0 credentials
{
  bitbucket_url: "https://bitbucket.example.com",
  auth_method: "oauth2",
  access_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  refresh_token: "def502004a8c...",
  expires_at: "2025-12-31T23:59:59Z"
}

// PAT credentials
{
  bitbucket_url: "https://bitbucket.example.com",
  auth_method: "pat",
  access_token: "NjA3ODk2MDQ5Mjc5OmrXn..."
}

// OAuth 1.0a credentials
{
  bitbucket_url: "https://bitbucket.example.com",
  auth_method: "oauth1",
  oauth_token: "access_token_value",
  oauth_token_secret: "token_secret_value",
  consumer_key: "your-consumer-key",
  consumer_secret: "your-consumer-secret"
}

// Basic Auth credentials
{
  bitbucket_url: "https://bitbucket.example.com",
  auth_method: "basic",
  username: "your-username",
  password: "your-password"
}
```

### Multiple Bitbucket Instances (Credential Profiles)

You can store credentials for multiple Bitbucket instances using credential profiles:

```bash
# Default: uses bitbucket_url as storage key
export BITBUCKET_URL="https://bitbucket1.example.com"
export BITBUCKET_AUTH_METHOD="pat"

# Custom profile for multiple instances
export BITBUCKET_URL="https://bitbucket2.example.com"
export BITBUCKET_AUTH_METHOD="pat"
export BITBUCKET_CREDENTIAL_PROFILE="bitbucket-prod"
```

This allows you to:
- Manage credentials for dev, staging, and production Bitbucket instances
- Switch between different Bitbucket servers without re-authenticating
- Use different auth methods for different environments

### Security Features

**Credentials Protection:**
- ✅ Never stored in plaintext
- ✅ Never logged to console or files
- ✅ Sanitized in error messages and stack traces
- ✅ Protected by OS security (keychain access requires authentication)
- ✅ Encrypted at rest (fallback file uses AES-256-GCM)
- ✅ Machine-specific encryption keys (cannot decrypt on different machine)
- ✅ In-memory caching (reduces keychain access frequency)

**Access Control:**
- OS keychain: Requires user authentication (Touch ID, password, Windows Hello)
- Encrypted file: Bound to specific machine (cannot decrypt elsewhere)
- File permissions: 0600 (owner read/write only on Linux/macOS)

### Verifying Stored Credentials

**macOS - Keychain Access:**
```bash
# Open Keychain Access app
open -a "Keychain Access"
# Search for: bitbucket-dc-mcp
# You'll see entries with your profile names or Bitbucket URLs
```

**Windows - Credential Manager:**
```powershell
# Open Credential Manager
control /name Microsoft.CredentialManager
# Look under "Generic Credentials" for "bitbucket-dc-mcp:*"
```

**Linux - GNOME Keyring (Seahorse):**
```bash
# Install if not present
sudo apt-get install seahorse

# Open Seahorse
seahorse
# Look under "Passwords" → "Login" for "bitbucket-dc-mcp"
```

**Check Fallback File (if keychain unavailable):**
```bash
# List credentials file
ls -la ~/.bitbucket-mcp/credentials.enc

# Check permissions (should be 600)
stat ~/.bitbucket-mcp/credentials.enc

# File content is encrypted - you cannot read tokens directly
cat ~/.bitbucket-mcp/credentials.enc  # Shows encrypted data only
```

### Troubleshooting Credential Storage

**macOS Issues:**

**Problem:** "Keychain access denied"
- **Solution:** Grant permission in System Settings → Privacy & Security → Keychain
- **Alternative:** Delete and recreate keychain entry, re-authenticate

**Problem:** "User interaction required"
- **Solution:** Unlock keychain manually, check "Always allow" when prompted

**Windows Issues:**

**Problem:** "Credential Manager access denied"
- **Solution:** Run as administrator or check Windows security policies
- **Alternative:** Use encrypted file fallback

**Problem:** "Cannot write to Credential Vault"
- **Solution:** Check Windows security settings, ensure user has credential write permissions

**Linux Issues:**

**Problem:** "Secret Service unavailable"
- **Solution:** Install libsecret:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install libsecret-1-0
  
  # Fedora/RHEL
  sudo dnf install libsecret
  
  # Arch
  sudo pacman -S libsecret
  ```
- **Alternative:** Server automatically uses encrypted file fallback

**Problem:** "Keyring daemon not running"
- **Solution:** Start GNOME Keyring:
  ```bash
  gnome-keyring-daemon --start --components=secrets
  ```
- **Alternative:** Server automatically uses encrypted file fallback

**Problem:** "Cannot unlock keyring"
- **Solution:** Set keyring password or use auto-unlock on login
- **Alternative:** Use encrypted file fallback

**Fallback File Issues:**

**Problem:** "Permission denied: ~/.bitbucket-mcp/credentials.enc"
- **Solution:** Check file permissions: `chmod 600 ~/.bitbucket-mcp/credentials.enc`

**Problem:** "Decryption failed"
- **Cause:** Trying to decrypt credentials on a different machine
- **Solution:** Credentials are machine-specific - re-authenticate on new machine

**Problem:** "Encrypted file corrupted"
- **Solution:** Delete file and re-authenticate:
  ```bash
  rm ~/.bitbucket-mcp/credentials.enc
  # Then re-authenticate via MCP server
  ```

### Managing Stored Credentials

**List stored profiles:**
```javascript
// Via AuthManager API
const profiles = await authManager.listStoredCredentials();
console.log(profiles); // ['https://bitbucket1.example.com', 'bitbucket-prod', ...]
```

**Delete credentials (logout):**
```javascript
// Via AuthManager API
const deleted = await authManager.logout();
console.log(deleted ? 'Logged out' : 'No credentials found');
```

**Check if credentials exist:**
```javascript
// Via CredentialStorage API
const credentials = await storage.load('https://bitbucket.example.com');
if (credentials) {
  console.log('Credentials found for', credentials.bitbucket_url);
} else {
  console.log('No credentials found - please authenticate');
}
```

### Migration from Plaintext Config

If you previously stored credentials in config files (`.env`, `config.yaml`), they should be migrated:

1. **Remove plaintext credentials from config files**
2. **Re-authenticate to store in keychain:**
   ```bash
   # The server will prompt for authentication
   # Credentials will be stored securely
   ```
3. **Delete old config files with credentials**
4. **Verify keychain storage** using platform tools above

---

## Troubleshooting

This section provides comprehensive troubleshooting guidance for authentication issues, including diagnostics commands, common errors, and frequently asked questions.

**For comprehensive troubleshooting, see [Troubleshooting Guide](troubleshooting.md)**

Specific authentication issues are also covered in:
- [Authentication Fails](troubleshooting.md#authentication-fails) - Complete guide for 401/403 errors
- [Error Code Reference](troubleshooting.md#error-code-reference) - All error codes with solutions
- [Diagnostics Commands](troubleshooting.md#diagnostic-commands) - Tools to test connectivity

### Quick Diagnostics Commands

Use these commands to diagnose authentication problems:

**Test Connection:**
```bash
# Verify connectivity and authentication
bitbucket-mcp test-connection

# Expected output (success):
# ✅ Connected to Bitbucket: https://bitbucket.example.com
# ✅ Authenticated as: john.doe@example.com
# ✅ Token status: Valid
```

**Validate Configuration:**
```bash
# Validate config file syntax and required fields
bitbucket-mcp config validate

# Expected output:
# ✅ Configuration valid
# ✅ All required fields present
# ✅ Bitbucket URL reachable
# ✅ Auth method supported
```

**Check Stored Credentials:**
```bash
# List stored credential profiles
npx bitbucket-mcp-server auth list

# Output:
# Stored credentials:
# - https://bitbucket.example.com (oauth2, expires: 2025-10-19)
# - bitbucket-prod (pat, expires: 2026-01-15)
# - https://bitbucket-dev.example.com (basic, no expiration)
```

**Delete Stored Credentials:**
```bash
# Remove credentials (force re-authentication)
npx bitbucket-mcp-server auth delete

# Or delete specific profile:
npx bitbucket-mcp-server auth delete --profile "bitbucket-prod"
```

**Enable Debug Logging:**
```bash
# Run with debug logging for troubleshooting
export LOG_LEVEL=debug
npx bitbucket-mcp-server start

# Or for single command:
LOG_LEVEL=debug npx bitbucket-mcp-server test-connection
```

**Check Bitbucket Server Info:**
```bash
# Verify Bitbucket version and capabilities
curl -s https://bitbucket.example.com/rest/api/2/serverInfo | jq '.'

# Output includes:
# - version: "8.20.0" (check auth method compatibility)
# - serverTitle: "Company Bitbucket"
# - baseUrl: "https://bitbucket.example.com"
```

**Test Network Connectivity:**
```bash
# Verify Bitbucket server is reachable
curl -I https://bitbucket.example.com

# Expected: HTTP/2 200 (or 302 redirect)
# If fails: Check firewall, proxy, DNS
```

### Common Error Categories

#### 401 Unauthorized Errors

**Symptom:**
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**Common Causes:**
1. **Invalid credentials** - Wrong username/password, expired token
2. **Token not found** - Credentials not stored in keychain
3. **OAuth token expired** - Access token expired (OAuth 2.0 should auto-refresh)
4. **Wrong auth method** - Configuration doesn't match Bitbucket setup

**Diagnostics:**
```bash
# Check auth status
npx bitbucket-mcp-server auth info

# Test connection
npx bitbucket-mcp-server test-connection

# Enable debug logging
LOG_LEVEL=debug npx bitbucket-mcp-server start
```

**Solutions by Auth Method:**

**OAuth 2.0:**
- Verify access token not expired: `npx bitbucket-mcp-server auth info`
- Force token refresh: `npx bitbucket-mcp-server auth refresh`
- Re-authenticate: `npx bitbucket-mcp-server auth delete && npx bitbucket-mcp-server start`

**PAT:**
- Check token not expired in Bitbucket UI (Profile → Personal Access Tokens)
- Regenerate token and update configuration
- Verify token copied completely (no truncation)

**OAuth 1.0a:**
- Verify signature method matches (RSA-SHA1 vs HMAC-SHA1)
- Check consumer key matches Application Link
- Synchronize system clock: `sudo ntpdate pool.ntp.org`

**Basic Auth:**
- Test credentials in Bitbucket UI (log in manually)
- Check for typos in username/password
- Verify account not locked (too many failed attempts)

#### 403 Forbidden Errors

**Symptom:**
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "User lacks required permissions"
}
```

**Common Causes:**
1. **Insufficient Bitbucket permissions** - User can't perform requested operation
2. **Project-level restrictions** - User doesn't have access to specific project
3. **Token scope limitations** - PAT/OAuth token doesn't include required scopes
4. **CAPTCHA locked** - Too many failed logins (Basic Auth)

**Diagnostics:**
```bash
# Check authenticated user
npx bitbucket-mcp-server auth info

# Test specific permission
# (Try browsing a project via Bitbucket UI to verify access)

# Check token scopes (OAuth 2.0)
# Review Application Link configuration in Bitbucket admin
```

**Solutions:**
1. **Verify Bitbucket Permissions:**
   - Log in to Bitbucket UI as the same user
   - Navigate to desired project
   - Check if operation works in UI
   - Contact Bitbucket admin to grant permissions

2. **Check Project Access:**
   - Verify user added to project
   - Check project permissions scheme
   - Verify role includes required permissions

3. **Token Scopes (OAuth/PAT):**
   - OAuth 2.0: Verify application includes required scopes (`read:bitbucket-work`, `write:bitbucket-work`)
   - PAT: Some Bitbucket versions support scoped PATs - check token configuration

4. **CAPTCHA Unlock (Basic Auth):**
   - Log in to Bitbucket UI manually
   - Complete CAPTCHA challenge
   - Account will unlock automatically

#### Network and Connectivity Errors

**Symptoms:**
```
Error: connect ETIMEDOUT
Error: connect ECONNREFUSED
Error: getaddrinfo ENOTFOUND
```

**Common Causes:**
1. **Firewall blocking** - Corporate firewall blocks MCP server → Bitbucket
2. **Proxy required** - Network requires proxy configuration
3. **DNS resolution failure** - Bitbucket hostname can't be resolved
4. **Bitbucket server down** - Bitbucket instance not running
5. **SSL/TLS issues** - Certificate validation failures

**Diagnostics:**
```bash
# Test basic connectivity
ping bitbucket.example.com

# Test HTTPS access
curl -I https://bitbucket.example.com

# Test with proxy (if required)
https_proxy=http://proxy.company.com:8080 curl -I https://bitbucket.example.com

# Check DNS resolution
nslookup bitbucket.example.com

# Test SSL certificate
openssl s_client -connect bitbucket.example.com:443 -showcerts
```

**Solutions:**

**Firewall Issues:**
```bash
# Configure firewall to allow outbound HTTPS (port 443)
# Contact IT/network team for corporate firewalls
```

**Proxy Configuration:**
```bash
# Set proxy environment variables
export https_proxy=http://proxy.company.com:8080
export http_proxy=http://proxy.company.com:8080
export no_proxy=localhost,127.0.0.1

# Or in config file:
# proxy:
#   https: "http://proxy.company.com:8080"
#   http: "http://proxy.company.com:8080"
```

**DNS Issues:**
```bash
# Use IP address if DNS fails
export BITBUCKET_URL="https://192.168.1.100"

# Or add to /etc/hosts
echo "192.168.1.100 bitbucket.example.com" | sudo tee -a /etc/hosts
```

**SSL Certificate Issues:**
```bash
# View certificate details
openssl s_client -connect bitbucket.example.com:443 -showcerts

# For self-signed certificates (development only):
export NODE_TLS_REJECT_UNAUTHORIZED=0  # ⚠️ Insecure - dev only
```

#### Invalid Redirect URI Errors (OAuth)

**Symptom:**
```json
{
  "error": "invalid_request",
  "error_description": "redirect_uri does not match"
}
```

**Common Causes:**
- Redirect URI mismatch between configuration and Bitbucket Application Link
- Protocol mismatch (http vs https)
- Port mismatch (:8080 vs :3000)
- Trailing slash mismatch

**Diagnostics:**
```bash
# Check current configuration
npx bitbucket-mcp-server config validate

# Compare with Bitbucket Application Link settings:
# 1. Go to Bitbucket → Manage apps → Application Links
# 2. View your application
# 3. Check configured Redirect URI
```

**Solutions:**
```yaml
# Ensure EXACT match (case-sensitive)
# Bitbucket has: http://localhost:8080/callback
# Config must be:
oauth2:
  redirect_uri: "http://localhost:8080/callback"  # Exact match

# Common mistakes to avoid:
# ❌ https://localhost:8080/callback  (http vs https)
# ❌ http://localhost:3000/callback   (wrong port)
# ❌ http://localhost:8080/callback/  (trailing slash)
# ❌ http://localhost:8080            (missing /callback)
```

### OAuth 2.0 Specific Issues

**See detailed OAuth 2.0 errors in:** [OAuth 2.0 Common Errors](#common-oauth-20-errors)

**Additional Issues:**

**Problem:** "Port 8080 is already in use"
- **Solution:** Configure different callback port:
  ```yaml
  oauth2:
    callback_port: 3000
    redirect_uri: "http://localhost:3000/callback"
  ```
- **Or kill process using port:**
  ```bash
  # Find process on port 8080
  lsof -ti:8080
  
  # Kill process
  kill -9 $(lsof -ti:8080)
  ```

**Problem:** "Authorization code expired"
- **Solution:** Increase timeout (default: 5 minutes):
  ```yaml
  oauth2:
    timeout_minutes: 10
  ```
- **Root cause:** User took too long to authorize

**Problem:** "Browser didn't open automatically"
- **Solution:** Manually open authorization URL:
  ```bash
  # Server prints URL if browser doesn't open
  # Copy URL and paste in browser manually
  ```

### PAT Specific Issues

**See detailed PAT errors in:** [PAT Common Errors](#common-pat-errors)

**Additional Issues:**

**Problem:** "Token has no required permissions"
- **Solution:** Create new PAT with correct scopes (if scoped PATs enabled)
- **Check:** Bitbucket version supports PAT (8.14+)

**Problem:** "Token expired"
- **Solution:** Generate new PAT and update configuration
- **Prevention:** Set expiration reminders (7-30 days before)

### OAuth 1.0a Specific Issues

**See detailed OAuth 1.0a errors in:** [OAuth 1.0a Common Errors](#common-oauth-10a-errors)

**Additional Issues:**

**Problem:** "Invalid signature"
- **Root cause:** Usually clock skew or wrong private key
- **Solution:** Synchronize clock + verify key pair matches

**Problem:** "Token not authorized"
- **Solution:** Re-authenticate via three-legged flow
- **Check:** Application Link still exists in Bitbucket

### Basic Auth Specific Issues

**See detailed Basic Auth errors in:** [Basic Auth Common Errors](#common-basic-auth-errors)

**Additional Issues:**

**Problem:** "401 Unauthorized"
- **Solution:** Verify credentials by logging into Bitbucket UI
- **Common mistake:** Extra spaces in username/password

**Problem:** "SECURITY RISK: Basic auth over HTTP"
- **Solution:** Change URL to HTTPS immediately:
  ```bash
  export BITBUCKET_URL="https://bitbucket.example.com"  # Not http://
  ```

### Diagnostics Checklist

When troubleshooting authentication, work through this checklist:

- [ ] **1. Verify Bitbucket is reachable:**
  ```bash
  curl -I https://bitbucket.example.com
  # Expected: HTTP 200 or 302
  ```

- [ ] **2. Check Bitbucket version supports auth method:**
  ```bash
  curl -s https://bitbucket.example.com/rest/api/2/serverInfo | jq '.version'
  # OAuth 2.0: 8.0+
  # PAT: 8.14+
  # OAuth 1.0a: 7.x+
  # Basic: All versions
  ```

- [ ] **3. Validate configuration:**
  ```bash
  npx bitbucket-mcp-server config validate
  ```

- [ ] **4. Test credentials manually:**
  - OAuth 2.0: Verify Application Link exists in Bitbucket admin
  - PAT: Check token exists in Profile → Personal Access Tokens
  - OAuth 1.0a: Verify Application Link and private key
  - Basic: Log in to Bitbucket UI with username/password

- [ ] **5. Check stored credentials:**
  ```bash
  npx bitbucket-mcp-server auth list
  ```

- [ ] **6. Enable debug logging:**
  ```bash
  LOG_LEVEL=debug npx bitbucket-mcp-server test-connection
  ```

- [ ] **7. Check system clock (OAuth):**
  ```bash
  date  # Should match actual UTC time
  ```

- [ ] **8. Test network connectivity:**
  - Ping Bitbucket server
  - Check firewall rules
  - Verify proxy configuration (if applicable)

- [ ] **9. Review Bitbucket audit logs:**
  - Go to Bitbucket → Settings → System → Audit Log
  - Look for failed authentication attempts
  - Check for account lockouts

- [ ] **10. Try different auth method:**
  - If OAuth fails, try PAT (easier to debug)
  - If PAT fails, try Basic Auth temporarily (to isolate issue)

### Frequently Asked Questions (FAQ)

#### General Authentication

**Q: Which authentication method should I use?**
A: 
- **Production:** OAuth 2.0 (best security, token refresh)
- **Development/CI/CD:** PAT (easiest, no browser interaction)
- **Legacy Bitbucket < 8.0:** OAuth 1.0a
- **Quick testing only:** Basic Auth (with HTTPS)

See [Quick Decision Guide](#quick-decision-guide) for detailed recommendations.

---

**Q: Can I use different auth methods for different environments?**
A: Yes! Use credential profiles:
```bash
# Development (PAT)
export BITBUCKET_URL="https://bitbucket-dev.company.com"
export BITBUCKET_AUTH_METHOD="pat"
export BITBUCKET_CREDENTIAL_PROFILE="dev"

# Production (OAuth 2.0)
export BITBUCKET_URL="https://bitbucket.company.com"
export BITBUCKET_AUTH_METHOD="oauth2"
export BITBUCKET_CREDENTIAL_PROFILE="prod"
```

---

**Q: Where are my credentials stored?**
A: Credentials are stored securely in OS-native keychains:
- **macOS:** Keychain Access
- **Windows:** Credential Manager
- **Linux:** GNOME Keyring / KDE Wallet / libsecret
- **Fallback:** Encrypted file (`~/.bitbucket-mcp/credentials.enc`)

See [Secure Credential Storage](#secure-credential-storage) for details.

---

**Q: How do I switch from one auth method to another?**
A:
1. Delete existing credentials: `npx bitbucket-mcp-server auth delete`
2. Update configuration to new auth method
3. Restart server (will prompt for new authentication)

See [Migration Guide](#migration-guide) for detailed steps.

---

**Q: Do I need to re-authenticate every time I start the server?**
A: No! Credentials are stored securely in OS keychain and reused automatically. You only need to authenticate:
- First time setup
- After deleting credentials
- When token expires (OAuth 2.0 auto-refreshes)
- After credential revocation

---

**Q: Can I use the same credentials for multiple MCP server instances?**
A: Yes, if they connect to the same Bitbucket instance. Credentials are stored by Bitbucket URL (or profile name). Multiple servers can share credentials via OS keychain.

---

#### OAuth 2.0

**Q: How long do OAuth 2.0 access tokens last?**
A: Typically 1 hour, but Bitbucket admin can configure this. Don't worry - the MCP server automatically refreshes tokens using the refresh token (no user interaction needed).

---

**Q: What happens if my refresh token expires?**
A: Refresh tokens typically last 90 days to 1 year. If expired, you'll need to re-authorize via browser (one-time). The server will automatically open the authorization page.

---

**Q: Can I use OAuth 2.0 without a browser (headless server)?**
A: Not directly. OAuth 2.0 requires user authorization via browser. For headless environments, use PAT instead (no browser needed).

**Alternative:** Authorize on a machine with browser, then copy credentials to headless server:
```bash
# Machine with browser:
npx bitbucket-mcp-server setup  # Authorize via browser
npx bitbucket-mcp-server auth export > credentials.json

# Headless server:
npx bitbucket-mcp-server auth import < credentials.json
```

---

**Q: How do I revoke OAuth 2.0 access?**
A: Go to Bitbucket → Profile → OAuth Applications → Find your application → Click "Revoke". The MCP server will need to re-authorize.

---

#### Personal Access Tokens

**Q: How long do PAT tokens last?**
A: Depends on expiration setting when created:
- No expiration (not recommended for security)
- 90 days (recommended for development)
- 1 year (recommended for production with rotation process)

You set expiration when creating the token in Bitbucket UI.

---

**Q: Can I see my PAT token again after creation?**
A: No! Bitbucket shows tokens only once at creation. If lost, you must:
1. Revoke old token
2. Create new token
3. Update configuration

**Prevention:** Store tokens securely immediately after creation (password manager, secrets vault).

---

**Q: Can I use one PAT for multiple projects?**
A: Yes! PAT tokens grant access to all resources the user can access (subject to user's Bitbucket permissions). Unlike OAuth, PATs aren't project-scoped.

---

**Q: How do I rotate PAT tokens?**
A:
1. Create new token (keep old one active)
2. Update configuration with new token
3. Test new token works
4. Revoke old token

See [PAT Token Rotation](#renewingrotating-tokens) for detailed steps.

---

#### OAuth 1.0a

**Q: Should I use OAuth 1.0a for a new project?**
A: No! OAuth 1.0a is deprecated. Use OAuth 2.0 (Bitbucket 8.0+) or PAT (Bitbucket 8.14+) instead. Only use OAuth 1.0a for legacy Bitbucket < 8.0.

---

**Q: Why is OAuth 1.0a so complex?**
A: OAuth 1.0a was designed before OAuth 2.0 simplified the flow. It requires:
- RSA key pair generation
- Request signature generation (every request)
- Complex three-legged authorization flow

OAuth 2.0 simplified all of this with token-based auth.

---

**Q: Can I use HMAC-SHA1 instead of RSA-SHA1?**
A: Yes, but RSA-SHA1 is more secure. HMAC-SHA1 requires sharing a secret with Bitbucket (like a password), while RSA-SHA1 uses public-key cryptography (Bitbucket only stores your public key).

---

#### Basic Auth

**Q: Why is Basic Auth considered insecure?**
A: 
- Credentials are only base64-encoded (not encrypted - trivially reversible)
- Username and password sent with EVERY request (high exposure)
- No token mechanism (can't revoke without changing password)
- Full account access (can't limit scope)

**Mitigation:** HTTPS encrypts transport (this is why HTTPS is mandatory for Basic Auth).

---

**Q: Can I use Basic Auth in production if I use HTTPS?**
A: Technically yes, but strongly discouraged. Problems:
- Can't revoke access without changing password
- Shared credentials (no individual tokens)
- Full account access (no scope limitations)
- Password reuse risks

**Recommendation:** Use OAuth 2.0 or PAT for production.

---

**Q: My Bitbucket instance doesn't support OAuth or PAT. What should I use?**
A: If Bitbucket < 8.0 (no OAuth 2.0 or PAT):
1. **Best:** OAuth 1.0a (more secure than Basic)
2. **Acceptable:** Basic Auth with HTTPS (only if OAuth 1.0a unavailable)
3. **Upgrade:** Consider upgrading Bitbucket to 8.14+ for PAT support

---

#### Credential Management

**Q: How do I back up my credentials?**
A:
```bash
# Export credentials to encrypted backup
npx bitbucket-mcp-server auth export --encrypt > bitbucket-creds-backup.enc

# Restore from backup
npx bitbucket-mcp-server auth import --decrypt < bitbucket-creds-backup.enc
```

---

**Q: Can I share credentials with my team?**
A: 
- **OAuth 2.0:** No - user-specific authorization
- **PAT:** No - create individual tokens per team member
- **OAuth 1.0a:** No - user-specific
- **Basic Auth:** Technically yes (shared password), but not recommended

**Best practice:** Each team member should have their own credentials (individual Bitbucket accounts + individual PATs/OAuth tokens).

---

**Q: What happens if I delete my OS keychain entry manually?**
A: The MCP server will prompt for re-authentication on next startup. No data loss - just need to re-authorize.

---

**Q: My keychain password changed. Will I lose credentials?**
A: No, keychain entries remain accessible after keychain password change (on macOS). You may need to re-authorize keychain access for the MCP server app.

---

#### Troubleshooting

**Q: I'm getting "401 Unauthorized" but my credentials are correct. What's wrong?**
A: Common causes:
1. Token expired (check with `npx bitbucket-mcp-server auth info`)
2. Credentials not stored (deleted from keychain)
3. Wrong Bitbucket URL (connecting to different instance)
4. Clock skew (for OAuth - synchronize clock)

See [401 Unauthorized Errors](#401-unauthorized-errors) for detailed troubleshooting.

---

**Q: How do I enable debug logging to diagnose issues?**
A:
```bash
export LOG_LEVEL=debug
npx bitbucket-mcp-server start

# Or for single command:
LOG_LEVEL=debug npx bitbucket-mcp-server test-connection
```

Logs show detailed authentication flow, API calls, and error details.

---

**Q: Authentication works in Bitbucket UI but fails in MCP server. Why?**
A: Different authentication mechanisms:
- **Bitbucket UI:** Uses browser session cookies
- **MCP Server:** Uses configured auth method (OAuth/PAT/etc.)

**Check:**
1. Verify MCP server using same user account
2. Check user has API access (not just UI access)
3. Verify PAT/OAuth token has required permissions

---

**Q: Where can I find authentication logs for debugging?**
A:
```bash
# Server logs location
~/.bitbucket-mcp/logs/server.log

# Tail logs in real-time
tail -f ~/.bitbucket-mcp/logs/server.log

# Search for auth errors
grep -i "auth" ~/.bitbucket-mcp/logs/server.log
grep -i "401\|403" ~/.bitbucket-mcp/logs/server.log
```

---

**Q: I'm behind a corporate proxy. How do I configure it?**
A:
```bash
# Set proxy environment variables
export https_proxy=http://proxy.company.com:8080
export http_proxy=http://proxy.company.com:8080
export no_proxy=localhost,127.0.0.1

# Or in config file:
proxy:
  https: "http://proxy.company.com:8080"
  http: "http://proxy.company.com:8080"
```

For authenticated proxies:
```bash
export https_proxy=http://username:password@proxy.company.com:8080
```

---

---

## Migration Guide

### Migrating from Basic Auth to OAuth 2.0

1. Set up OAuth 2.0 application in Bitbucket (see setup above)
2. Update configuration to use `auth_method: oauth2`
3. Delete old Basic Auth credentials: `mcp-server auth delete`
4. Authenticate with OAuth 2.0: `mcp-server auth login`

### Migrating from OAuth 1.0a to OAuth 2.0

1. Set up OAuth 2.0 application in Bitbucket (see setup above)
2. Update configuration to use `auth_method: oauth2`
3. Delete old OAuth 1.0a credentials: `mcp-server auth delete`
4. Authenticate with OAuth 2.0: `mcp-server auth login`

### Migrating from Basic Auth to PAT

1. Generate PAT in Bitbucket (see setup above)
2. Update configuration to use `auth_method: pat`
3. Set PAT token in environment or config
4. Delete old Basic Auth credentials: `mcp-server auth delete`

---

## Best Practices

This section provides comprehensive best practices for authentication security, credential management, and operational excellence.

### Authentication Method Selection Guide

**Choose the right authentication method for your use case:**

#### Production Environments

**Recommended: OAuth 2.0 with PKCE**
- ✅ Best security (PKCE protection, token refresh)
- ✅ User-specific authorization (individual accountability)
- ✅ Token refresh (no re-authentication for long-running processes)
- ✅ Revocable without password change
- ⚠️ Requires browser for initial authorization
- ⚠️ Bitbucket 8.0+ required

**Alternative: Personal Access Token (PAT)**
- ✅ Easy to set up (no browser interaction)
- ✅ Good security (token-based, revocable)
- ✅ Suitable for automated processes (CI/CD)
- ⚠️ No token refresh (long-lived tokens)
- ⚠️ Requires manual rotation
- ⚠️ Bitbucket 8.14+ required

**Decision Criteria:**
- **User-facing applications:** OAuth 2.0 (user authorization required)
- **Automated processes:** PAT (no browser interaction)
- **Shared servers:** OAuth 2.0 (user-specific tokens)
- **CI/CD pipelines:** PAT (easier automation)

#### Development & Testing Environments

**Recommended: Personal Access Token (PAT)**
- ✅ Fastest setup (5 minutes)
- ✅ No browser interaction needed
- ✅ Easy to share across dev tools
- ✅ Simple revocation/rotation

**Alternative: OAuth 2.0**
- ✅ Practice production auth method
- ✅ Test OAuth flow thoroughly
- ⚠️ Requires browser for authorization

**Not Recommended: Basic Auth**
- ⚠️ Only for quick local testing
- ⚠️ Must use HTTPS even in dev
- ⚠️ Migrate to PAT/OAuth before committing code

**Decision Criteria:**
- **Quick prototyping:** PAT
- **Production-like environment:** OAuth 2.0
- **Temporary testing only:** Basic Auth (HTTPS mandatory)

#### Legacy Bitbucket Versions

**Bitbucket < 8.0 (No OAuth 2.0 or PAT):**
- **Recommended:** OAuth 1.0a (more secure than Basic Auth)
- **Alternative:** Basic Auth with HTTPS (quick testing only)
- **Best Long-term:** Upgrade Bitbucket to 8.14+ for PAT support

**Bitbucket 8.0-8.13 (OAuth 2.0 available, no PAT):**
- **Recommended:** OAuth 2.0 (best security)
- **Alternative:** OAuth 1.0a (if OAuth 2.0 setup complex)
- **Consider:** Upgrade to 8.14+ for PAT support

### Security Considerations

#### Token Rotation

**Personal Access Tokens:**
- **Rotation Schedule:** Every 90 days (minimum)
- **Best Practice:** Every 30-60 days for high-security environments
- **Process:**
  1. Create new token 7 days before old token expires
  2. Update configuration with new token
  3. Test new token works in dev environment
  4. Deploy new token to production
  5. Wait 24-48 hours (ensure no rollback needed)
  6. Revoke old token

**Rotation Automation:**
```bash
#!/bin/bash
# pat-rotation-reminder.sh
# Add to cron: 0 9 * * 1 (weekly Monday 9am)

TOKEN_CREATED_DATE="2025-10-18"  # Update when rotating
DAYS_SINCE_CREATION=$(( ($(date +%s) - $(date -d "$TOKEN_CREATED_DATE" +%s)) / 86400 ))

if [ $DAYS_SINCE_CREATION -gt 60 ]; then
  echo "⚠️ WARNING: PAT token is $DAYS_SINCE_CREATION days old"
  echo "🔄 Rotate token soon (recommended: every 90 days)"
  echo "📖 See: https://your-docs/authentication.md#token-rotation"
fi
```

**OAuth 2.0 Tokens:**
- **Access Tokens:** Auto-refresh (managed by server, no action needed)
- **Refresh Tokens:** Typically valid 90 days to 1 year
- **Monitor Expiration:** Set up alerts 30 days before refresh token expiry
- **Renewal:** Requires re-authorization via browser (one-time)

**OAuth 1.0a Tokens:**
- **Rotation:** No auto-refresh (re-authorize manually)
- **Schedule:** Every 180 days (recommended)
- **Process:** Delete old credentials, re-authenticate via three-legged flow

#### Least Privilege Principle

**Grant Minimum Required Permissions:**

**For Bitbucket Permissions:**
- ✅ Read-only operations: `BROWSE_PROJECTS`, `VIEW_ISSUES`
- ✅ Write operations: Add `CREATE_ISSUES`, `EDIT_ISSUES`, `ADD_COMMENTS`
- ❌ Avoid: Global admin permissions (unless absolutely required)

**For OAuth 2.0 Scopes:**
- ✅ Minimal scopes: `read:bitbucket-user`, `read:bitbucket-work`
- ✅ Write operations: Add `write:bitbucket-work`
- ✅ Admin operations: Add specific admin scopes (only if needed)
- ❌ Avoid: Requesting all scopes (`read:bitbucket-user read:bitbucket-work write:bitbucket-work admin:bitbucket-admin`)

**For PAT Tokens (if scoped):**
- ✅ Create separate tokens for different purposes
  - Read-only token for reporting/analytics
  - Read-write token for automation
- ✅ Use most restrictive scope possible
- ❌ Avoid: Single "super token" with all permissions

**Team Access:**
- ✅ Individual tokens per team member (traceable)
- ✅ Service accounts for automation (with restricted permissions)
- ❌ Shared credentials between team members (no accountability)

#### Secure Credential Storage

**Environment Variables:**
```bash
# ✅ Good: Use environment variables
export BITBUCKET_PAT_TOKEN="your-token-here"

# ✅ Better: Load from secrets file
export BITBUCKET_PAT_TOKEN=$(cat /secure/secrets/bitbucket-pat)

# ✅ Best: Use secrets management service
export BITBUCKET_PAT_TOKEN=$(aws secretsmanager get-secret-value \
  --secret-id bitbucket-pat --query SecretString --output text)
```

**Configuration Files:**
```yaml
# ❌ Bad: Hardcoded credentials in config
bitbucket_url: https://bitbucket.example.com
auth_method: pat
pat:
  token: "NjA3ODk2MDQ5Mjc5OmrXn..."  # DON'T DO THIS

# ✅ Good: Reference environment variables
bitbucket_url: https://bitbucket.example.com
auth_method: pat
pat:
  token: "${BITBUCKET_PAT_TOKEN}"  # Loaded from environment

# ✅ Better: Use OS keychain (automatic with this MCP server)
# No credentials in config file at all
bitbucket_url: https://bitbucket.example.com
auth_method: pat
# Token loaded from OS keychain automatically
```

**Secrets Management Services:**
- **AWS:** AWS Secrets Manager, AWS Systems Manager Parameter Store
- **Azure:** Azure Key Vault
- **Google Cloud:** Google Secret Manager
- **HashiCorp:** Vault
- **Kubernetes:** Kubernetes Secrets

**OS Keychain:**
- ✅ Automatic with this MCP server (no configuration needed)
- ✅ Platform-native encryption (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- ✅ User authentication required for access (Touch ID, password, Windows Hello)
- ✅ Machine-specific (credentials can't be decrypted on different machine)

### Credential Lifecycle Management

#### Creation

**Best Practices:**
1. **Descriptive Names:** Include purpose and environment
   - ✅ `MCP Server - Production`, `MCP Server - CI/CD`
   - ❌ `Token1`, `test`, `my-token`

2. **Set Expiration:** Always set expiration dates
   - **Development:** 90 days (frequent rotation)
   - **Production:** 1 year maximum (with rotation process)
   - **CI/CD:** 180 days (balance between security and maintenance)

3. **Document Ownership:**
   - Record token owner (who created it)
   - Record purpose (what it's used for)
   - Record expiration date (when to rotate)

4. **Secure Initial Storage:**
   - Copy token to password manager immediately
   - Don't email tokens (use secure sharing tools)
   - Don't store in plaintext files

#### Rotation

**Rotation Checklist:**
- [ ] Create new token/credentials
- [ ] Test new credentials in development environment
- [ ] Update configuration with new credentials
- [ ] Deploy to production (or update environment variables)
- [ ] Monitor for authentication errors (24-48 hours)
- [ ] Revoke old credentials (after verification period)
- [ ] Update documentation (new expiration date, creation date)
- [ ] Set reminder for next rotation

**Rotation Frequency:**
| Environment | Recommended Frequency | Maximum Frequency |
|-------------|----------------------|-------------------|
| **Development** | 60 days | 90 days |
| **Staging** | 90 days | 180 days |
| **Production** | 90 days | 365 days |
| **CI/CD** | 90 days | 180 days |
| **High Security** | 30 days | 60 days |

#### Revocation

**When to Revoke:**
- ✅ Token no longer needed (project ended, tool decommissioned)
- ✅ Suspected compromise (token leaked, logged, exposed)
- ✅ Team member leaving (revoke their personal tokens)
- ✅ After rotation (revoke old token after new one verified)
- ✅ Security incident (revoke all tokens, re-issue)

**Revocation Process:**

**OAuth 2.0:**
1. Go to Bitbucket → Profile → OAuth Applications
2. Find application → Click "Revoke"
3. MCP server will require re-authorization on next start

**PAT:**
1. Go to Bitbucket → Profile → Personal Access Tokens
2. Find token → Click "Revoke" or "Delete"
3. Update MCP server configuration with new token

**OAuth 1.0a:**
1. Go to Bitbucket → Admin → Application Links
2. Find application → Delete or disable
3. MCP server will require re-authorization

**Basic Auth:**
1. Change user password in Bitbucket
2. Update MCP server configuration with new password

**Emergency Revocation:**
```bash
# If token compromised, revoke immediately via Bitbucket UI
# Then force server to re-authenticate:
npx bitbucket-mcp-server auth delete
npx bitbucket-mcp-server start  # Will prompt for new authentication
```

### Monitoring and Auditing

#### Authentication Events to Monitor

**Log these events:**
- ✅ Successful authentications
- ✅ Failed authentication attempts
- ✅ Token refresh events (OAuth 2.0)
- ✅ Token expiration warnings
- ✅ Credential storage/retrieval operations
- ✅ Auth method changes
- ✅ Unusual access patterns (geographic location, time of day)

**Example Monitoring Setup:**
```bash
# Monitor authentication failures
tail -f ~/.bitbucket-mcp/logs/server.log | grep "AuthenticationError"

# Alert on repeated failures (possible attack)
tail -f ~/.bitbucket-mcp/logs/server.log | \
  grep "AuthenticationError" | \
  awk '{count++} count>5 {system("notify-send \"Auth Alert\" \"5+ auth failures\"")}'

# Track token expiration warnings
grep -i "token.*expir" ~/.bitbucket-mcp/logs/server.log
```

#### Bitbucket Audit Logs

**Review Regularly:**
1. Go to Bitbucket → Settings → System → Audit Log
2. Filter by:
   - Authentication events
   - API access (look for your PAT/OAuth app)
   - Failed login attempts
   - Permission changes

**What to Look For:**
- ⚠️ Failed authentication attempts from unknown IPs
- ⚠️ Successful authentications at unusual times
- ⚠️ Geographic anomalies (login from unexpected location)
- ⚠️ Excessive API calls (possible abuse)
- ⚠️ Permission escalation attempts

**Set Up Alerts:**
```yaml
# Example alert configuration (pseudo-code)
alerts:
  - name: "Failed Auth Attempts"
    condition: "auth_failures > 5 in 10 minutes"
    action: "notify_security_team"
  
  - name: "Token Near Expiration"
    condition: "token_expires_in < 7 days"
    action: "notify_token_owner"
  
  - name: "Unusual Access Pattern"
    condition: "requests_from_new_country"
    action: "require_reauth"
```

#### Security Metrics to Track

**Authentication Health:**
- Success rate (target: > 99%)
- Average authentication time (target: < 2 seconds)
- Token refresh success rate (OAuth 2.0) (target: 100%)
- Failed authentication rate (target: < 1%)

**Token Health:**
- Number of active tokens
- Average token age (target: < 90 days)
- Tokens nearing expiration (target: rotate before expiration)
- Revoked tokens per month

**Compliance Metrics:**
- % of production systems using OAuth 2.0 or PAT (target: 100%)
- % of tokens rotated on schedule (target: 100%)
- % of credentials stored securely (target: 100%)
- Time to revoke compromised token (target: < 1 hour)

### Production Deployment Best Practices

**Pre-Deployment Checklist:**
- [ ] Auth method is OAuth 2.0 or PAT (NOT Basic Auth)
- [ ] HTTPS enabled for Bitbucket connection
- [ ] Credentials stored in secrets management service or OS keychain
- [ ] Token rotation schedule documented and automated
- [ ] Monitoring and alerting configured
- [ ] Backup authentication method available (disaster recovery)
- [ ] Team trained on authentication procedures
- [ ] Incident response plan includes credential compromise scenario

**High Availability Considerations:**
- **Load Balancing:** Ensure all servers have access to credentials (shared keychain or secrets service)
- **Failover:** Backup authentication credentials stored securely
- **Disaster Recovery:** Document credential recovery procedures

**Zero-Downtime Credential Rotation:**
1. Create new credentials
2. Deploy to 50% of servers (blue-green deployment)
3. Monitor for errors (24 hours)
4. Deploy to remaining 50% of servers
5. Revoke old credentials after full deployment

### Development & Testing Best Practices

**Development Environment:**
- ✅ Use PAT for simplicity (no browser interaction)
- ✅ Use separate tokens for dev (don't reuse production)
- ✅ Use HTTPS even in development (practice secure habits)
- ✅ Store credentials in local OS keychain (not in code)
- ❌ Never commit credentials to git (add to .gitignore)
- ❌ Never log credentials (use log redaction)

**Testing Environment:**
- ✅ Use realistic auth method (same as production)
- ✅ Test token expiration and refresh scenarios
- ✅ Test credential rotation procedures
- ✅ Test with production-like permissions (ensure sufficient access)
- ✅ Test authentication failures and recovery

**CI/CD Pipelines:**
- ✅ Use PAT (no browser interaction required)
- ✅ Store tokens in CI/CD secrets (GitHub Secrets, GitLab CI/CD Variables, Jenkins Credentials)
- ✅ Rotate CI/CD tokens regularly (every 180 days)
- ✅ Use separate tokens per pipeline (isolation)
- ✅ Set short expiration for PR/branch pipelines
- ❌ Never print tokens in CI logs (mask sensitive values)

**Local Development Workflow:**
```bash
# .env.example (commit to git - no real values)
BITBUCKET_URL=https://bitbucket-dev.example.com
BITBUCKET_AUTH_METHOD=pat
BITBUCKET_PAT_TOKEN=your-token-here

# .env (add to .gitignore - real values)
BITBUCKET_URL=https://bitbucket-dev.example.com
BITBUCKET_AUTH_METHOD=pat
BITBUCKET_PAT_TOKEN=actual-token-value-here

# .gitignore
.env
.env.local
*.pem
*_key.pem
credentials.json
```

### Security Hardening

**Additional Security Measures:**

1. **IP Whitelisting** (if supported by Bitbucket):
   - Restrict API access to known IP ranges
   - Configure in Bitbucket → Settings → Security

2. **Rate Limiting:**
   - Monitor for excessive API calls
   - Implement client-side rate limiting
   - Alert on unusual patterns

3. **Two-Factor Authentication (2FA):**
   - Enable 2FA for Bitbucket user accounts
   - Required for OAuth 2.0 authorization
   - Adds extra security layer

4. **Credential Redaction in Logs:**
   ```javascript
   // Automatic redaction (built into this MCP server)
   // Redacts: password, token, secret, authorization headers
   logger.info({ token: 'abc123' });  // Logged as: { token: '[REDACTED]' }
   ```

5. **Regular Security Audits:**
   - Review authentication logs monthly
   - Audit active tokens quarterly
   - Penetration testing annually

### Version Control Best Practices

**What to Commit:**
- ✅ Configuration file templates (`.env.example`, `config.yml.example`)
- ✅ Documentation (setup guides, troubleshooting)
- ✅ Scripts (non-sensitive automation)
- ✅ `.gitignore` (excluding credentials)

**What NOT to Commit:**
- ❌ Actual credentials (tokens, passwords, secrets)
- ❌ Private keys (`.pem`, `.key` files)
- ❌ Configuration files with secrets (`.env`, actual `config.yml`)
- ❌ Credential exports or backups

**.gitignore Example:**
```gitignore
# Credentials
.env
.env.local
.env.*.local
*.pem
*_key.pem
*_private_key*
credentials.json
credentials.enc

# OS Keychain exports
keychain-export.*

# Bitbucket MCP Server
.bitbucket-mcp/credentials*
.bitbucket-mcp/*.pem
```

**Preventing Accidental Commits:**
```bash
# Pre-commit hook (.git/hooks/pre-commit)
#!/bin/bash
# Prevent committing files with credentials

if git diff --cached --name-only | grep -E '\.(pem|key)$'; then
  echo "❌ ERROR: Attempting to commit private key files"
  echo "Please remove from staging: git reset HEAD <file>"
  exit 1
fi

if git diff --cached | grep -E 'BITBUCKET.*TOKEN|password.*='; then
  echo "⚠️ WARNING: Possible credentials in commit"
  echo "Please verify no secrets are committed"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
```

### Audit Access and Compliance

**Regular Reviews:**
- **Monthly:** Review active tokens and credentials
- **Quarterly:** Audit user permissions in Bitbucket
- **Annually:** Full security audit of authentication system

**Compliance Requirements:**

**SOC 2 / ISO 27001:**
- ✅ Token rotation every 90 days (documented)
- ✅ Access logs retained for 1 year
- ✅ Credential compromise response plan
- ✅ Regular access reviews (quarterly)

**GDPR:**
- ✅ User-specific authentication (OAuth 2.0)
- ✅ Audit trail of data access
- ✅ Right to revoke access (token revocation)

**HIPAA:**
- ✅ Encryption at rest and in transit (HTTPS + keychain)
- ✅ Access logging and monitoring
- ✅ Unique user identification (no shared credentials)

**Review Checklist:**
- [ ] All active tokens documented (owner, purpose, expiration)
- [ ] No expired tokens still active
- [ ] No shared credentials between users
- [ ] All production systems use OAuth 2.0 or PAT
- [ ] Token rotation schedule followed
- [ ] Authentication logs reviewed for anomalies
- [ ] Bitbucket user permissions appropriate for role
- [ ] Unauthorized access attempts investigated
- [ ] Security incidents documented and resolved

---

## Additional Resources

### Official Bitbucket Documentation

**Authentication Methods:**
- [Bitbucket Data Center OAuth 2.0 Documentation](https://developer.atlassian.com/server/bitbucket/how-tos/example-basic-authentication/)
- [Bitbucket Personal Access Tokens Guide](https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html)
- [Bitbucket OAuth 1.0a Documentation](https://developer.atlassian.com/server/bitbucket/how-tos/example-basic-authentication/)
- [Bitbucket Basic Authentication](https://developer.atlassian.com/server/bitbucket/how-tos/example-basic-authentication/)

**Bitbucket Administration:**
- [Application Links Configuration](https://confluence.atlassian.com/adminjiraserver/configuring-application-links-938846918.html)
- [Bitbucket Security Configuration](https://confluence.atlassian.com/adminjiraserver/security-configuration-overview-938847142.html)
- [Bitbucket Audit Logging](https://confluence.atlassian.com/adminjiraserver/audit-log-938847710.html)

### OAuth and Security Specifications

**OAuth 2.0:**
- [OAuth 2.0 RFC 6749 - Core Specification](https://tools.ietf.org/html/rfc6749)
- [OAuth 2.0 PKCE RFC 7636 - Proof Key for Code Exchange](https://tools.ietf.org/html/rfc7636)
- [OAuth 2.0 Security Best Current Practice](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
- [OAuth 2.0 Threat Model and Security Considerations](https://tools.ietf.org/html/rfc6819)

**OAuth 1.0a:**
- [OAuth 1.0 RFC 5849 - Core Specification](https://tools.ietf.org/html/rfc5849)
- [OAuth 1.0a Security Considerations](https://tools.ietf.org/html/rfc5849#section-4)

**Basic Authentication:**
- [HTTP Basic Authentication RFC 7617](https://tools.ietf.org/html/rfc7617)
- [HTTP Authentication: Basic and Digest Access](https://tools.ietf.org/html/rfc2617)

### Security Best Practices

**General Security:**
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
- [CIS Controls for Authentication](https://www.cisecurity.org/controls)

**Credential Management:**
- [Secrets Management Best Practices](https://www.hashicorp.com/resources/what-is-secret-management)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Token Management Best Practices](https://auth0.com/docs/secure/tokens/token-best-practices)

**Atlassian Security:**
- [Atlassian Security Practices](https://www.atlassian.com/trust/security/security-practices)
- [Bitbucket Security Best Practices](https://confluence.atlassian.com/adminjiraserver/security-best-practices-938847142.html)
- [Atlassian Bug Bounty Program](https://www.atlassian.com/trust/security/bug-bounty)

### Project-Specific Documentation

**MCP Server Architecture:**
- [Authentication Architecture](./internal/architecture/backend-architecture.md#authentication)
- [Security Threat Model](./internal/architecture/security-threat-model.md)
- [Error Handling Strategy](./internal/architecture/error-handling-strategy.md)
- [Monitoring and Observability](./internal/architecture/monitoring-and-observability.md)

**Development Guides:**
- [Coding Standards](./internal/architecture/coding-standards.md)
- [Development Workflow](./internal/architecture/development-workflow.md)
- [Testing Strategy](./internal/architecture/testing-strategy.md)

**User Guides:**
- [Quick Start Guide](../README.md#quick-start)
- [Configuration Reference](./internal/architecture/unified-project-structure.md#core-layer)
- [Troubleshooting Guide](./troubleshooting.md)
- [API Reference](./api-reference.md) *(Coming in Story 4.7)*

### Tools and Libraries

**Credential Storage:**
- [node-keytar](https://github.com/atom/node-keytar) - Node.js native keychain integration
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [HashiCorp Vault](https://www.vaultproject.io/)
- [Azure Key Vault](https://azure.microsoft.com/en-us/services/key-vault/)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager)

**OAuth Libraries:**
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP protocol SDK
- [oauth2-server](https://www.npmjs.com/package/oauth2-server) - OAuth 2.0 server implementation
- [simple-oauth2](https://www.npmjs.com/package/simple-oauth2) - OAuth 2.0 client

**Security Tools:**
- [OpenSSL](https://www.openssl.org/) - Key generation and certificate management
- [git-secrets](https://github.com/awslabs/git-secrets) - Prevent committing secrets
- [gitleaks](https://github.com/zricethezav/gitleaks) - Detect hardcoded secrets
- [truffleHog](https://github.com/trufflesecurity/truffleHog) - Scan git history for secrets

### Community and Support

**Getting Help:**
- [GitHub Issues](https://github.com/your-org/bitbucket-dc-mcp/issues) - Report bugs and request features
- [GitHub Discussions](https://github.com/your-org/bitbucket-dc-mcp/discussions) - Ask questions and share ideas
- [Stack Overflow](https://stackoverflow.com/questions/tagged/bitbucket+mcp) - Community Q&A

**Contributing:**
- [Contributing Guide](../CONTRIBUTING.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)
- [Development Setup](./internal/architecture/development-workflow.md)

**Release Notes:**
- [Changelog](../CHANGELOG.md)
- [Roadmap](./internal/prd/epic-list.md)
- [Known Issues](https://github.com/your-org/bitbucket-dc-mcp/issues)

---

## Document History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-18 | 2.0 | Comprehensive expansion: detailed setup guides, troubleshooting, FAQ, best practices | James (Dev Agent) |
| 2025-10-16 | 1.0 | Initial authentication guide | Development Team |

