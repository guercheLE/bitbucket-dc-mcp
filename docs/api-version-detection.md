# API Version Detection

## Overview

The Bitbucket DC MCP Server uses the appropriate REST API version for your Bitbucket Data Center instance. Bitbucket Data Center supports:

- **API latest**: Modern Bitbucket Data Center instances (recommended)
- **API 1.0**: Legacy Bitbucket Data Center instances

## How It Works

### 1. Configuration During Setup

When you run the setup wizard, it:

1. Tests connectivity to `/rest/api/latest/application-properties`
2. Defaults to `latest` for modern instances
3. Saves the API version to your config file

```bash
npm run setup
```

**Example output:**
```
Testing connection...
✓ Connection successful to Bitbucket Data Center
```

### 2. Configuration Storage

The API version is saved in two places:

**Config file** (`~/.bitbucket-dc-mcp/config.yml`):
```yaml
bitbucket_url: https://bitbucket.example.com
auth_method: pat
api_version: "latest"  # Default for modern instances
rate_limit: 100
timeout: 30000
log_level: info
cache_size: 1000
retry_attempts: 3
```

**Environment variable** (optional override):
```bash
export BITBUCKET_API_VERSION=latest
```

### 3. Runtime Usage

The MCP server automatically uses the configured API version for all API calls:

```typescript
import { buildApiUrl } from './core/api-url-builder';
import { ConfigManager } from './core/config-manager';

const config = await ConfigManager.load();

// Builds URL with correct API version
const url = buildApiUrl(
  config.bitbucketUrl,
  config.apiVersion,  // '1.0' or 'latest'
  'projects'
);

// For legacy: https://bitbucket.example.com/rest/api/1.0/projects
// For modern: https://bitbucket.example.com/rest/api/latest/projects
```

## API URL Builder Utilities

The server provides utilities for working with different API versions:

### `buildApiUrl(baseUrl, apiVersion, endpoint)`

Build a complete API URL with the correct version:

```typescript
import { buildApiUrl } from './core/api-url-builder';

buildApiUrl('https://bitbucket.example.com', 'latest', 'projects');
// Returns: https://bitbucket.example.com/rest/api/latest/projects
```

### `convertApiPath(path, targetVersion)`

Convert an existing API path to a different version:

```typescript
import { convertApiPath } from './core/api-url-builder';

convertApiPath('/rest/api/latest/projects', '1.0');
// Returns: /rest/api/1.0/projects
```

### `extractApiVersion(urlOrPath)`

Detect the API version from a URL or path:

```typescript
import { extractApiVersion } from './core/api-url-builder';

extractApiVersion('https://bitbucket.example.com/rest/api/latest/projects');
// Returns: 'latest'
```

### `buildFullUrl(baseUrl, path, defaultApiVersion)`

Build a URL, preserving any API version already in the path:

```typescript
import { buildFullUrl } from './core/api-url-builder';

buildFullUrl('https://bitbucket.example.com', 'projects', 'latest');
// Returns: https://bitbucket.example.com/rest/api/latest/projects
```

## Manual Configuration

If you need to change the API version:

### Via Config File

Edit `~/.bitbucket-dc-mcp/config.yml`:

```yaml
api_version: "latest"  # Use "latest" or "1.0"
```

### Via Environment Variable

```bash
export BITBUCKET_API_VERSION=latest
npm start
```

### Via CLI Override

```bash
npm start -- --api-version=latest
```

## Troubleshooting

### Need to Use Legacy API

If you need to use the legacy API version:

1. Edit your config file manually:
   ```yaml
   api_version: "1.0"  # Use "1.0" for legacy instances
   ```

2. Or set environment variable:
   ```bash
   export BITBUCKET_API_VERSION=1.0
   ```

### Testing API Version

Test which API version your Bitbucket Data Center instance supports:

```bash
# Test API latest (modern instances)
curl https://your-bitbucket-url/rest/api/latest/application-properties

# Test API 1.0 (legacy instances)
curl https://your-bitbucket-url/rest/api/1.0/application-properties
```

The one that returns a valid JSON response (not 404) is the correct version.

### Bitbucket Data Center API Versions

| Bitbucket Version | API Version | Notes |
|------------------|-------------|-------|
| Modern instances | `latest` | Recommended, automatically maps to current API |
| Legacy instances | `1.0` | Older Bitbucket Data Center versions |

## API Compatibility

Bitbucket Data Center REST API endpoints:

| Endpoint | 1.0 | latest |
|----------|-----|--------|
| `/projects` | ✅ | ✅ |
| `/projects/{projectKey}/repos` | ✅ | ✅ |
| `/admin/*` | ✅ | ✅ |
| `/users` | ✅ | ✅ |
| `/application-properties` | ✅ | ✅ |

The server handles API calls automatically based on the configured version.

## Configuration Changes

If you need to change the API version:

1. Edit your config file:
   ```bash
   # ~/.bitbucket-dc-mcp/config.yml
   api_version: "latest"  # or "1.0"
   ```

2. Restart the MCP server:
   ```bash
   npm start
   ```

The server adapts automatically to the configured version!
