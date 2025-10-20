# Cookbook - Practical Examples

This cookbook provides practical code examples for common tasks with the Bitbucket Data Center MCP Server.

## Table of Contents

- [CLI Command Examples](#cli-command-examples)
  - [Setup and Configuration](#setup-and-configuration)
  - [Operation Discovery](#operation-discovery)
  - [Testing and Debugging](#testing-and-debugging)
- [Credential Management](#credential-management)
- [Authentication Examples](#authentication-examples)
- [API Operations](#api-operations)
- [MCP Tool Examples](#mcp-tool-examples)
  - [Issues](#issues)
  - [Users and Projects](#users-and-projects)
  - [Workflows and Sprints](#workflows-and-sprints)
  - [Custom Fields](#custom-fields)
- [Logging and Observability](#logging-and-observability)

---

## CLI Command Examples

The Bitbucket DC MCP Server provides a comprehensive CLI for setup, testing, and operation discovery.

### Setup and Configuration

#### Run Interactive Setup Wizard

```bash
# First-time setup with interactive prompts
bitbucket-dc-mcp setup

# Force reconfiguration (overwrite existing config)
bitbucket-dc-mcp setup --force

# Non-interactive setup using environment variables
BITBUCKET_URL=https://bitbucket.example.com \
BITBUCKET_AUTH_METHOD=pat \
BITBUCKET_TOKEN=your-token \
bitbucket-dc-mcp setup --non-interactive
```

**Expected Output:**
```
🚀 Bitbucket MCP Server Setup Wizard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Bitbucket URL configured: https://bitbucket.example.com
✓ Authentication method: Personal Access Token
✓ Credentials stored securely in system keychain
✓ API version detected: latest (Modern Bitbucket Data Center)
✓ OpenAPI spec downloaded (500 operations)
✓ Embeddings database generated (768-dim vectors)
✓ Connection validated

Setup complete! Start the server with: bitbucket-dc-mcp start
```

#### Manage Configuration

```bash
# Show current configuration
bitbucket-dc-mcp config show

# Validate configuration file
bitbucket-dc-mcp config validate

# Get configuration file path
bitbucket-dc-mcp config path

# Reset to defaults
bitbucket-dc-mcp config reset
```

#### Check Version and Updates

```bash
# Show version information
bitbucket-dc-mcp version

# Check for available updates
bitbucket-dc-mcp version --check-updates
```

**Output Example:**
```
bitbucket-dc-mcp v2.4.0
Node.js: v22.14.0
Platform: darwin (macOS)
API Version: latest (Modern Bitbucket Data Center)
```

---

### Operation Discovery

#### Search for Operations

Search for Bitbucket operations using natural language queries:

```bash
# Basic search
bitbucket-dc-mcp search "create issue"

# Limit results
bitbucket-dc-mcp search "update assignee" --limit 3

# Show similarity scores
bitbucket-dc-mcp search "bulk update" --verbose

# Output as JSON for scripting
bitbucket-dc-mcp search "create project" --json
```

**Output Example (Table Format):**
```
Query: create issue
┌──────┬────────────────────────────┬────────────────────────────────────┬────────┐
│ Rank │ Operation ID               │ Summary                            │ Score  │
├──────┼────────────────────────────┼────────────────────────────────────┼────────┤
│ 1    │ createIssue                │ Create issue                       │ 0.95 ✅ │
│ 2    │ createIssues               │ Create issues (bulk)               │ 0.89 ✅ │
│ 3    │ createIssueLink            │ Create link between issues         │ 0.82 ✅ │
└──────┴────────────────────────────┴────────────────────────────────────┴────────┘

Found 3 result(s) matching "create issue"
```

**Output Example (JSON Format):**
```json
{
  "query": "create issue",
  "results": [
    {
      "rank": 1,
      "operation_id": "createIssue",
      "summary": "Create issue",
      "similarity_score": 0.95
    }
  ]
}
```

#### Get Operation Details

Retrieve detailed information about a specific operation:

```bash
# Basic operation info
bitbucket-dc-mcp get createIssue

# Show full schema and examples
bitbucket-dc-mcp get createIssue --verbose

# Output as JSON
bitbucket-dc-mcp get createIssue --json
```

**Output Example:**
```
Operation: createIssue
Summary: Create issue
Method: POST
Path: /rest/api/3/issue

Description:
Creates an issue or, where the option to create subtasks is enabled, a subtask.
A transition may be applied, to move the issue or subtask to a workflow step
other than the default start step, and issue properties set.

Parameters:
┌──────────────┬──────┬──────────┬─────────────────────────────────────────┐
│ Name         │ In   │ Required │ Type                                    │
├──────────────┼──────┼──────────┼─────────────────────────────────────────┤
│ updateHistory│ query│ No       │ boolean                                 │
└──────────────┴──────┴──────────┴─────────────────────────────────────────┘

Request Body (required):
{
  "fields": {
    "project": { "key": "PROJ" },
    "summary": "Issue summary",
    "issuetype": { "name": "Bug" }
  }
}

Response (201 - Created):
{
  "id": "10000",
  "key": "PROJ-123",
  "self": "https://bitbucket.example.com/rest/api/3/issue/10000"
}
```

#### Execute Operations (Call)

Execute Bitbucket operations directly from CLI:

```bash
# Dry-run mode (validate parameters without executing)
bitbucket-dc-mcp call createIssue \
  --param projectKey=TEST \
  --param summary="Test issue" \
  --param issueType=Bug \
  --dry-run

# Execute operation
bitbucket-dc-mcp call getIssue \
  --param issueIdOrKey=PROJ-123 \
  --json

# Execute with multiple parameters
bitbucket-dc-mcp call updateIssue \
  --param issueIdOrKey=PROJ-123 \
  --param summary="Updated summary" \
  --param description="New description"
```

---

### Testing and Debugging

#### Test Connection

Validate connectivity and authentication to your Bitbucket instance:

```bash
# Basic connection test
bitbucket-dc-mcp test-connection
```

**Output Example:**
```
Testing connection to Bitbucket Data Center...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Connection successful
✓ Authentication verified
✓ API version: latest (Bitbucket Data Center)

Server Information:
  URL: https://bitbucket.example.com
  Version: 9.14.2
  Build: 914002
  Server Time: 2025-10-20T14:30:00Z

Connection test completed successfully!
```

#### Start MCP Server

Launch the MCP server in stdio mode:

```bash
# Start server (interactive mode)
bitbucket-dc-mcp start

# Start with debug logging
LOG_LEVEL=debug bitbucket-dc-mcp start

# Start with custom config
bitbucket-dc-mcp start --config /path/to/custom/config.yml
```

**Output Example:**
```
✅ MCP Server started successfully
🔍 Semantic search ready (500+ Bitbucket operations indexed)
🔐 Authentication configured: Personal Access Token
📡 Listening on stdio transport

MCP Server Information:
  Version: 2.4.0
  API Version: latest
  Tools Available: search_ids, get_id, call_id
  Log Level: info

Waiting for MCP client connection...
```

#### Debug Mode Examples

```bash
# Enable debug logging for troubleshooting
bitbucket-dc-mcp --debug search "create issue"

# Test search with verbose output
bitbucket-dc-mcp search "authentication" --verbose

# Validate configuration with debug info
bitbucket-dc-mcp --debug config validate

# Test operation with dry-run
bitbucket-dc-mcp call createIssue \
  --param projectKey=TEST \
  --dry-run \
  --json
```

---

## Credential Management

### Manually Manage Stored Credentials

The MCP server provides secure credential storage using OS keychains. Here's how to programmatically manage stored credentials:

#### List All Stored Credentials

```typescript
import { AuthManager, StubCredentialStorage } from './auth/auth-manager.js';
import { CredentialStorage } from './core/credential-storage.js';
import { Logger } from './core/logger.js';
import { ConfigManager } from './core/config-manager.js';

// Initialize storage and auth manager
const logger = Logger.getInstance();
const config = await ConfigManager.load();
const storage = new CredentialStorage(logger);
const authManager = new AuthManager(storage, logger, config);

// List all stored credential profiles
const profiles = await authManager.listStoredCredentials();

console.log('Stored credential profiles:');
profiles.forEach((profile) => {
  console.log(`  - ${profile}`);
});

// Example output:
// Stored credential profiles:
//   - https://bitbucket.example.com
//   - https://bitbucket-prod.example.com
//   - bitbucket-dev-profile
```

#### Load Specific Credentials

```typescript
import { CredentialStorage } from './core/credential-storage.js';
import { Logger } from './core/logger.js';

const logger = Logger.getInstance();
const storage = new CredentialStorage(logger);

// Load credentials for a specific profile
const credentials = await storage.load('https://bitbucket.example.com');

if (credentials) {
  console.log('Found credentials:');
  console.log('  Bitbucket URL:', credentials.bitbucket_url);
  console.log('  Auth Method:', credentials.auth_method);
  console.log('  Has Access Token:', !!credentials.access_token);
  
  if (credentials.expires_at) {
    const expiresAt = new Date(credentials.expires_at);
    const isExpired = expiresAt < new Date();
    console.log('  Expires At:', expiresAt.toISOString());
    console.log('  Is Expired:', isExpired);
  }
} else {
  console.log('No credentials found for this profile');
}
```

#### Save New Credentials

```typescript
import { CredentialStorage, type Credentials } from './core/credential-storage.js';
import { Logger } from './core/logger.js';

const logger = Logger.getInstance();
const storage = new CredentialStorage(logger);

// Create credentials object
const credentials: Credentials = {
  bitbucket_url: 'https://bitbucket.example.com',
  auth_method: 'pat',
  access_token: 'your-personal-access-token-here',
};

// Save to secure storage
await storage.save('https://bitbucket.example.com', credentials);

console.log('Credentials saved successfully to OS keychain');
```

#### Save Credentials with Custom Profile

```typescript
import { CredentialStorage, type Credentials } from './core/credential-storage.js';
import { Logger } from './core/logger.js';

const logger = Logger.getInstance();
const storage = new CredentialStorage(logger);

// Use custom profile name instead of bitbucket_url
const profileName = 'bitbucket-production';

const credentials: Credentials = {
  bitbucket_url: 'https://bitbucket-prod.example.com',
  auth_method: 'oauth2',
  access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  refresh_token: 'def502004a8c...',
  expires_at: '2025-12-31T23:59:59Z',
};

await storage.save(profileName, credentials);

console.log(`Credentials saved with profile: ${profileName}`);
```

#### Delete Credentials (Logout)

```typescript
import { AuthManager } from './auth/auth-manager.js';
import { CredentialStorage } from './core/credential-storage.js';
import { Logger } from './core/logger.js';
import { ConfigManager } from './core/config-manager.js';

const logger = Logger.getInstance();
const config = await ConfigManager.load();
const storage = new CredentialStorage(logger);
const authManager = new AuthManager(storage, logger, config);

// Logout (delete credentials and clear cache)
const deleted = await authManager.logout();

if (deleted) {
  console.log('Logged out successfully - credentials deleted');
} else {
  console.log('No credentials found to delete');
}
```

#### Delete Specific Profile

```typescript
import { CredentialStorage } from './core/credential-storage.js';
import { Logger } from './core/logger.js';

const logger = Logger.getInstance();
const storage = new CredentialStorage(logger);

// Delete credentials for specific profile
const profileToDelete = 'bitbucket-old-instance';
const deleted = await storage.delete(profileToDelete);

if (deleted) {
  console.log(`Profile '${profileToDelete}' deleted`);
} else {
  console.log(`Profile '${profileToDelete}' not found`);
}
```

#### Check if Credentials Exist

```typescript
import { CredentialStorage } from './core/credential-storage.js';
import { Logger } from './core/logger.js';

const logger = Logger.getInstance();
const storage = new CredentialStorage(logger);

async function hasCredentials(profile: string): Promise<boolean> {
  const credentials = await storage.load(profile);
  return credentials !== null;
}

// Check multiple profiles
const profiles = ['https://bitbucket1.example.com', 'https://bitbucket2.example.com'];

for (const profile of profiles) {
  const exists = await hasCredentials(profile);
  console.log(`${profile}: ${exists ? 'Has credentials' : 'No credentials'}`);
}
```

#### Migrate Credentials Between Profiles

```typescript
import { CredentialStorage } from './core/credential-storage.js';
import { Logger } from './core/logger.js';

const logger = Logger.getInstance();
const storage = new CredentialStorage(logger);

async function migrateProfile(oldProfile: string, newProfile: string): Promise<void> {
  // Load from old profile
  const credentials = await storage.load(oldProfile);
  
  if (!credentials) {
    throw new Error(`No credentials found for profile: ${oldProfile}`);
  }
  
  // Save to new profile
  await storage.save(newProfile, credentials);
  console.log(`Migrated credentials: ${oldProfile} → ${newProfile}`);
  
  // Optional: delete old profile
  await storage.delete(oldProfile);
  console.log(`Deleted old profile: ${oldProfile}`);
}

// Migrate from URL-based to named profile
await migrateProfile(
  'https://bitbucket.example.com',
  'bitbucket-production'
);
```

#### Handle Multiple Bitbucket Instances

```typescript
import { CredentialStorage, type Credentials } from './core/credential-storage.js';
import { Logger } from './core/logger.js';

const logger = Logger.getInstance();
const storage = new CredentialStorage(logger);

// Define multiple Bitbucket instances
const instances = [
  {
    profile: 'bitbucket-dev',
    url: 'https://bitbucket-dev.example.com',
    authMethod: 'pat' as const,
    token: 'dev-token-here',
  },
  {
    profile: 'bitbucket-staging',
    url: 'https://bitbucket-staging.example.com',
    authMethod: 'pat' as const,
    token: 'staging-token-here',
  },
  {
    profile: 'bitbucket-prod',
    url: 'https://bitbucket-prod.example.com',
    authMethod: 'oauth2' as const,
    token: 'prod-access-token',
    refreshToken: 'prod-refresh-token',
  },
];

// Save credentials for each instance
for (const instance of instances) {
  const credentials: Credentials = {
    bitbucket_url: instance.url,
    auth_method: instance.authMethod,
    access_token: instance.token,
    ...(instance.refreshToken && { refresh_token: instance.refreshToken }),
  };
  
  await storage.save(instance.profile, credentials);
  console.log(`✓ Saved credentials for ${instance.profile}`);
}

console.log('\nAll instances configured!');
```

#### Export Credentials for Backup (Encrypted)

```typescript
import { CredentialStorage } from './core/credential-storage.js';
import { Logger } from './core/logger.js';
import * as fs from 'fs/promises';

const logger = Logger.getInstance();
const storage = new CredentialStorage(logger);

async function exportCredentials(outputPath: string): Promise<void> {
  // Get all profiles
  const profiles = await storage.list();
  
  // Load all credentials (will be encrypted when saved)
  const credentialsMap: Record<string, any> = {};
  
  for (const profile of profiles) {
    const credentials = await storage.load(profile);
    if (credentials) {
      // Note: access_token is still sensitive - this is for backup only
      credentialsMap[profile] = {
        bitbucket_url: credentials.bitbucket_url,
        auth_method: credentials.auth_method,
        has_access_token: !!credentials.access_token,
        has_refresh_token: !!credentials.refresh_token,
        expires_at: credentials.expires_at,
      };
    }
  }
  
  // Write to file (this is metadata only, not actual tokens)
  await fs.writeFile(
    outputPath,
    JSON.stringify(credentialsMap, null, 2),
    { mode: 0o600 }
  );
  
  console.log(`Exported metadata for ${profiles.length} profiles to ${outputPath}`);
  console.log('⚠️  Note: This export does NOT include actual tokens (secure)');
}

// Export metadata
await exportCredentials('./credentials-backup.json');
```

---

## Authentication Examples

### Switch Between Authentication Methods

```typescript
import { AuthManager } from './auth/auth-manager.js';
import { CredentialStorage } from './core/credential-storage.js';
import { Logger } from './core/logger.js';
import { ConfigManager } from './core/config-manager.js';

const logger = Logger.getInstance();
const storage = new CredentialStorage(logger);

// Load config for PAT authentication
const configPAT = await ConfigManager.load({
  bitbucketUrl: 'https://bitbucket.example.com',
  authMethod: 'pat',
});

const authManagerPAT = new AuthManager(storage, logger, configPAT);

// Use PAT auth
const headersPAT = await authManagerPAT.getAuthHeaders();
console.log('PAT Headers:', headersPAT.get('Authorization'));

// Switch to OAuth2
const configOAuth2 = await ConfigManager.load({
  bitbucketUrl: 'https://bitbucket.example.com',
  authMethod: 'oauth2',
});

const authManagerOAuth2 = new AuthManager(storage, logger, configOAuth2);

// Use OAuth2 auth
const headersOAuth2 = await authManagerOAuth2.getAuthHeaders();
console.log('OAuth2 Headers:', headersOAuth2.get('Authorization'));
```

### Use Different Profiles for Different Environments

```typescript
import { AuthManager } from './auth/auth-manager.js';
import { CredentialStorage } from './core/credential-storage.js';
import { Logger } from './core/logger.js';
import { ConfigManager } from './core/config-manager.js';

const logger = Logger.getInstance();
const storage = new CredentialStorage(logger);

// Development environment
const devConfig = await ConfigManager.load({
  bitbucketUrl: 'https://bitbucket-dev.example.com',
  authMethod: 'pat',
  credentialProfile: 'bitbucket-dev',
});

const devAuthManager = new AuthManager(storage, logger, devConfig);

// Production environment
const prodConfig = await ConfigManager.load({
  bitbucketUrl: 'https://bitbucket-prod.example.com',
  authMethod: 'oauth2',
  credentialProfile: 'bitbucket-prod',
});

const prodAuthManager = new AuthManager(storage, logger, prodConfig);

// Use appropriate auth manager based on environment
const environment = process.env.NODE_ENV || 'development';
const authManager = environment === 'production' ? prodAuthManager : devAuthManager;

console.log(`Using ${environment} credentials`);
const headers = await authManager.getAuthHeaders();
```

---

## API Operations

### Make Authenticated API Request

```typescript
import { AuthManager } from './auth/auth-manager.js';
import { CredentialStorage } from './core/credential-storage.js';
import { Logger } from './core/logger.js';
import { ConfigManager } from './core/config-manager.js';

const logger = Logger.getInstance();
const config = await ConfigManager.load();
const storage = new CredentialStorage(logger);
const authManager = new AuthManager(storage, logger, config);

// Get auth headers
const headers = await authManager.getAuthHeaders();

// Make API request
const response = await fetch(`${config.bitbucketUrl}/rest/api/3/myself`, {
  headers: headers as any,
});

if (response.ok) {
  const user = await response.json();
  console.log('Authenticated as:', user.displayName);
  console.log('Email:', user.emailAddress);
} else {
  console.error('Authentication failed:', response.status);
}
```

---

## MCP Tool Examples

This section provides practical examples for using the three core MCP tools (`search_ids`, `get_id`, `call_id`) to perform common Bitbucket operations. Each example shows the complete workflow from discovering operations to executing them.

**Prerequisites**:
- MCP server is running and configured (run `bitbucket-mcp setup` if not yet configured)
- MCP client (e.g., Claude Desktop) is connected to the server
- Valid Bitbucket credentials stored in OS keychain

**Example Format**:
Each example follows this structure:
1. **Description**: What the example does
2. **Prerequisites**: Required setup (e.g., project must exist)
3. **Workflow**: Step-by-step MCP tool calls
4. **Expected Output**: Sample responses
5. **Troubleshooting**: Common errors and solutions

For complete API documentation, see [API Reference](./api-reference.md).

---

### Issues

#### Example 1: Create Issue with Required Fields

**Description**: Create a minimal bug issue with only required fields (project, summary, issuetype).

**Prerequisites**:
- Project "PROJ" exists in Bitbucket
- User has "Create Issues" permission in project

**Workflow**:

**Step 1: Search for operation**
```json
{
  "name": "search_ids",
  "arguments": {
    "query": "create issue"
  }
}
```

**Response**:
```json
{
  "operations": [
    {
      "operation_id": "create_issue",
      "summary": "Create issue",
      "similarity_score": 0.94
    }
  ]
}
```

**Step 2: Get operation schema** (optional, if you need to verify required fields)
```json
{
  "name": "get_id",
  "arguments": {
    "operation_id": "create_issue"
  }
}
```

**Step 3: Execute operation**
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "create_issue",
    "parameters": {
      "fields": {
        "project": {
          "key": "PROJ"
        },
        "summary": "Payment processing fails for credit cards",
        "issuetype": {
          "name": "Bug"
        }
      }
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 201,
  "data": {
    "id": "10001",
    "key": "PROJ-123",
    "self": "https://bitbucket.example.com/rest/api/3/issue/10001"
  }
}
```

**curl Equivalent**:
```bash
curl -X POST https://bitbucket.example.com/rest/api/3/issue \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "project": {"key": "PROJ"},
      "summary": "Payment processing fails for credit cards",
      "issuetype": {"name": "Bug"}
    }
  }'
```

**Troubleshooting**:
- **Error: "Project 'PROJ' not found"**: Verify project key is correct, check project exists
- **Error: "issuetype 'Bug' not found"**: Check available issue types for project (use get_create_issue_meta operation)
- **Error: "Field 'summary' is required"**: Ensure summary field is non-empty string
- **Error: "User does not have permission"**: User needs "Create Issues" permission in project settings

---

#### Example 2: Create Issue with Custom Fields

**Description**: Create issue with optional fields and custom fields (priority, labels, custom text field).

**Prerequisites**:
- Project exists
- Custom field ID known (use field discovery operations to find custom field IDs)

**Workflow**:

```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "create_issue",
    "parameters": {
      "fields": {
        "project": {
          "key": "PROJ"
        },
        "summary": "Add dark mode support to dashboard",
        "description": "Users have requested a dark mode theme option in settings.",
        "issuetype": {
          "name": "Story"
        },
        "priority": {
          "name": "High"
        },
        "labels": ["ui", "accessibility", "enhancement"],
        "customfield_10050": "Q2 2025"
      }
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 201,
  "data": {
    "id": "10002",
    "key": "PROJ-124",
    "self": "https://bitbucket.example.com/rest/api/3/issue/10002"
  }
}
```

**Troubleshooting**:
- **Error: "Field 'customfield_10050' does not exist"**: Verify custom field ID with field discovery operation
- **Error: "priority 'High' not found"**: Check available priorities (use get priorities operation)
- **Error: "Invalid value for customfield_10050"**: Check field type and value format (text vs select vs date)

---

#### Example 3: Update Issue Summary and Description

**Description**: Update existing issue's summary and description.

**Prerequisites**:
- Issue "PROJ-123" exists
- User has "Edit Issues" permission

**Workflow**:

**Step 1: Search for update operation**
```json
{
  "name": "search_ids",
  "arguments": {
    "query": "update issue"
  }
}
```

**Response**:
```json
{
  "operations": [
    {
      "operation_id": "update_issue",
      "summary": "Edit issue",
      "similarity_score": 0.91
    }
  ]
}
```

**Step 2: Execute update**
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "update_issue",
    "parameters": {
      "issueIdOrKey": "PROJ-123",
      "fields": {
        "summary": "Payment processing fails for Visa credit cards",
        "description": "Issue occurs specifically with Visa cards. MasterCard and Amex work fine."
      }
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 204,
  "data": null
}
```

**Note**: 204 status means success with no response body.

**curl Equivalent**:
```bash
curl -X PUT https://bitbucket.example.com/rest/api/3/issue/PROJ-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "summary": "Payment processing fails for Visa credit cards",
      "description": "Issue occurs specifically with Visa cards. MasterCard and Amex work fine."
    }
  }'
```

**Troubleshooting**:
- **Error: "Issue 'PROJ-123' not found"**: Verify issue key, check issue exists
- **Error: "User does not have permission"**: User needs "Edit Issues" permission
- **Error: "Field cannot be set"**: Some fields are read-only (e.g., reporter, created date)

---

#### Example 4: Update Issue Assignee

**Description**: Assign issue to specific user.

**Prerequisites**:
- Issue exists
- User account ID known (use user search operations to find account ID)

**Workflow**:

```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "update_issue",
    "parameters": {
      "issueIdOrKey": "PROJ-123",
      "fields": {
        "assignee": {
          "accountId": "5b10a2844c20165700ede21g"
        }
      }
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 204,
  "data": null
}
```

**Find User Account ID** (prerequisite step):
```json
{
  "name": "search_ids",
  "arguments": {
    "query": "search users"
  }
}
```
Then use the `find_users_for_picker` or `find_users` operation to search by name/email.

**curl Equivalent**:
```bash
curl -X PUT https://bitbucket.example.com/rest/api/3/issue/PROJ-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "assignee": {"accountId": "5b10a2844c20165700ede21g"}
    }
  }'
```

**Troubleshooting**:
- **Error: "Assignee account ID not found"**: Verify user exists and account ID is correct
- **Error: "User cannot be assigned to this project"**: User needs access to the project
- **Error: "Field 'assignee' is not on screen"**: Field configuration issue, contact Bitbucket admin

---

#### Example 5: Add Comment to Issue

**Description**: Add a comment to an existing issue.

**Prerequisites**:
- Issue exists
- User has "Add Comments" permission

**Workflow**:

**Step 1: Search for comment operation**
```json
{
  "name": "search_ids",
  "arguments": {
    "query": "add comment to issue"
  }
}
```

**Response**:
```json
{
  "operations": [
    {
      "operation_id": "add_comment",
      "summary": "Add comment",
      "similarity_score": 0.93
    }
  ]
}
```

**Step 2: Execute operation**
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "add_comment",
    "parameters": {
      "issueIdOrKey": "PROJ-123",
      "body": {
        "type": "doc",
        "version": 1,
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "text": "I've reproduced this issue in staging environment. The error occurs when CVV is missing."
              }
            ]
          }
        ]
      }
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 201,
  "data": {
    "id": "10050",
    "author": {
      "accountId": "5b10a2844c20165700ede21g",
      "displayName": "John Doe"
    },
    "body": {
      "type": "doc",
      "version": 1,
      "content": [...]
    },
    "created": "2025-10-18T14:30:00.000+0000"
  }
}
```

**Simple Text Comment** (alternative format):
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "add_comment",
    "parameters": {
      "issueIdOrKey": "PROJ-123",
      "body": "Simple text comment without formatting"
    }
  }
}
```

**curl Equivalent**:
```bash
curl -X POST https://bitbucket.example.com/rest/api/3/issue/PROJ-123/comment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Simple text comment"
  }'
```

**Troubleshooting**:
- **Error: "Invalid comment body"**: Use either Atlassian Document Format (ADF) or simple string
- **Error: "User does not have permission"**: User needs "Add Comments" permission
- **Error: "Comment cannot be empty"**: Provide non-empty comment body

---

#### Example 6: Transition Issue Workflow

**Description**: Change issue status (e.g., from "To Do" to "In Progress").

**Prerequisites**:
- Issue exists
- Transition is valid for current issue status

**Workflow**:

**Step 1: Get available transitions**
```json
{
  "name": "search_ids",
  "arguments": {
    "query": "get issue transitions"
  }
}
```

```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "get_transitions",
    "parameters": {
      "issueIdOrKey": "PROJ-123"
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "status": 200,
  "data": {
    "transitions": [
      {
        "id": "11",
        "name": "In Progress",
        "to": {
          "id": "3",
          "name": "In Progress"
        }
      },
      {
        "id": "21",
        "name": "Done",
        "to": {
          "id": "10001",
          "name": "Done"
        }
      }
    ]
  }
}
```

**Step 2: Execute transition**
```json
{
  "name": "search_ids",
  "arguments": {
    "query": "transition issue"
  }
}
```

```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "do_transition",
    "parameters": {
      "issueIdOrKey": "PROJ-123",
      "transition": {
        "id": "11"
      }
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 204,
  "data": null
}
```

**curl Equivalent**:
```bash
curl -X POST https://bitbucket.example.com/rest/api/3/issue/PROJ-123/transitions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transition": {"id": "11"}
  }'
```

**Troubleshooting**:
- **Error: "Transition not found"**: Verify transition ID from get_transitions call
- **Error: "Invalid transition"**: Transition not valid for current status, check workflow
- **Error: "Required field missing"**: Some transitions require additional fields (e.g., resolution)

---

#### Example 7: Search Issues by JQL

**Description**: Search for issues using Bitbucket Query Language (JQL).

**Prerequisites**:
- User has access to projects in query
- Valid JQL syntax

**Workflow**:

**Step 1: Search for JQL operation**
```json
{
  "name": "search_ids",
  "arguments": {
    "query": "search issues by JQL"
  }
}
```

**Response**:
```json
{
  "operations": [
    {
      "operation_id": "search_for_issues_using_jql",
      "summary": "Search for issues using JQL (POST)",
      "similarity_score": 0.96
    }
  ]
}
```

**Step 2: Execute search**
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "search_for_issues_using_jql",
    "parameters": {
      "jql": "project = PROJ AND status = Open AND assignee = currentUser()",
      "maxResults": 10,
      "fields": ["summary", "status", "assignee", "priority"]
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 200,
  "data": {
    "startAt": 0,
    "maxResults": 10,
    "total": 5,
    "issues": [
      {
        "id": "10001",
        "key": "PROJ-123",
        "fields": {
          "summary": "Payment processing fails",
          "status": {
            "name": "Open"
          },
          "assignee": {
            "accountId": "5b10a2844c20165700ede21g",
            "displayName": "John Doe"
          },
          "priority": {
            "name": "High"
          }
        }
      }
    ]
  }
}
```

**Common JQL Queries**:
- **My open issues**: `assignee = currentUser() AND status != Done`
- **High priority bugs**: `project = PROJ AND issuetype = Bug AND priority = High`
- **Issues updated today**: `updated >= startOfDay()`
- **Issues in sprint**: `sprint = "Sprint 1"`

**curl Equivalent**:
```bash
curl -X POST https://bitbucket.example.com/rest/api/3/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = PROJ AND status = Open",
    "maxResults": 10,
    "fields": ["summary", "status"]
  }'
```

**Troubleshooting**:
- **Error: "Invalid JQL query"**: Check JQL syntax, test query in Bitbucket UI first
- **Error: "Field does not exist"**: Verify field name in `fields` array
- **Error: "User does not have permission"**: User cannot access projects in query

**JQL Reference**: https://support.atlassian.com/jira-software-cloud/docs/use-advanced-search-with-jira-query-language-jql/

---

#### Example 8: Bulk Update Issues

**Description**: Update multiple issues in a loop with error handling and rate limiting considerations.

**Prerequisites**:
- Issues exist
- User has "Edit Issues" permission

**Workflow**:

```typescript
// Pseudocode for LLM to translate into MCP tool calls

const issueKeys = ["PROJ-123", "PROJ-124", "PROJ-125"];
const updates = {
  fields: {
    priority: { name: "High" }
  }
};

for (const issueKey of issueKeys) {
  try {
    // Call update_issue for each issue
    const result = await mcpClient.callTool("call_id", {
      operation_id: "update_issue",
      parameters: {
        issueIdOrKey: issueKey,
        ...updates
      }
    });
    
    if (result.success) {
      console.log(`✓ Updated ${issueKey}`);
    } else {
      console.error(`✗ Failed to update ${issueKey}:`, result.error.message);
    }
  } catch (error) {
    // Handle rate limiting
    if (error.code === "RATE_LIMIT_EXCEEDED") {
      console.log(`Rate limit hit, waiting ${error.details.retryAfter}s...`);
      await sleep(error.details.retryAfter * 1000);
      // Retry this issue
      // ...
    } else {
      console.error(`✗ Error updating ${issueKey}:`, error.message);
    }
  }
}
```

**MCP Tool Call Example** (single issue):
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "update_issue",
    "parameters": {
      "issueIdOrKey": "PROJ-123",
      "fields": {
        "priority": { "name": "High" }
      }
    }
  }
}
```

**Rate Limiting**:
- Default rate limit: 100 requests per minute
- Server automatically handles retries for 429 errors
- For large batches, consider using bulk operations when available

**Troubleshooting**:
- **Error: "Rate limit exceeded"**: Reduce update frequency or use bulk operations
- **Error: "Issue not found" for some issues**: Validate all issue keys before batch update
- **Partial failures**: Track successful and failed updates separately

---

### Users and Projects

#### Example 1: Get Current User Info

**Description**: Retrieve information about the authenticated user.

**Prerequisites**:
- Valid authentication

**Workflow**:

**Step 1: Search for operation**
```json
{
  "name": "search_ids",
  "arguments": {
    "query": "get current user"
  }
}
```

**Step 2: Execute operation**
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "get_current_user",
    "parameters": {}
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 200,
  "data": {
    "accountId": "5b10a2844c20165700ede21g",
    "emailAddress": "john.doe@example.com",
    "displayName": "John Doe",
    "avatarUrls": {
      "48x48": "https://avatar-url.example.com"
    },
    "timezone": "America/New_York",
    "locale": "en_US"
  }
}
```

**curl Equivalent**:
```bash
curl -X GET https://bitbucket.example.com/rest/api/3/myself \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Troubleshooting**:
- **Error: "Unauthorized"**: Authentication token invalid or expired, re-run setup

---

#### Example 2: Search Users by Name

**Description**: Find users by display name or email for assignment or mentions.

**Prerequisites**:
- User has "Browse Users" permission

**Workflow**:

**Step 1: Search for operation**
```json
{
  "name": "search_ids",
  "arguments": {
    "query": "search users by name"
  }
}
```

**Step 2: Execute search**
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "find_users_for_picker",
    "parameters": {
      "query": "john"
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 200,
  "data": {
    "users": [
      {
        "accountId": "5b10a2844c20165700ede21g",
        "displayName": "John Doe",
        "emailAddress": "john.doe@example.com",
        "avatarUrls": {
          "48x48": "https://avatar-url.example.com"
        }
      },
      {
        "accountId": "5c20b3955d30276800fef32h",
        "displayName": "Johnny Smith",
        "emailAddress": "johnny.smith@example.com"
      }
    ]
  }
}
```

**curl Equivalent**:
```bash
curl -X GET "https://bitbucket.example.com/rest/api/3/user/picker?query=john" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Troubleshooting**:
- **Error: "User does not have permission"**: User needs "Browse Users" permission
- **Empty results**: Verify user exists and query string is correct

---

#### Example 3: List All Projects

**Description**: Retrieve all projects accessible to the current user.

**Prerequisites**:
- User has access to at least one project

**Workflow**:

**Step 1: Search for operation**
```json
{
  "name": "search_ids",
  "arguments": {
    "query": "list all projects"
  }
}
```

**Step 2: Execute operation**
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "get_all_projects",
    "parameters": {}
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "id": "10000",
      "key": "PROJ",
      "name": "Project Example",
      "projectTypeKey": "software",
      "style": "classic",
      "avatarUrls": {
        "48x48": "https://avatar-url.example.com"
      }
    },
    {
      "id": "10001",
      "key": "DEMO",
      "name": "Demo Project",
      "projectTypeKey": "business"
    }
  ]
}
```

**curl Equivalent**:
```bash
curl -X GET https://bitbucket.example.com/rest/api/3/project \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Troubleshooting**:
- **Empty results**: User has no project access, contact Bitbucket admin

---

#### Example 4: Get Project Details

**Description**: Retrieve detailed information about a specific project including issue types, versions, and components.

**Prerequisites**:
- User has access to the project

**Workflow**:

```json
{
  "name": "search_ids",
  "arguments": {
    "query": "get project details"
  }
}
```

```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "get_project",
    "parameters": {
      "projectIdOrKey": "PROJ"
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 200,
  "data": {
    "id": "10000",
    "key": "PROJ",
    "name": "Project Example",
    "description": "Example project for testing",
    "lead": {
      "accountId": "5b10a2844c20165700ede21g",
      "displayName": "John Doe"
    },
    "issueTypes": [
      {"id": "10001", "name": "Bug"},
      {"id": "10002", "name": "Task"},
      {"id": "10003", "name": "Story"}
    ],
    "versions": [
      {"id": "10100", "name": "v1.0"},
      {"id": "10101", "name": "v1.1"}
    ],
    "components": [
      {"id": "10200", "name": "Backend"},
      {"id": "10201", "name": "Frontend"}
    ]
  }
}
```

**curl Equivalent**:
```bash
curl -X GET https://bitbucket.example.com/rest/api/3/project/PROJ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### Example 5: Create Project Component

**Description**: Add a component to an existing project.

**Prerequisites**:
- User has "Administer Projects" permission
- Project exists

**Workflow**:

```json
{
  "name": "search_ids",
  "arguments": {
    "query": "create project component"
  }
}
```

```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "create_component",
    "parameters": {
      "name": "API",
      "description": "REST API backend services",
      "project": "PROJ",
      "leadAccountId": "5b10a2844c20165700ede21g"
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 201,
  "data": {
    "id": "10300",
    "name": "API",
    "description": "REST API backend services",
    "project": "PROJ",
    "lead": {
      "accountId": "5b10a2844c20165700ede21g",
      "displayName": "John Doe"
    }
  }
}
```

**curl Equivalent**:
```bash
curl -X POST https://bitbucket.example.com/rest/api/3/component \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API",
    "project": "PROJ",
    "leadAccountId": "5b10a2844c20165700ede21g"
  }'
```

---

### Workflows and Sprints

#### Example 1: Get Issue Transitions

**Description**: Discover available workflow transitions for an issue.

(See "Example 6: Transition Issue Workflow" in Issues section for complete example)

---

#### Example 2: Transition Issue with Resolution

**Description**: Complete an issue by transitioning to "Done" status and setting resolution.

**Prerequisites**:
- Issue exists
- "Done" transition is available

**Workflow**:

**Step 1: Get transitions to find "Done" transition ID**
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "get_transitions",
    "parameters": {
      "issueIdOrKey": "PROJ-123"
    }
  }
}
```

**Step 2: Execute transition with resolution**
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "do_transition",
    "parameters": {
      "issueIdOrKey": "PROJ-123",
      "transition": {
        "id": "31"
      },
      "fields": {
        "resolution": {
          "name": "Done"
        }
      }
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 204,
  "data": null
}
```

**Troubleshooting**:
- **Error: "Field 'resolution' is required"**: Some "Done" transitions require resolution field
- **Error: "Resolution not found"**: Use valid resolution name ("Done", "Fixed", "Won't Fix", etc.)

---

#### Example 3: Get Sprint Report

**Description**: Retrieve sprint metrics including completed and incomplete issues.

**Prerequisites**:
- Project uses Scrum board
- Sprint exists
- User has access to board

**Workflow**:

```json
{
  "name": "search_ids",
  "arguments": {
    "query": "get sprint report"
  }
}
```

```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "get_sprint",
    "parameters": {
      "sprintId": "1"
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 200,
  "data": {
    "id": 1,
    "name": "Sprint 1",
    "state": "active",
    "startDate": "2025-10-01T00:00:00.000Z",
    "endDate": "2025-10-15T00:00:00.000Z",
    "completeDate": null,
    "originBoardId": 1,
    "goal": "Complete payment integration"
  }
}
```

**Get Sprint Issues** (additional query):
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "search_for_issues_using_jql",
    "parameters": {
      "jql": "sprint = 1",
      "fields": ["summary", "status", "storyPoints"]
    }
  }
}
```

---

#### Example 4: Move Issue to Sprint

**Description**: Add an issue to an active sprint.

**Prerequisites**:
- Issue exists
- Sprint exists and is not closed
- User has "Schedule Issues" permission

**Workflow**:

```json
{
  "name": "search_ids",
  "arguments": {
    "query": "move issue to sprint"
  }
}
```

```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "move_issues_to_sprint",
    "parameters": {
      "sprintId": "1",
      "issues": ["PROJ-123", "PROJ-124"]
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 204,
  "data": null
}
```

---

#### Example 5: Create Sprint

**Description**: Create a new sprint in a Scrum board.

**Prerequisites**:
- Board exists
- User has "Manage Sprints" permission

**Workflow**:

```json
{
  "name": "search_ids",
  "arguments": {
    "query": "create sprint"
  }
}
```

```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "create_sprint",
    "parameters": {
      "name": "Sprint 2",
      "startDate": "2025-10-16T00:00:00.000Z",
      "endDate": "2025-10-30T00:00:00.000Z",
      "originBoardId": 1,
      "goal": "Complete user authentication feature"
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 201,
  "data": {
    "id": 2,
    "name": "Sprint 2",
    "state": "future",
    "startDate": "2025-10-16T00:00:00.000Z",
    "endDate": "2025-10-30T00:00:00.000Z",
    "originBoardId": 1,
    "goal": "Complete user authentication feature"
  }
}
```

**Note**: Dates must be in ISO 8601 format.

---

### Custom Fields

#### Example 1: List Custom Fields

**Description**: Discover available custom fields in your Bitbucket instance.

**Prerequisites**:
- User has access to projects with custom fields

**Workflow**:

```json
{
  "name": "search_ids",
  "arguments": {
    "query": "list custom fields"
  }
}
```

```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "get_fields",
    "parameters": {}
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "id": "customfield_10050",
      "name": "Target Release",
      "custom": true,
      "schema": {
        "type": "string",
        "custom": "com.atlassian.bitbucket.plugin.system.customfieldtypes:textfield"
      }
    },
    {
      "id": "customfield_10051",
      "name": "Story Points",
      "custom": true,
      "schema": {
        "type": "number",
        "custom": "com.atlassian.bitbucket.plugin.system.customfieldtypes:float"
      }
    },
    {
      "id": "customfield_10052",
      "name": "Department",
      "custom": true,
      "schema": {
        "type": "option",
        "custom": "com.atlassian.bitbucket.plugin.system.customfieldtypes:select"
      }
    }
  ]
}
```

**curl Equivalent**:
```bash
curl -X GET https://bitbucket.example.com/rest/api/3/field \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

#### Example 2: Set Text Custom Field

**Description**: Set value for a text-type custom field.

**Prerequisites**:
- Custom field exists and is available for issue type
- User has "Edit Issues" permission

**Workflow**:

```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "update_issue",
    "parameters": {
      "issueIdOrKey": "PROJ-123",
      "fields": {
        "customfield_10050": "Q2 2025"
      }
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 204,
  "data": null
}
```

---

#### Example 3: Set Select List Custom Field

**Description**: Set value for a single-select custom field.

**Prerequisites**:
- Custom field exists
- Option value is valid for the field

**Workflow**:

```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "update_issue",
    "parameters": {
      "issueIdOrKey": "PROJ-123",
      "fields": {
        "customfield_10052": {
          "value": "Engineering"
        }
      }
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 204,
  "data": null
}
```

**Troubleshooting**:
- **Error: "Option value not found"**: Verify option exists using field metadata operations
- **Error: "Invalid format"**: Use `{"value": "option_name"}` format for select fields

---

#### Example 4: Set Multi-Select Custom Field

**Description**: Set multiple values for a multi-select custom field.

**Prerequisites**:
- Custom field exists
- All option values are valid

**Workflow**:

```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "update_issue",
    "parameters": {
      "issueIdOrKey": "PROJ-123",
      "fields": {
        "customfield_10053": [
          {"value": "Backend"},
          {"value": "Frontend"},
          {"value": "Database"}
        ]
      }
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 204,
  "data": null
}
```

---

#### Example 5: Set Date/DateTime Custom Field

**Description**: Set value for a date or datetime custom field.

**Prerequisites**:
- Custom field exists
- Date format is ISO 8601

**Workflow**:

**Date Field** (YYYY-MM-DD):
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "update_issue",
    "parameters": {
      "issueIdOrKey": "PROJ-123",
      "fields": {
        "customfield_10054": "2025-12-31"
      }
    }
  }
}
```

**DateTime Field** (ISO 8601):
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "update_issue",
    "parameters": {
      "issueIdOrKey": "PROJ-123",
      "fields": {
        "customfield_10055": "2025-12-31T23:59:59.000+0000"
      }
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "status": 204,
  "data": null
}
```

**Troubleshooting**:
- **Error: "Invalid date format"**: Use ISO 8601 format (YYYY-MM-DD for dates, full ISO 8601 for datetimes)
- **Error: "Date is required"**: Some fields don't accept null, use valid date or clear with empty string

---

## Logging and Observability

### Enable DEBUG Logging

Enable DEBUG logging to see detailed execution flow, API requests/responses:

```bash
# Set environment variable
export LOG_LEVEL=DEBUG

# Start the server
npm start
```

**Output example:**
```json
{
  "level": "debug",
  "time": 1705320000000,
  "service": "bitbucket-dc-mcp",
  "version": "1.0.0",
  "event": "bitbucket_client.api_request",
  "method": "GET",
  "path": "/rest/api/3/issue/TEST-1",
  "bitbucket_url": "https://bitbucket.example.com",
  "msg": "Making API request"
}
```

**⚠️ Warning:** DEBUG logs are verbose and should **not** be used in production.

### Configure File Output with Rotation

```bash
# Enable file output with daily rotation
export LOG_LEVEL=INFO
export LOG_OUTPUT=file
export LOG_FILE_PATH=./logs/bitbucket-mcp.log
export LOG_ROTATION=daily
export LOG_MAX_SIZE=100  # MB
export LOG_MAX_FILES=7    # Keep 7 days

# Start the server
npm start
```

### Query Logs for Troubleshooting

**Find all logs for a specific request:**

```bash
# Using jq (requires correlation_id from error message or MCP client)
cat logs/bitbucket-mcp.log | jq 'select(.correlation_id == "req-abc-123")'
```

**Find all errors in the logs:**

```bash
cat logs/bitbucket-mcp.log | jq 'select(.level == "error")'
```

**Find slow operations (>1 second):**

```bash
cat logs/bitbucket-mcp.log | jq 'select(.latency_ms > 1000)'
```

**View audit trail (mutations only):**

```bash
cat logs/bitbucket-mcp.log | jq 'select(.audit_type == "mutation")'
```

### Programmatic Logging

Use the logger in custom scripts:

```typescript
import { Logger } from './core/logger.js';
import { createCorrelationContext, runWithCorrelationContext } from './core/correlation-context.js';

// Get logger instance
const logger = Logger.getInstance();

// Create correlation context for tracing
const context = createCorrelationContext('bitbucket-dc-mcp', '1.0.0', 'my_script', 'my_operation');

// Run with correlation context
await runWithCorrelationContext(context, async () => {
  // Log with structured fields
  logger.info({
    event: 'my_script.started',
    correlation_id: context.correlationId,
    operation: 'my_operation',
  }, 'Script started');

  try {
    // Your code here
    const result = await doSomething();

    logger.info({
      event: 'my_script.success',
      correlation_id: context.correlationId,
      result_count: result.length,
      latency_ms: Date.now() - context.startTime,
    }, 'Script completed successfully');
  } catch (error) {
    logger.error({
      event: 'my_script.error',
      correlation_id: context.correlationId,
      error_type: error.name,
      error_message: error.message,
      stack_trace: error.stack,
    }, 'Script failed');
    throw error;
  }
});
```

### Monitor Cache Performance

Log cache statistics periodically:

```typescript
import { CacheManager } from './core/cache-manager.js';
import { Logger } from './core/logger.js';

const logger = Logger.getInstance();
const cache = new CacheManager({ maxSize: 1000, ttl: 300000 }, logger);

// Log cache stats every 5 minutes
setInterval(() => {
  cache.logStats();
}, 5 * 60 * 1000);

// Example output:
// {
//   "level": "info",
//   "event": "cache.stats",
//   "cache_size": 245,
//   "cache_hits": 1523,
//   "cache_misses": 342,
//   "hit_rate": 0.817,
//   "msg": "Cache statistics"
// }
```

### Trace Request Flow

Use correlation IDs to trace requests end-to-end:

```typescript
import { getCorrelationContext } from './core/correlation-context.js';

// In any function, get the current correlation context
const context = getCorrelationContext();
if (context) {
  console.log('Current request:', context.correlationId);
  console.log('Tool:', context.toolName);
  console.log('Operation:', context.operationId);
  console.log('Elapsed time:', Date.now() - context.startTime, 'ms');
}
```

Then search logs by correlation ID:

```bash
cat logs/bitbucket-mcp.log | jq -c 'select(.correlation_id == "req-abc-123")' | jq
```

### Sanitize Sensitive Data

The logger automatically masks sensitive fields. To add custom sensitive fields:

```typescript
// Edit src/core/logger.ts
const REDACT_FIELDS = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  // Add your custom fields
  'apiKey',
  'secretKey',
  'privateKey',
];
```

Fields matching these names will be replaced with `***` in all logs.

### Integration with External Services

**Send logs to Datadog:**

```bash
# Install Datadog agent
# Then configure log collection in /etc/datadog-agent/conf.d/nodejs.d/conf.yaml

logs:
  - type: file
    path: /path/to/logs/bitbucket-mcp.log
    service: bitbucket-dc-mcp
    source: nodejs
```

**Send logs to ELK Stack:**

```bash
# Install Filebeat
# Then configure in /etc/filebeat/filebeat.yml

filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /path/to/logs/bitbucket-mcp.log
    json.keys_under_root: true

output.elasticsearch:
  hosts: ["localhost:9200"]
```

**Send logs to Splunk:**

```bash
# Install Splunk Universal Forwarder
# Then configure in inputs.conf

[monitor:///path/to/logs/bitbucket-mcp.log]
sourcetype = _json
index = bitbucket-mcp
```

For detailed observability setup, see [Observability Guide](./observability.md).

---

## Additional Resources

- [Authentication Guide](./authentication.md) - Complete authentication setup guide
- [API Documentation](./internal/architecture/api-specification.md) - Full API reference
- [Security Best Practices](./internal/architecture/security-and-performance.md) - Security guidelines
- [Observability Guide](./observability.md) - Logging, monitoring, and alerting

````
