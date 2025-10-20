# Development Workflow

### Local Development Setup

#### Prerequisites

```bash
# Node.js 22+ LTS
node --version  # Should be >= 18.0.0

# npm 9+
npm --version  # Should be >= 9.0.0

# Git
git --version

# SQLite3 (para sqlite-vec)
sqlite3 --version  # Should be >= 3.41.0

# OpenAI API Key (para embeddings generation)
export OPENAI_API_KEY="sk-..."

# Bitbucket DC test instance (URL + credentials)
export BITBUCKET_URL="https://bitbucket-test.example.com"
export BITBUCKET_TOKEN="your-pat-token"  # ou configurar OAuth2
```

#### Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/bitbucket-dc-mcp-server.git
cd bitbucket-dc-mcp-server

# Install dependencies
npm install

# Generate embeddings database (build-time)
npm run build:openapi     # Download & parse OpenAPI spec
npm run build:schemas     # Generate Zod schemas
npm run build:embeddings  # Generate embeddings via OpenAI
npm run build:db          # Populate sqlite-vec database

# Build TypeScript
npm run build

# Run setup wizard (interactive)
npm run setup

# Or configure via environment variables
export BITBUCKET_URL="https://bitbucket-test.example.com"
export BITBUCKET_AUTH_METHOD="pat"
export BITBUCKET_TOKEN="your-pat-token"
```

#### Development Commands

```bash
# Start MCP server in development mode (watch mode)
npm run dev
# Recompila e reinicia em file changes

# Run linter
npm run lint
npm run lint:fix  # Auto-fix issues

# Run tests
npm test                  # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e          # End-to-end tests
npm run test:coverage     # With coverage report

# Search CLI (standalone testing)
npm run search "create issue"
npm run search -- "update assignee" --limit 10 --verbose

# Check types
npm run type-check

# Build for production
npm run build

# Run production build
node dist/index.js
```

### Environment Configuration

#### Required Environment Variables

```bash
# Frontend (N/A - produto é backend/CLI)

# Backend (.env)
BITBUCKET_URL=https://bitbucket-test.example.com  # Required
BITBUCKET_AUTH_METHOD=pat                    # Required: oauth2|pat|oauth1|basic
BITBUCKET_TOKEN=your-pat-token               # Required if pat
BITBUCKET_USERNAME=user@example.com          # Required if basic
BITBUCKET_PASSWORD=your-password             # Required if basic
BITBUCKET_CLIENT_ID=oauth-client-id          # Required if oauth2
BITBUCKET_CLIENT_SECRET=oauth-secret         # Required if oauth2

# OpenAI (build-time only)
OPENAI_API_KEY=sk-...                   # Required for embeddings generation

# Optional Configuration
LOG_LEVEL=info                          # debug|info|warn|error (default: info)
RATE_LIMIT=100                          # Max req/s (default: 100)
TIMEOUT=30000                           # Request timeout ms (default: 30000)
CACHE_SIZE=1000                         # LRU cache entries (default: 1000)
CIRCUIT_BREAKER_THRESHOLD=5             # Failures to open (default: 5)
CIRCUIT_BREAKER_TIMEOUT=30000           # Reset timeout ms (default: 30000)

# Shared
NODE_ENV=development                    # development|production|test
```

**Config File Alternative (`~/.bitbucket-mcp/config.yml`):**

```yaml
bitbucket_url: https://bitbucket-test.example.com
auth_method: pat  # oauth2|pat|oauth1|basic
# Credentials são armazenados no OS keychain, não no config file

# Optional settings
rate_limit: 100
timeout: 30000
log_level: info
cache_size: 1000

circuit_breaker:
  threshold: 5
  timeout: 30000

retry:
  attempts: 3
  backoff: [100, 500, 2000]  # ms
```

