# Bitbucket Data Center MCP Server

[![CI](https://github.com/guercheLE/bitbucket-dc-mcp/workflows/CI/badge.svg)](https://github.com/guercheLE/bitbucket-dc-mcp/actions)
[![npm version](https://badge.fury.io/js/bitbucket-dc-mcp.svg)](https://www.npmjs.com/package/bitbucket-dc-mcp)
[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL%203.0-blue.svg)](https://www.gnu.org/licenses/lgpl-3.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![Contributing](https://img.shields.io/badge/Contributions-Welcome-blue.svg)](CONTRIBUTING.md)

**Model Context Protocol (MCP) server for Atlassian Bitbucket Data Center** with semantic search and AI-powered workflow automation.

Transform natural language queries into precise Bitbucket API operations. Built for LLMs (Claude, GPT-4, and other MCP-compatible clients) to interact intelligently with Bitbucket Data Center through production-ready semantic search and operation execution.

## Why This Exists

Working with Bitbucket's REST API requires knowing exact endpoint names, HTTP methods, and complex JSON schemas. **This MCP server solves that problem**:

- **Semantic Search**: Ask "create a repository" → get ranked Bitbucket operations with >90% relevance
- **Zero-Config Setup**: Interactive 5-minute wizard handles authentication, credentials, and database setup
- **Production-Ready**: Circuit breakers, rate limiting, retry logic, and secure credential storage (OS keychains)
- **Multi-Auth Support**: OAuth 2.0, Personal Access Tokens, OAuth 1.0a, or Basic Auth

Perfect for teams building AI assistants, automation workflows, or LLM integrations with Bitbucket Data Center.

---

<!-- TODO: Add screenshots once available
## Visual Overview

### Setup Wizard
![Setup Wizard](docs/images/setup-wizard.png)
*Interactive setup wizard completes configuration in under 5 minutes*

### Semantic Search in Action
![Search Results](docs/images/search-results.png)
*Natural language queries return ranked Bitbucket operations with relevance scores*

### Claude Desktop Integration
![Claude Desktop](docs/images/claude-desktop-integration.png)
*Claude Desktop using MCP tools to interact with Bitbucket Data Center*
-->

---

## Table of Contents

- [Key Features](#key-features)
- [Quick Start](#quick-start)
  - [Docker (Recommended)](#docker-recommended)
  - [npm Install](#npm-install)
  - [From Source](#from-source)
- [Usage](#usage)
  - [MCP Tools](#mcp-tools)
  - [Common Workflows](#common-workflows)
- [Installation](#installation)
- [Configuration](#configuration)
- [MCP Client Configuration](#mcp-client-configuration)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)
 - [Contributors](#contributors)

## Key Features

✅ **Semantic Search Engine** - Find Bitbucket operations using natural language with >90% relevance (sqlite-vec embeddings)  
✅ **Three MCP Tools** - `search_ids`, `get_id`, `call_id` for discovery, inspection, and execution  
✅ **Multi-Authentication** - OAuth 2.0, Personal Access Tokens, OAuth 1.0a, Basic Auth with secure OS keychain storage  
✅ **Production Resilience** - Circuit breaker pattern, rate limiting, exponential backoff, automatic retries  
✅ **Zero-Config Setup** - Interactive CLI wizard completes full setup in <5 minutes  
✅ **Structured Logging** - JSON logs with correlation IDs, automatic credential redaction, ELK/Datadog ready  
✅ **Air-Gapped Support** - Local embeddings generation, no external API dependencies  
✅ **Cross-Platform** - Linux, macOS, Windows with Node.js 22+

## Quick Start

Get up and running in under 5 minutes using Docker, npm, or source installation.

### Docker (Recommended)

**Fastest path** - One command to start the MCP server:

```bash
# Pull and run the official image
docker run -it \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_AUTH_METHOD=pat \
  -e BITBUCKET_TOKEN=your-personal-access-token \
  ghcr.io/guercheLE/bitbucket-dc-mcp:latest
```

**Or use docker-compose** for persistent configuration:

```bash
# Clone the repo
git clone https://github.com/guercheLE/bitbucket-dc-mcp.git
cd bitbucket-datacenter-mcp-server

# Configure environment variables in docker-compose.yml
# Start the server
docker-compose up -d
```

**Expected Output:**
```
✅ MCP Server started successfully
🔍 Semantic search ready (500+ Bitbucket operations indexed)
🔐 Authentication configured: Personal Access Token
📡 Listening on stdio transport
```

**Troubleshooting:** If you see connection errors, verify your `BITBUCKET_URL` and credentials. See [Docker Guide](docs/docker.md) for advanced configuration.

### npm Install

**Recommended for local development** - Global CLI with interactive setup:

```bash
# Install globally
npm install -g bitbucket-dc-mcp

# Run setup wizard (interactive prompts)
bitbucket-dc-mcp setup

# Start the MCP server
bitbucket-dc-mcp start
```

The setup wizard will:
1. Ask for your Bitbucket URL (e.g., `https://bitbucket.example.com`)
2. Select authentication method (OAuth 2.0, PAT, OAuth 1.0a, Basic)
3. Securely store credentials in OS keychain
4. Download OpenAPI spec and generate embeddings database
5. Validate connection with health check

**Expected Output:**
```
🚀 Bitbucket MCP Server Setup Wizard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Bitbucket URL configured: https://bitbucket.example.com
✓ Authentication method: Personal Access Token
✓ Credentials stored securely in system keychain
✓ OpenAPI spec downloaded (500 operations)
✓ Embeddings database generated (768-dim vectors)
✓ Connection validated

Setup complete! Start the server with: bitbucket-dc-mcp start
```

**Troubleshooting:** See [Setup Issues](docs/troubleshooting.md#setup-wizard-errors) for common problems.

### From Source

**For contributors and developers** - Build from source:

```bash
# Clone repository
git clone https://github.com/guercheLE/bitbucket-dc-mcp.git
cd bitbucket-datacenter-mcp-server

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run setup wizard
npm run setup

# Start the server
npm start
```

**Expected Output:** Same as npm install method above.

### What's Next?

- **Test the connection:** Run `bitbucket-dc-mcp test-connection` to verify connectivity and authentication
- **Search for operations:** Run `bitbucket-dc-mcp search "create repository"` to test semantic search
- **Get operation details:** Run `bitbucket-dc-mcp get <operationId>` to view operation schema and parameters
- **Start the server:** Run `bitbucket-dc-mcp start` to launch the MCP server
- **Configure MCP client:** Follow [MCP Client Configuration](#mcp-client-configuration) to connect Claude Desktop, Cline, or other clients
- **Explore MCP tools:** See [Usage Examples](#usage) below
- **Configure advanced features:** Check [Configuration Guide](#configuration)

---

---

## CLI Commands

The `bitbucket-dc-mcp` CLI provides several commands for setup, testing, and running the MCP server:

### Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `setup` | Run interactive setup wizard | `bitbucket-dc-mcp setup` |
| `start` | Start the MCP server (stdio mode) | `bitbucket-dc-mcp start` |
| `test-connection` | Test Bitbucket connectivity and authentication | `bitbucket-dc-mcp test-connection` |
| `search <query>` | Search for operations using semantic search | `bitbucket-dc-mcp search "create repository"` |
| `get <operationId>` | Get detailed info about a specific operation | `bitbucket-dc-mcp get createRepository` |
| `call <operationId>` | Execute a Bitbucket operation | `bitbucket-dc-mcp call createRepository --param ...` |
| `config <action>` | Manage configuration (show, validate, path, reset) | `bitbucket-dc-mcp config show` |
| `version` | Show version information | `bitbucket-dc-mcp version` |

### Command Details

#### `bitbucket-dc-mcp setup`

Run the interactive setup wizard to configure your Bitbucket instance and credentials.

**Options:**
- `--force` - Overwrite existing config
- `--non-interactive` - Use environment variables and defaults

**Example:**
```bash
bitbucket-dc-mcp setup
```

#### `bitbucket-dc-mcp start`

Start the MCP server in stdio mode for use with MCP clients.

**Example:**
```bash
bitbucket-dc-mcp start
```

**Note:** This is typically called by your MCP client (Claude Desktop, Cline, etc.) via the client's configuration file.

#### `bitbucket-dc-mcp test-connection`

Verify connectivity and authentication to your Bitbucket Data Center instance.

**Example:**
```bash
bitbucket-dc-mcp test-connection
```

#### `bitbucket-dc-mcp search <query>`

Search for Bitbucket operations using natural language queries.

**Options:**
- `--limit <n>` - Maximum number of results (default: 5)
- `--json` - Output results as JSON
- `--verbose` - Show similarity scores

**Example:**
```bash
bitbucket-dc-mcp search "create repository" --limit 3 --verbose
```

#### `bitbucket-dc-mcp get <operationId>`

Get detailed information about a specific Bitbucket operation including schema, parameters, and examples.

**Options:**
- `--json` - Output results as JSON
- `--verbose` - Show detailed schema and examples

**Example:**
```bash
bitbucket-dc-mcp get createRepository --verbose
```

**Use case:** After using `search` to find operations, use `get` to inspect the operation's schema before calling it.

#### `bitbucket-dc-mcp call <operationId>`

Execute a Bitbucket operation with specified parameters.

**Options:**
- `--param <key=value>` - Operation parameters (can be repeated)
- `--json` - Output raw JSON response
- `--dry-run` - Validate parameters only, do not execute

**Example:**
```bash
bitbucket-dc-mcp call createRepository \
  --param projectKey=TEST \
  --param name=my-repo \
  --param scmId=git
```

#### `bitbucket-dc-mcp config <action>`

Manage configuration settings.

**Actions:**
- `show` - Display current configuration
- `validate` - Validate configuration file
- `path` - Show config file path
- `reset` - Reset configuration to defaults

**Example:**
```bash
bitbucket-dc-mcp config show
bitbucket-dc-mcp config validate
```

#### `bitbucket-dc-mcp version`

Show version information for the MCP server.

**Options:**
- `--check-updates` - Check for available updates

**Example:**
```bash
bitbucket-dc-mcp version --check-updates
```

---

## Usage

The MCP server provides both **CLI commands** for direct interaction and **MCP tools** for integration with LLM clients.

### CLI Commands

The `bitbucket-dc-mcp` CLI provides several commands for setup, testing, and operation:

#### Core Commands

```bash
# Setup wizard - Interactive configuration
bitbucket-dc-mcp setup

# Start the MCP server in stdio mode
bitbucket-dc-mcp start

# Test connection and authentication
bitbucket-dc-mcp test-connection

# Display version information
bitbucket-dc-mcp version [--check-updates]
```

#### Operation Discovery Commands

```bash
# Search for operations using semantic search
bitbucket-dc-mcp search "create issue" [--limit 5] [--json] [--verbose]

# Get detailed information about a specific operation
bitbucket-dc-mcp get <operationId> [--json] [--verbose]

# Execute a Bitbucket operation
bitbucket-dc-mcp call <operationId> [--param key=value] [--json] [--dry-run]
```

#### Configuration Commands

```bash
# Show current configuration
bitbucket-dc-mcp config show

# Validate configuration file
bitbucket-dc-mcp config validate

# Show configuration file path
bitbucket-dc-mcp config path

# Reset configuration to defaults
bitbucket-dc-mcp config reset
```

#### Examples

```bash
# Search for repository creation operations
bitbucket-dc-mcp search "create repository" --limit 3

# Get detailed schema for createRepository operation
bitbucket-dc-mcp get createRepository --verbose

# Execute an operation (dry-run mode)
bitbucket-dc-mcp call createRepository --param projectKey=TEST --dry-run

# Check for updates
bitbucket-dc-mcp version --check-updates
```

**For comprehensive CLI usage, run:** `bitbucket-dc-mcp --help`

---

### MCP Tools

The MCP server exposes **three tools** for interacting with Bitbucket Data Center. Use these tools from any MCP client (Claude Desktop, custom LLM applications, etc.).

#### 1. `search_ids` - Semantic Search for Operations

Find relevant Bitbucket API operations using natural language queries.

**Input:**
- `query` (string, required): Natural language description (e.g., "create repository", "update branch permissions")
- `limit` (number, optional): Maximum results to return (1-20, default: 5)

**Output:**
- `operations` (array): Ranked list of matching operations with:
  - `operation_id`: Bitbucket API operation identifier
  - `summary`: Human-readable description
  - `similarity_score`: Relevance score (0.0-1.0, higher is better)

**Example:**
```json
{
  "tool": "search_ids",
  "input": {
    "query": "create a new repository",
    "limit": 3
  }
}
```

**Response:**
```json
{
  "operations": [
    {
      "operation_id": "createRepository",
      "summary": "Create a new repository in a project",
      "similarity_score": 0.94
    },
    {
      "operation_id": "forkRepository",
      "summary": "Fork an existing repository",
      "similarity_score": 0.85
    },
    {
      "operation_id": "updateRepository",
      "summary": "Update repository settings",
      "similarity_score": 0.78
    }
  ]
}
```

---

#### 2. `get_id` - Retrieve Operation Details

Get complete schema, documentation, and examples for a specific Bitbucket operation.

**Input:**
- `operation_id` (string, required): Bitbucket operation ID (from `search_ids` results)

**Output:**
- `operation_id`: Operation identifier
- `summary`: Brief description
- `description`: Detailed documentation
- `method`: HTTP method (GET, POST, PUT, DELETE)
- `path`: API endpoint path
- `parameters`: Request parameters schema (path, query, body)
- `responses`: Response schemas by status code
- `examples`: Request/response examples (if available)

**Example:**
```json
{
  "tool": "get_id",
  "input": {
    "operation_id": "createRepository"
  }
}
```

**Response:**
```json
{
  "operation_id": "createRepository",
  "summary": "Create repository",
  "method": "POST",
  "path": "/rest/api/latest/projects/{projectKey}/repos",
  "parameters": {
    "path": {
      "projectKey": {
        "type": "string",
        "required": true,
        "description": "The project key"
      }
    },
    "body": {
      "type": "object",
      "required": ["name", "scmId"],
      "properties": {
        "name": { "type": "string" },
        "scmId": { "type": "string" },
        "forkable": { "type": "boolean" }
      }
    }
  },
  "responses": {
    "201": {
      "description": "The created repository",
      "content": {
        "slug": "my-repo",
        "id": 1,
        "name": "My repo",
        "project": { "key": "PRJ" }
      }
    }
  }
}
```

---

#### 3. `call_id` - Execute Bitbucket Operation

Execute a Bitbucket API operation with validated parameters and error handling.

**Input:**
- `operation_id` (string, required): Bitbucket operation ID
- `parameters` (object, required): Operation parameters matching the schema from `get_id`
  - `path`: Path parameters (e.g., `{ "issueIdOrKey": "PROJ-123" }`)
  - `query`: Query parameters (e.g., `{ "fields": "summary,status" }`)
  - `body`: Request body for POST/PUT operations

**Output:**
- API response from Bitbucket (varies by operation)

**Example - Create Issue:**
```json
{
  "tool": "call_id",
  "input": {
    "operation_id": "createIssue",
    "parameters": {
      "body": {
        "fields": {
          "project": { "key": "PROJ" },
          "summary": "Bug: Login page not loading",
          "issuetype": { "name": "Bug" },
          "priority": { "name": "High" }
        }
      }
    }
  }
}
```

**Response:**
```json
{
  "id": "10042",
  "key": "PROJ-123",
  "self": "https://bitbucket.example.com/rest/api/3/issue/10042"
}
```

**Example - Get Issue:**
```json
{
  "tool": "call_id",
  "input": {
    "operation_id": "getIssue",
    "parameters": {
      "path": { "issueIdOrKey": "PROJ-123" },
      "query": { "fields": "summary,status,assignee" }
    }
  }
}
```

---

### Common Workflows

#### Workflow 1: Find and Create an Issue

```
1. search_ids({ query: "create issue" })
   → Returns: operation_id = "createIssue"

2. get_id({ operation_id: "createIssue" })
   → Returns: Full schema with required fields

3. call_id({
     operation_id: "createIssue",
     parameters: { body: { fields: { ... } } }
   })
   → Returns: Created issue with key PROJ-123
```

#### Workflow 2: Update Issue Assignee

```
1. search_ids({ query: "assign issue to user" })
   → Returns: operation_id = "assignIssue"

2. get_id({ operation_id: "assignIssue" })
   → Returns: Schema showing accountId parameter required

3. call_id({
     operation_id: "assignIssue",
     parameters: {
       path: { issueIdOrKey: "PROJ-123" },
       body: { accountId: "5b10a2..." }
     }
   })
   → Returns: 204 No Content (success)
```

#### Workflow 3: Bulk Operations Discovery

```
1. search_ids({ query: "bulk edit issues", limit: 10 })
   → Returns: Multiple bulk operations ranked by relevance

2. get_id({ operation_id: "bulkEditIssues" })
   → Returns: Schema for bulk edit payload

3. call_id({ ... })
   → Execute bulk operation
```

**See [Cookbook](docs/cookbook.md) for 20+ practical examples and advanced patterns.**

---

## Installation

### Prerequisites

- **Node.js 22+** (LTS recommended) - [Download](https://nodejs.org)
- **npm 9+** (included with Node.js)
- **Bitbucket Data Center** instance with API access
- **Valid credentials**: OAuth 2.0, Personal Access Token, OAuth 1.0a, or Basic Auth

### Installation Methods

Choose the installation method that fits your workflow:

| Method | Best For | Time | Difficulty |
|--------|----------|------|------------|
| **Docker** | Production deployments, containerized environments | 2 min | Easy ⭐ |
| **npm Global** | Local development, CLI usage | 5 min | Easy ⭐ |
| **From Source** | Contributors, custom builds | 10 min | Moderate ⭐⭐ |

**Detailed instructions:** See [Quick Start](#quick-start) section above.

---

## Configuration

The server supports **four configuration methods** (priority order):

1. **CLI Flags** (highest priority)
2. **Environment Variables**
3. **Config File** (`~/.bitbucket-dc-mcp/config.yml`)
4. **Defaults**

### Environment Variables

```bash
# Required
BITBUCKET_URL=https://bitbucket.example.com              # Bitbucket Data Center URL
BITBUCKET_AUTH_METHOD=pat                            # Auth method: oauth2, pat, oauth1, basic
BITBUCKET_TOKEN=your-token                           # Token (for PAT/Basic)

# Optional - API Configuration
BITBUCKET_API_VERSION=latest                         # API version: 1.0 (legacy) or latest (modern)
                                                # Auto-detected during setup

# Optional - Performance
RATE_LIMIT_MAX_REQUESTS=100                     # Max requests per minute
REQUEST_TIMEOUT_MS=30000                        # Request timeout (milliseconds)
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5             # Failures before circuit opens

# Optional - Logging
LOG_LEVEL=INFO                                  # DEBUG, INFO, WARN, ERROR
LOG_OUTPUT=stdout                               # stdout, file, both
LOG_FILE_PATH=./logs/bitbucket-dc-mcp.log              # Log file location
```

### Config File Example

Create `~/.bitbucket-dc-mcp/config.yml`:

```yaml
bitbucket:
  url: https://bitbucket.example.com
  auth_method: oauth2
  api_version: "latest"  # Auto-detected during setup (1.0 for legacy, latest for modern)
  
performance:
  rate_limit: 100
  timeout: 30000
  retry_max_attempts: 3
  
logging:
  level: INFO
  output: stdout
  
circuit_breaker:
  failure_threshold: 5
  timeout: 30000
```

**Run setup wizard to generate config automatically:** `bitbucket-dc-mcp setup`

**Full configuration reference:** See [Configuration Guide](docs/internal/architecture/backend-architecture.md#configuration)

### API Version Detection

The server automatically detects which REST API version your Bitbucket instance supports during setup:

- **API latest**: Modern Bitbucket Data Center instances (recommended)
- **API 1.0**: Legacy Bitbucket Data Center instances

The detected version is saved to your configuration and used automatically for all API calls. You can override it using the `BITBUCKET_API_VERSION` environment variable if needed.

**For detailed information, see:**
- [API Version Detection Guide](docs/api-version-detection.md) - Complete guide on API version detection
- [API Version FAQ](docs/api-version-faq.md) - Frequently asked questions

---

## MCP Client Configuration

Configure the Bitbucket MCP server in your MCP-compatible client (Claude Desktop, Cline, etc.).

### Claude Desktop

Edit your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux:** `~/.config/Claude/claude_desktop_config.json`

#### Option 1: Using npx (Recommended)

```json
{
  "mcpServers": {
    "bitbucket-datacenter": {
      "command": "npx",
      "args": [
        "-y",
        "bitbucket-dc-mcp@latest",
        "start"
      ],
      "env": {
        "BITBUCKET_URL": "https://bitbucket.example.com",
        "BITBUCKET_AUTH_METHOD": "pat",
        "BITBUCKET_TOKEN": "your-personal-access-token"
      }
    }
  }
}
```

#### Option 2: Using Local Installation

```json
{
  "mcpServers": {
    "bitbucket-datacenter": {
      "command": "node",
      "args": [
        "/usr/local/lib/node_modules/bitbucket-dc-mcp/dist/index.js"
      ],
      "env": {
        "BITBUCKET_URL": "https://bitbucket.example.com",
        "BITBUCKET_AUTH_METHOD": "pat",
        "BITBUCKET_TOKEN": "your-personal-access-token"
      }
    }
  }
}
```

#### Option 3: Using Source (Development)

```json
{
  "mcpServers": {
    "bitbucket-datacenter-local": {
      "command": "node",
      "args": [
        "/path/to/bitbucket-dc-mcp/dist/index.js"
      ],
      "env": {
        "BITBUCKET_URL": "https://bitbucket.example.com",
        "BITBUCKET_AUTH_METHOD": "pat",
        "BITBUCKET_TOKEN": "your-personal-access-token",
        "LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

### Cline (VS Code Extension)

Add to Cline's MCP settings:

```json
{
  "mcpServers": {
    "bitbucket-datacenter": {
      "command": "npx",
      "args": ["-y", "bitbucket-dc-mcp@latest", "start"],
      "env": {
        "BITBUCKET_URL": "https://bitbucket.example.com",
        "BITBUCKET_AUTH_METHOD": "pat",
        "BITBUCKET_TOKEN": "your-token"
      }
    }
  }
}
```

### Other MCP Clients

For other MCP-compatible clients, use the stdio transport:

**Command:** `npx -y bitbucket-dc-mcp@latest start`  
**Transport:** stdio  
**Environment Variables:**
- `BITBUCKET_URL` - Your Bitbucket Data Center URL
- `BITBUCKET_AUTH_METHOD` - Authentication method (pat, oauth2, oauth1, basic)
- `BITBUCKET_TOKEN` - Your authentication token
- `LOG_LEVEL` - Optional: DEBUG, INFO, WARN, ERROR

### Verifying Configuration

After configuring your MCP client:

1. **Restart the client** (Claude Desktop, Cline, etc.)
2. **Check for errors** in the client's MCP server logs
3. **Test the connection** by asking: "Search for Bitbucket operations to create an issue"
4. **Verify tools appear** in the client's available tools list:
   - `search_ids` - Semantic search for Bitbucket operations
   - `get_id` - Get operation details and schema
   - `call_id` - Execute Bitbucket API operations

### Troubleshooting MCP Client Issues

**Server not appearing in client:**
- Verify JSON syntax is valid (no trailing commas, proper quotes)
- Check file path in configuration is correct
- Restart the MCP client completely

**Connection errors:**
- Verify `BITBUCKET_URL` is accessible from your machine
- Check `BITBUCKET_TOKEN` is valid and not expired
- Review MCP server logs: Set `LOG_LEVEL=DEBUG` for detailed output

**Tools not working:**
- Ensure embeddings database exists: Run `npm run populate-db` if needed
- Check permissions: Token must have READ and WRITE scopes
- Verify operation IDs are valid: Use `search_ids` to find correct IDs

**Full troubleshooting guide:** See [Troubleshooting](docs/troubleshooting.md)

---

## Project Structure

```text
bitbucket-dc-mcp/
├── .github/workflows/    # GitHub Actions CI/CD workflows
├── src/                  # Source code (TypeScript)
│   ├── auth/            # Authentication strategies
│   ├── core/            # Core services (config, logger, errors)
│   ├── services/        # Business logic (semantic search, operations)
│   ├── tools/           # MCP tool implementations
│   └── cli/             # CLI utilities (setup wizard, search test)
├── tests/                # Test suites (unit, integration, e2e)
├── scripts/              # Build and automation scripts
├── docs/                 # Project documentation
├── data/                 # Generated data artifacts (gitignored)
└── dist/                 # Compiled output (generated)
```

---

## Documentation

Comprehensive guides and references:

| Resource | Description |
|----------|-------------|
| **[Architecture Overview](docs/internal/architecture.md)** | System design, components, data flow |
| **[Authentication Guide](docs/authentication.md)** | OAuth 2.0, PAT, OAuth 1.0a setup and troubleshooting |
| **[API Version Detection](docs/api-version-detection.md)** | API version detection and configuration guide |
| **[API Version FAQ](docs/api-version-faq.md)** | Frequently asked questions about API versions |
| **[Cookbook](docs/cookbook.md)** | 20+ practical examples and code snippets |
| **[Docker Deployment](docs/docker.md)** | Container setup, environment variables, docker-compose |
| **[Troubleshooting Guide](docs/troubleshooting.md)** | Common issues and solutions |
| **[API Reference](docs/internal/architecture/api-specification.md)** | Complete MCP tools specification |
| **[Testing Strategy](docs/internal/architecture/testing-strategy.md)** | Unit, integration, E2E test patterns |
| **[Observability](docs/observability.md)** | Logging, monitoring, alerting setup |

### Getting Help

- **🐛 Bug Reports:** [Open an issue](https://github.com/guercheLE/bitbucket-dc-mcp/issues/new?template=bug_report.md)
- **💡 Feature Requests:** [Request a feature](https://github.com/guercheLE/bitbucket-dc-mcp/issues/new?template=feature_request.md)
- **❓ Questions:** [Discussions](https://github.com/guercheLE/bitbucket-dc-mcp/discussions)
- **📧 Email:** Open a GitHub issue for fastest response

---

## Development

### Development Commands

```bash
npm run build          # Compile TypeScript to dist/
npm run dev            # Watch mode compilation
npm run test           # Execute Vitest test suite
npm run test:benchmark  # Run semantic search relevance benchmark suite
npm run test:coverage  # Generate coverage reports
npm run lint           # Run ESLint checks on src/
npm run format         # Apply Prettier formatting
npm run format:check   # Verify formatting without making changes
```

### CLI Commands (Post-Build)

After building, you can test CLI commands locally:

```bash
npm run setup          # Run setup wizard
npm run start          # Start MCP server
node dist/cli.js search "create issue"  # Test search command
node dist/cli.js get createIssue        # Test get command
node dist/cli.js test-connection        # Test connection
```

### OpenAPI Spec Processing

Download and process the Bitbucket Data Center OpenAPI specification:

```bash
npm run download-openapi                       # Download from default Atlassian URL
npm run download-openapi -- --url <url>        # Download from a custom URL
npm run download-openapi -- --local <path>     # Load a locally stored spec file
```

Outputs: `data/operations.json` and `data/schemas.json` with metadata.

### Semantic Search CLI

Use the interactive CLI to validate semantic search behaviour without running the full benchmark suite:

```bash
npm run search "create issue"              # Default settings (limit 5, threshold 0)
npm run search "update assignee" -- --limit 3
npm run search "bulk update" -- --threshold 0.85 --verbose
npm run search "create project" -- --benchmark
npm run search -- --batch queries.txt --limit 8 --benchmark
```

Key flags:

- `--limit <n>` limits the maximum number of rows returned (1–100).
- `--threshold <score>` filters out low-similarity matches (0.0–1.0).
- `--verbose` adds the full operation description column.
- `--benchmark` compares the results against precision targets from the benchmark suite and prints Precision@5.
- `--batch <file>` executes multiple queries listed one per line, skipping blank lines automatically.

Score colours highlight relevance: green ✅ for ≥0.85, yellow ⚠️ for 0.70–0.84, and red ❌ below 0.70. Example output:

```text
Query: create issue
┌──────┬────────────────────────────────────────┬────────────────────────────────────────┬────────────────┐
│ Rank │ Operation ID                           │ Summary                                │ Score          │
├──────┼────────────────────────────────────────┼────────────────────────────────────────┼────────────────┤
│ 1    │ create_reciprocal_remote_issue_link     │ Summary for create issue 1             │ 0.95 ✅         │
│ 2    │ create_issue_link_type                  │ Summary for create issue 2             │ 0.90 ✅         │
└──────┴────────────────────────────────────────┴────────────────────────────────────────┴────────────────┘
Found 5 result(s) matching "create issue" (limit 5, threshold 0.00)
✅ Precision@5: 100.0% (required 85.0%)
```

Troubleshooting:

- `Database not found. Run "npm run populate-db" first.` → Seed the embeddings database with `npm run populate-db`.
- `sqlite-vec extension is required to query the embeddings database.` → Ensure the extension is installed and accessible to your SQLite build.

---

## Contributing

We welcome contributions! Here's how to get started:

See our full guidelines in [CONTRIBUTING.md](CONTRIBUTING.md) and please follow our [Code of Conduct](CODE_OF_CONDUCT.md).

When opening an issue or pull request:
- Use the [issue templates](.github/ISSUE_TEMPLATE) for bugs, features, and questions
- Follow the [PR template](.github/PULL_REQUEST_TEMPLATE.md) and checklist

### Quick Start

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Make** your changes following [Coding Standards](docs/internal/architecture/coding-standards.md)
4. **Test** your changes: `npm test` (must pass)
5. **Lint** your code: `npm run lint && npm run format:check`
6. **Commit** with conventional commits: `feat: add feature` or `fix: resolve bug`
7. **Push** and **open** a Pull Request

### Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/bitbucket-datacenter-mcp-server.git
cd bitbucket-datacenter-mcp-server
npm install
npm run build
npm test
```

### Coding Standards

- ✅ TypeScript strict mode - No `any` without justification
- ✅ Test coverage ≥80% - All features require tests
- ✅ Conventional commits - Semantic commit messages
- ✅ ESLint + Prettier - Run before committing
- ❌ No console.log - Use Logger (pino)

**Full guide:** [Coding Standards](docs/internal/architecture/coding-standards.md)

### Testing Requirements

The project has a comprehensive test suite organized into different categories:

**Test Types:**
- **Unit Tests** (`tests/unit/`) - Fast, isolated tests (run by default)
- **Integration Tests** (`tests/integration/`) - Service interactions (opt-in)
- **E2E Tests** (`tests/e2e/`) - Full MCP protocol flows (opt-in)
- **Benchmarks** (`tests/benchmarks/`) - Maintain >85% search precision

**Running Tests:**
```bash
# Unit tests only (default, fast)
npm test

# Unit tests (explicit)
npm run test:unit

# Integration tests (requires Docker for some tests)
npm run test:integration

# E2E tests (requires configured environment)
npm run test:e2e

# All tests (unit + integration + e2e)
npm run test:all

# With coverage
npm run test:coverage
```

**Environment Variables:**
- `RUN_INTEGRATION_TESTS=true` - Enable integration tests
- `RUN_E2E_TESTS=true` - Enable E2E tests
- `E2E_USE_REAL_BITBUCKET=true` - Use real Bitbucket instance for E2E

**For detailed testing documentation, see [tests/README.md](tests/README.md)**

---

## License

**LGPL-3.0 License** - see [LICENSE](LICENSE) for details.

✅ Commercial use, modification, distribution, private use, patent use  
❌ No liability, no warranty  
⚠️ License and copyright notice required, disclose source, state changes  
📋 Must keep same license for library, but applications using it can use different licenses

---

## Contributors

Thanks to all our contributors! ✨

- Read our [Contributing Guide](CONTRIBUTING.md) and follow our [Code of Conduct](CODE_OF_CONDUCT.md)
- See everyone who has contributed on the [GitHub contributors page](https://github.com/guercheLE/bitbucket-dc-mcp/graphs/contributors)

---
## Acknowledgments

Built with excellent open-source tools:

- [@modelcontextprotocol/sdk](https://github.com/anthropics/mcp) - MCP implementation by Anthropic
- [sqlite-vec](https://github.com/asg017/sqlite-vec) - Vector search for SQLite
- [@xenova/transformers](https://github.com/xenova/transformers.js) - Local embeddings
- [Zod](https://github.com/colinhacks/zod) - TypeScript schema validation
- [pino](https://github.com/pinojs/pino) - High-performance JSON logger
- [Vitest](https://vitest.dev) - Testing framework

Special thanks to the Bitbucket Data Center team for comprehensive API documentation.

---

## Security

### Secure Credential Storage

Credentials are **never stored in plaintext**. The server uses OS-native keychains for secure storage:

- **macOS**: Keychain Services via Security framework
- **Windows**: Credential Manager
- **Linux**: Secret Service API (libsecret)

When OS keychain is unavailable, credentials are encrypted using AES-256-GCM with machine-specific keys before being stored locally.

All credential operations automatically redact sensitive data from logs and error messages.

For authentication setup and credential management details, see:
- [Authentication Guide](docs/authentication.md) - Comprehensive security features and troubleshooting
- [Cookbook](docs/cookbook.md) - Practical examples for credential management

## Resilience & Fault Tolerance

### Circuit Breaker Pattern

The server implements a **circuit breaker pattern** to protect against cascading failures when Bitbucket Data Center is experiencing issues:

- **Automatic failure detection**: Opens circuit after 5 consecutive failures OR 50% failure rate in 10-second window
- **Fail-fast behavior**: When circuit is OPEN, requests are rejected immediately without calling Bitbucket
- **Self-healing**: After 30-second timeout, circuit attempts health check to automatically recover
- **Observable**: Comprehensive structured logging and metrics for monitoring circuit state

This prevents overwhelming Bitbucket during outages and enables graceful degradation of service.

**Configuration**: Circuit breaker thresholds can be tuned via environment variables:
```bash
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5     # Consecutive failures before opening
CIRCUIT_BREAKER_FAILURE_RATE=0.5        # Failure rate threshold (0-1)
CIRCUIT_BREAKER_WINDOW_SIZE=10000       # Time window in milliseconds
CIRCUIT_BREAKER_TIMEOUT=30000           # Reset timeout in milliseconds
```

For detailed architecture and troubleshooting, see [Backend Architecture - Circuit Breaker](docs/internal/architecture/backend-architecture.md#circuit-breaker-pattern).

## Logging & Observability

The server provides **structured JSON logging** with correlation IDs for request tracing and comprehensive observability:

- **Structured logs**: All logs are JSON with consistent schema for log aggregation tools (ELK, Datadog, Splunk)
- **Correlation IDs**: Every MCP request gets a unique UUID that propagates through all related logs
- **Sensitive data protection**: Automatic redaction of passwords, tokens, credentials (replaced with `***`)
- **Audit trail**: All mutations (POST/PUT/DELETE) automatically logged with user, timestamp, and parameters
- **Performance metrics**: Request latency, cache hit rates, circuit breaker states

**Configuration**:
```bash
# Log level (DEBUG, INFO, WARN, ERROR)
LOG_LEVEL=INFO                       # Default: INFO

# Log output destination
LOG_OUTPUT=stdout                    # Options: stdout, file, both

# File output settings (when LOG_OUTPUT=file or both)
LOG_FILE_PATH=./logs/bitbucket-dc-mcp.log   # Log file location
LOG_ROTATION=daily                   # Options: daily, hourly, size-based
LOG_MAX_SIZE=100                     # Max file size in MB before rotation
LOG_MAX_FILES=7                      # Number of rotated files to keep
```

**Example log entry**:
```json
{
  "level": "info",
  "time": 1705320000000,
  "correlation_id": "req-abc-123",
  "service": "bitbucket-dc-mcp",
  "version": "1.0.0",
  "event": "call_id.execution_success",
  "tool_name": "call_id",
  "operation_id": "create_issue",
  "method": "POST",
  "path": "/rest/api/3/issue",
  "status": 201,
  "latency_ms": 342,
  "msg": "Operation executed successfully"
}
```

**Quick troubleshooting**:
```bash
# Find all logs for a specific request
cat logs/bitbucket-dc-mcp.log | jq 'select(.correlation_id == "req-abc-123")'

# Find all errors
cat logs/bitbucket-dc-mcp.log | jq 'select(.level == "error")'

# Find slow operations (>1 second)
cat logs/bitbucket-dc-mcp.log | jq 'select(.latency_ms > 1000)'

# View audit trail
cat logs/bitbucket-dc-mcp.log | jq 'select(.audit_type == "mutation")'
```

For comprehensive logging setup, integration with log aggregators, and alert recommendations, see:
- [Observability Guide](docs/observability.md) - Complete logging, monitoring, and alerting setup
- [Cookbook](docs/cookbook.md) - Practical logging examples and troubleshooting

