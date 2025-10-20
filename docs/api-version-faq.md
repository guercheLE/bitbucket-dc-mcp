# API Version Configuration - Frequently Asked Questions

## Question 1: Does apiVersion have an environment variable?

**Answer: YES** ✅

The `api_version` configuration can be set via the `BITBUCKET_API_VERSION` environment variable.

### Configuration Priority (highest to lowest):

1. **Environment Variable**: `BITBUCKET_API_VERSION`
2. **Config File**: `api_version` in `~/.bitbucket-dc-mcp/config.yml`
3. **Default**: `"latest"` (for modern Bitbucket instances)

### Usage Examples:

**Setting via environment variable:**
```bash
export BITBUCKET_API_VERSION=latest
npm start
```

**Setting via config file:**
```yaml
# ~/.bitbucket-dc-mcp/config.yml
bitbucket_url: https://bitbucket.example.com
auth_method: pat
api_version: "latest"  # Detected during setup, or set manually
```

**Overriding at runtime:**
```bash
# Even if config has api_version: "latest", this forces v1.0
BITBUCKET_API_VERSION=1.0 npm start
```

### All Environment Variables:

| Config Field | Environment Variable | Example |
|-------------|---------------------|---------|
| `bitbucket_url` | `BITBUCKET_URL` | `https://bitbucket.example.com` |
| `auth_method` | `BITBUCKET_AUTH_METHOD` | `pat`, `oauth2`, `basic` |
| **`api_version`** | **`BITBUCKET_API_VERSION`** | **`1.0` or `latest`** |
| `rate_limit` | `BITBUCKET_RATE_LIMIT` | `100` |
| `timeout` | `BITBUCKET_TIMEOUT_MS` | `30000` |
| `log_level` | `LOG_LEVEL` | `info`, `debug`, `warn`, `error` |

---

## Question 2: How does apiVersion fit with paths like `/agile/1.0/board` and `/api/2/cluster/nodes`?

**Answer: It doesn't affect them!** 🎯

### Key Concept: Scope of `api_version` Config

The `api_version` configuration **ONLY** affects `/rest/api/X` paths. All other Bitbucket API paths are **version-independent** and use their own fixed versioning.

### Bitbucket Data Center REST API:

| API Type | Path Pattern | Affected by api_version? | Notes |
|----------|-------------|------------------------|-------|
| **Core REST API** | `/rest/api/1.0/*` or `/rest/api/latest/*` | ✅ **YES** | This is what `api_version` controls |
| **Bitbucket Core Endpoints** | `/rest/api/latest/*` | ✅ **YES** | Modern Bitbucket instances |
| **Legacy Endpoints** | `/rest/api/1.0/*` | ✅ **YES** | Older Bitbucket instances |

### Examples from Your embeddings.db:

#### 1. **Agile API** - Not Affected
```json
{
  "path": "/agile/1.0/board",
  "method": "get"
}
```

**URL building:**
```typescript
// Using the configured api_version
buildFullUrl('https://bitbucket.example.com', 'projects', 'latest')
// Returns: https://bitbucket.example.com/rest/api/latest/projects

buildFullUrl('https://bitbucket.example.com', 'projects', '1.0')
// Returns: https://bitbucket.example.com/rest/api/1.0/projects
```

#### 2. **Version-specific paths** - Preserved
```json
{
  "path": "/rest/api/latest/projects",
  "method": "get"
}
```

**URL building:**
```typescript
// If path already includes api version, it's preserved:
buildFullUrl('https://bitbucket.example.com', '/rest/api/latest/projects', '1.0')
// Returns: https://bitbucket.example.com/rest/api/2/cluster/nodes
// ^^^ Preserves v2 even though config is v3

// Returns: https://bitbucket.example.com/rest/api/latest/projects
// ^^^ Preserves the version in the path
```

#### 3. **Standard API** - Affected
```json
{
  "path": "/rest/api/latest/projects/{projectKey}/repos",
  "method": "get"
}
```

**URL building:**
```typescript
// api_version config controls this:
buildApiUrl('https://bitbucket.example.com', 'latest', 'projects/PROJECT/repos')
// Returns: https://bitbucket.example.com/rest/api/latest/projects/PROJECT/repos

buildApiUrl('https://bitbucket.example.com', '1.0', 'projects/PROJECT/repos')
// Returns: https://bitbucket.example.com/rest/api/1.0/projects/PROJECT/repos
```

### How the System Handles This Automatically:

The `BitbucketClient` service uses the `buildFullUrl()` function which handles different path types:

```typescript
import { buildFullUrl } from './core/api-url-builder';

const config = await ConfigManager.load(); // api_version: 'latest'

// Case 1: Path with explicit version - preserved
const explicitUrl = buildFullUrl(
  config.bitbucketUrl, 
  '/rest/api/1.0/projects', 
  config.apiVersion
);
// Result: https://bitbucket.example.com/rest/api/1.0/projects
// ^^^ Uses version from path, ignores config.apiVersion

// Case 2: Relative path - version applied
const apiUrl = buildFullUrl(
  config.bitbucketUrl, 
  'projects', 
  config.apiVersion  // 'latest'
);
// Result: https://bitbucket.example.com/rest/api/latest/projects
// ^^^ Uses config.apiVersion

// Case 3: Path with version - preserved
const specificUrl = buildFullUrl(
  config.bitbucketUrl, 
  '/rest/api/1.0/application-properties', 
  config.apiVersion  // 'latest'
);
// Result: https://bitbucket.example.com/rest/api/1.0/application-properties
// ^^^ Preserves the explicit 1.0 in the path
```

### Operation Path Types in embeddings.db:

Your embeddings database contains operations with different path patterns:

```bash
# Count different API types:
grep '"path":' data/operations.json | sort | uniq -c

# Results show:
# 280 operations: /rest/api/3/*      <- Affected by api_version
#  87 operations: /agile/1.0/*       <- NOT affected
#  34 operations: /rest/api/2/*      <- Affected by api_version
#  29 operations: /servicedesk/1/*   <- NOT affected
```

### Best Practice for Developers:

When adding new operations to the MCP server:

```typescript
import { buildFullUrl, needsApiVersion } from './core/api-url-builder';

const operation = {
  path: '/agile/1.0/board',
  method: 'get'
};

// Check if path needs version handling:
if (needsApiVersion(operation.path)) {
  console.log('This path respects api_version config');
} else {
  console.log('This path has its own versioning');
}

// Build URL - works for ALL path types:
const url = buildFullUrl(
  config.bitbucketUrl,
  operation.path,
  config.apiVersion
);
```

---

## Summary

### Question 1: Environment Variable? ✅
**YES!** Use `BITBUCKET_API_VERSION=1.0` or `BITBUCKET_API_VERSION=latest`

### Question 2: How does it affect API paths? 🎯
**It controls Bitbucket Data Center REST API paths!**

- **`/rest/api/latest/*`** → Modern Bitbucket instances (recommended)
- **`/rest/api/1.0/*`** → Legacy Bitbucket instances
- **Relative paths (e.g., `projects`)** → Uses configured `api_version` to build URL

The `api_version` config controls `/rest/api/X` paths. Paths with explicit versions are preserved.

### Visual Decision Tree:

```
Path to build?
├─ Contains /rest/api/(1.0|latest)/ → Use as-is (explicit version in path)
└─ Relative path (e.g., 'projects') → Prepend /rest/api/{config.apiVersion}/
```

---

## Testing Your Setup

Verify the behavior:

```bash
# Start server with latest (default)
BITBUCKET_API_VERSION=latest npm start

# In another terminal, test different API calls:

# Get projects:
curl http://localhost:3000/call -d '{"operation": "get_projects"}'
# Calls: https://bitbucket.example.com/rest/api/latest/projects

# Get a repository:
curl http://localhost:3000/call -d '{"operation": "getRepository", "params": {"projectKey": "PRJ", "repositorySlug": "my-repo"}}'
# Calls: https://bitbucket.example.com/rest/api/latest/projects/PRJ/repos/my-repo

# Create a repository:
curl http://localhost:3000/call -d '{"operation": "createRepository", "params": {"projectKey": "PRJ", "name": "my-repo", "scmId": "git"}}'
# Calls: https://bitbucket.example.com/rest/api/latest/projects/PRJ/repos
```

Your Bitbucket Data Center instance uses `/rest/api/latest/*` for modern instances or `/rest/api/1.0/*` for legacy instances.
