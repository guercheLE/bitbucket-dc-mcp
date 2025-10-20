# API Reference

Complete API reference for the Bitbucket Data Center MCP Server tools.

## Table of Contents

- [Introduction](#introduction)
- [Quick Start](#quick-start)
- [CLI Commands](#cli-commands)
- [MCP Tools](#mcp-tools)
  - [search_ids](#search_ids)
  - [get_id](#get_id)
  - [call_id](#call_id)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)

---

## Introduction

The Bitbucket Data Center MCP Server exposes three core tools via the Model Context Protocol (MCP). These tools enable Large Language Models (LLMs) to discover, retrieve, and execute Bitbucket API operations through a semantic search interface.

### MCP Protocol Overview

MCP uses **stdio transport** for communication, not traditional REST APIs. All interactions follow the JSON-RPC 2.0 protocol over stdin/stdout.

**Key Concepts**:
- **Tools**: MCP-exposed functions that LLMs can invoke
- **stdio Transport**: Communication via standard input/output streams
- **JSON-RPC 2.0**: Message format for requests and responses
- **Semantic Search**: Natural language queries mapped to operation IDs via vector embeddings

**Communication Flow**:
```
LLM → MCP Client → stdio → MCP Server → Bitbucket API
                   ↓
            JSON-RPC Request
```

**Example JSON-RPC Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_ids",
    "arguments": {
      "query": "create issue",
      "limit": 5
    }
  }
}
```

**Example JSON-RPC Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"operations\":[{\"operation_id\":\"create_issue\",\"summary\":\"Create issue\",\"similarity_score\":0.95}]}"
      }
    ]
  }
}
```

### Authentication

All MCP tools automatically use stored credentials configured during setup. See [Authentication Setup Guide](./authentication.md) for configuration details.

Supported authentication methods:
- **OAuth 2.0** (recommended for production)
- **Personal Access Token (PAT)** (recommended for development)
- **Basic Authentication** (legacy, not recommended)

---

## Quick Start

### Prerequisites

1. **Install the MCP Server**:
   ```bash
   npm install -g @your-org/bitbucket-datacenter-mcp-server
   ```

2. **Configure Authentication**:
   ```bash
   bitbucket-mcp setup
   ```
   Follow the interactive wizard to configure your Bitbucket instance and credentials.

3. **Connect MCP Client**:
   Configure your MCP client (e.g., Claude Desktop, custom client) to connect via stdio:

   **Example: Claude Desktop Configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`)**:
   ```json
   {
     "mcpServers": {
       "bitbucket-datacenter": {
         "command": "bitbucket-mcp",
         "args": ["start"],
         "env": {
           "LOG_LEVEL": "info"
         }
       }
     }
   }
   ```

---

## CLI Commands

The Bitbucket DC MCP Server provides a comprehensive CLI for setup, testing, and direct operation execution. These commands can be used independently or to test functionality before integrating with MCP clients.

### Available Commands

```bash
bitbucket-dc-mcp setup              # Interactive setup wizard
bitbucket-dc-mcp start              # Start MCP server (stdio mode)
bitbucket-dc-mcp test-connection    # Test Bitbucket connectivity
bitbucket-dc-mcp search <query>     # Search for operations
bitbucket-dc-mcp get <operationId>  # Get operation details
bitbucket-dc-mcp call <operationId> # Execute an operation
bitbucket-dc-mcp config <action>    # Manage configuration
bitbucket-dc-mcp version            # Show version info
```

**For detailed CLI examples and usage, see the [Cookbook - CLI Command Examples](./cookbook.md#cli-command-examples).**

---

### Basic Workflow

The typical workflow involves three steps:

1. **Search for operations** using natural language:
   ```
   LLM: "I want to create a new issue"
   → Call search_ids with query="create issue"
   → Receive operation_id="create_issue"
   
   CLI: bitbucket-dc-mcp search "create issue"
   ```

2. **Get operation schema** to understand required parameters:
   ```
   → Call get_id with operation_id="create_issue"
   → Receive schema with required fields (project, summary, issuetype)
   
   CLI: bitbucket-dc-mcp get create_issue --verbose
   ```

3. **Execute operation** with validated parameters:
   ```
   → Call call_id with operation_id="create_issue" and parameters
   → Receive success response with created issue data
   ```

---

## MCP Tools

### search_ids

Semantic search for Bitbucket operations using natural language queries.

#### Description

The `search_ids` tool enables LLMs to discover relevant Bitbucket API operations by converting natural language queries into vector embeddings and performing cosine similarity search against a pre-indexed database of 500+ Bitbucket operations.

**Use Cases**:
- "How do I create an issue?"
- "Find operations related to updating assignees"
- "Search for sprint management operations"

**Technology**:
- **Embeddings Model**: all-mpnet-base-v2 (768 dimensions)
- **Vector Database**: sqlite-vec with cosine similarity
- **Search Algorithm**: k-nearest neighbors with similarity threshold

#### Input Schema

```typescript
interface SearchIdsInput {
  query: string;        // Natural language query (required, min 1 char)
  limit?: number;       // Max results to return (optional, default 5, range 1-20)
}
```

**Zod Validation**:
```typescript
const SearchIdsInputSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  limit: z.number().int().min(1).max(20).optional().default(5),
});
```

**Field Descriptions**:
- `query`: Natural language description of the desired operation. Can be a question ("how to create issue?") or statement ("update assignee").
- `limit`: Number of results to return, ordered by similarity score descending. Higher limits increase response time.

#### Output Schema

```typescript
interface SearchIdsOutput {
  operations: Array<{
    operation_id: string;        // Unique operation identifier (e.g., "create_issue")
    summary: string;             // Human-readable operation description
    similarity_score: number;    // Cosine similarity score (0-1, higher is better)
  }>;
}
```

**Field Descriptions**:
- `operation_id`: Use this value with `get_id` or `call_id` tools
- `summary`: Brief description from Bitbucket OpenAPI spec
- `similarity_score`: Confidence metric (>0.8 = highly relevant, 0.5-0.8 = possibly relevant, <0.5 = low relevance)

#### Examples

##### Example 1: Basic Search Query

**Scenario**: User wants to create a new issue.

**LLM Prompt**: "I need to create a new bug ticket in Bitbucket"

**MCP Tool Call**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_ids",
    "arguments": {
      "query": "create issue"
    }
  }
}
```

**Output**:
```json
{
  "operations": [
    {
      "operation_id": "create_issue",
      "summary": "Create issue",
      "similarity_score": 0.94
    },
    {
      "operation_id": "create_issues",
      "summary": "Bulk create issue",
      "similarity_score": 0.89
    },
    {
      "operation_id": "create_or_update_remote_issue_link",
      "summary": "Create or update remote issue link",
      "similarity_score": 0.72
    },
    {
      "operation_id": "get_create_issue_meta",
      "summary": "Get create issue metadata",
      "similarity_score": 0.68
    },
    {
      "operation_id": "get_create_issue_meta_issue_types",
      "summary": "Get create issue metadata for issue types",
      "similarity_score": 0.65
    }
  ]
}
```

**Why these results?**:
- `create_issue` (0.94): Exact match for user intent
- `create_issues` (0.89): Bulk operation variant
- Lower scores (<0.7): Related but not primary intent

##### Example 2: Complex Search with Limit

**Scenario**: User wants to find assignee update operations but only needs top 3 results.

**LLM Prompt**: "How do I change the person assigned to a task?"

**MCP Tool Call**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search_ids",
    "arguments": {
      "query": "update assignee",
      "limit": 3
    }
  }
}
```

**Output**:
```json
{
  "operations": [
    {
      "operation_id": "update_issue",
      "summary": "Edit issue",
      "similarity_score": 0.87
    },
    {
      "operation_id": "assign_issue",
      "summary": "Assign issue",
      "similarity_score": 0.85
    },
    {
      "operation_id": "bulk_set_issue_property",
      "summary": "Bulk set issue property",
      "similarity_score": 0.61
    }
  ]
}
```

**Why limit=3?**:
- Reduces response time (fewer results to serialize)
- Sufficient for most use cases
- LLM can refine query if results are not relevant

##### Example 3: Multi-Word Query

**Scenario**: User wants to search issues using JQL syntax.

**LLM Prompt**: "I need to search for all issues assigned to me that are in progress"

**MCP Tool Call**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "search_ids",
    "arguments": {
      "query": "search issues by JQL"
    }
  }
}
```

**Output**:
```json
{
  "operations": [
    {
      "operation_id": "search_for_issues_using_jql",
      "summary": "Search for issues using JQL (POST)",
      "similarity_score": 0.96
    },
    {
      "operation_id": "search_for_issues_using_jql_get",
      "summary": "Search for issues using JQL (GET)",
      "similarity_score": 0.95
    },
    {
      "operation_id": "get_is_watching_issue_bulk",
      "summary": "Get is watching issue bulk",
      "similarity_score": 0.58
    },
    {
      "operation_id": "match_issues",
      "summary": "Check issues against JQL",
      "similarity_score": 0.56
    },
    {
      "operation_id": "get_issue_picker_suggestions",
      "summary": "Get issue picker suggestions",
      "similarity_score": 0.52
    }
  ]
}
```

**Why these results?**:
- Top 2 results (>0.95): Exact matches for JQL search operations
- Remaining results (<0.6): Related to issue searching but different approaches

#### Error Codes

| Code | HTTP Status | Description | Cause | Solution |
|------|-------------|-------------|-------|----------|
| `INVALID_QUERY` | 400 | Query validation failed | Empty query string or invalid limit | Provide non-empty query string, ensure limit is 1-20 |
| `EMBEDDING_GENERATION_FAILED` | 500 | Failed to generate query embedding | Local embeddings model error | Check logs, restart server, verify @xenova/transformers installation |
| `DATABASE_ERROR` | 500 | sqlite-vec query failed | Database corruption or query syntax error | Check database file integrity, run diagnostics |
| `DEGRADED_MODE` | 503 | EmbeddingsRepository unavailable | Database initialization failure | Server running in degraded mode, use `get_id` directly with known operation_id |

**For detailed troubleshooting, see [Troubleshooting Guide - Error Code Reference](troubleshooting.md#error-code-reference)**

#### Performance Notes

**Latency Benchmarks** (source: [performance-benchmarks-slas.md](./internal/architecture/performance-benchmarks-slas.md)):
- **p50 (median)**: 150ms
- **p95**: <500ms
- **p99**: <1000ms

**Performance Factors**:
1. **Embedding Generation** (100-200ms):
   - First query: ~200ms (model load)
   - Subsequent queries: ~100ms (cached model)
   - Uses local @xenova/transformers (no network latency)

2. **Vector Search** (20-50ms):
   - sqlite-vec cosine similarity search
   - Optimized with indexes
   - Scales linearly with database size

3. **Result Serialization** (5-10ms):
   - JSON serialization of top-k results
   - Negligible for limit ≤20

**Optimization Tips**:
- Use `limit=3` for fastest responses when fewer results are acceptable
- Queries are not cached (each query generates fresh embeddings for semantic accuracy)
- First query after server start incurs model load overhead (~200ms)

**Throughput**: ≥100 req/s (limited by embedding generation, not search)

#### LLM Conversation Examples

##### Example: User wants to create an issue

**User**: "I need to report a bug in the payment system"

**LLM (Internal)**: *User wants to create an issue, I'll search for relevant operations*

**LLM → MCP**:
```json
{
  "name": "search_ids",
  "arguments": {
    "query": "create issue"
  }
}
```

**MCP → LLM**:
```json
{
  "operations": [
    {"operation_id": "create_issue", "summary": "Create issue", "similarity_score": 0.94}
  ]
}
```

**LLM (Internal)**: *Perfect! I found `create_issue` operation. Now I'll get the schema to see what parameters are required.*

**LLM → User**: "I'll help you create a bug report. Let me check what information is needed..."

*(LLM proceeds to call `get_id` with operation_id="create_issue")*

---

### get_id

Retrieve complete operation schema, documentation, and examples for a specific Bitbucket operation.

#### Description

The `get_id` tool provides detailed metadata about a Bitbucket API operation, including:
- Input parameter schemas (path, query, header)
- Request body schemas with field descriptions
- Response schemas for all status codes
- Generated code examples (curl, request/response samples)
- Links to official Bitbucket documentation

**Use Cases**:
- Understand required vs optional parameters
- Discover available fields and their types
- Generate correct API request payloads
- Debug parameter validation errors

**Technology**:
- **Data Source**: Pre-processed Bitbucket OpenAPI 3.0 specification
- **Cache**: In-memory cache with LRU eviction
- **Schema Format**: JSON Schema compatible TypeScript interfaces

#### Input Schema

```typescript
interface GetIdInput {
  operation_id: string;  // Required, must match existing operation ID
}
```

**Zod Validation**:
```typescript
const GetIdInputSchema = z.object({
  operation_id: z.string().min(1, 'operation_id cannot be empty'),
});
```

**Field Descriptions**:
- `operation_id`: Unique identifier returned by `search_ids` tool (e.g., "create_issue", "update_issue")

#### Output Schema

```typescript
interface GetIdOutput {
  operation_id: string;                      // Echo of input operation_id
  path: string;                              // API endpoint path (e.g., "/rest/api/3/issue")
  method: string;                            // HTTP method (GET, POST, PUT, DELETE, PATCH)
  summary: string;                           // Brief operation description
  description: string;                       // Detailed operation documentation
  parameters: Parameter[];                   // Path, query, header parameters
  requestBody?: RequestBody;                 // Request payload schema (for POST/PUT/PATCH)
  responses: Record<string, Response>;       // Response schemas by status code
  examples: Examples;                        // Generated code examples
  documentation_url?: string;                // Link to official Bitbucket docs
  deprecated?: boolean;                      // True if operation is deprecated
}

interface Parameter {
  name: string;                              // Parameter name
  in: 'path' | 'query' | 'header' | 'cookie';  // Parameter location
  required: boolean;                         // True if parameter is mandatory
  schema: Record<string, unknown>;           // JSON Schema for parameter type
  description?: string;                      // Parameter documentation
}

interface RequestBody {
  required: boolean;                         // True if request body is mandatory
  content: Record<string, MediaType>;        // Content types (e.g., "application/json")
  description?: string;                      // Request body documentation
}

interface MediaType {
  schema: Record<string, unknown>;           // JSON Schema for content
  examples?: Record<string, Example>;        // Example payloads
}

interface Response {
  description: string;                       // Response documentation
  content?: Record<string, MediaType>;       // Response content types
}

interface Examples {
  curl: string;                              // Generated curl command
  request?: unknown;                         // Example request payload
  response?: unknown;                        // Example response payload
}
```

#### Examples

##### Example 1: Get Schema for "create_issue"

**Scenario**: LLM needs to understand how to create a Bitbucket issue.

**MCP Tool Call**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_id",
    "arguments": {
      "operation_id": "create_issue"
    }
  }
}
```

**Output** (simplified for readability):
```json
{
  "operation_id": "create_issue",
  "path": "/rest/api/3/issue",
  "method": "POST",
  "summary": "Create issue",
  "description": "Creates an issue or a subtask from a JSON representation.",
  "parameters": [],
  "requestBody": {
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "properties": {
            "fields": {
              "type": "object",
              "properties": {
                "project": {
                  "type": "object",
                  "properties": {
                    "key": {"type": "string", "description": "Project key (e.g., 'PROJ')"}
                  },
                  "required": ["key"]
                },
                "summary": {
                  "type": "string",
                  "description": "Issue title (required)"
                },
                "issuetype": {
                  "type": "object",
                  "properties": {
                    "name": {"type": "string", "description": "Issue type (e.g., 'Bug', 'Task')"}
                  },
                  "required": ["name"]
                },
                "description": {
                  "type": "string",
                  "description": "Issue description (optional)"
                }
              },
              "required": ["project", "summary", "issuetype"]
            }
          },
          "required": ["fields"]
        }
      }
    }
  },
  "responses": {
    "201": {
      "description": "Returned if the request is successful.",
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "properties": {
              "id": {"type": "string"},
              "key": {"type": "string"},
              "self": {"type": "string"}
            }
          }
        }
      }
    },
    "400": {
      "description": "Returned if the request is invalid."
    }
  },
  "examples": {
    "curl": "curl -X POST https://bitbucket.example.com/rest/api/3/issue -H 'Content-Type: application/json' -d '{\"fields\":{\"project\":{\"key\":\"PROJ\"},\"summary\":\"Example issue\",\"issuetype\":{\"name\":\"Bug\"}}}'",
    "request": {
      "fields": {
        "project": {"key": "PROJ"},
        "summary": "Example issue",
        "issuetype": {"name": "Bug"}
      }
    },
    "response": {
      "id": "10001",
      "key": "PROJ-123",
      "self": "https://bitbucket.example.com/rest/api/3/issue/10001"
    }
  },
  "documentation_url": "https://developer.atlassian.com/server/bitbucket/rest/v1000/intro/"
}
```

**Key Insights**:
- `fields.project.key`, `fields.summary`, `fields.issuetype.name` are required
- `description` is optional
- 201 response returns `id`, `key`, and `self` URL

##### Example 2: Get Schema for "update_issue" (Path Parameters)

**Scenario**: LLM needs to update an existing issue.

**MCP Tool Call**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_id",
    "arguments": {
      "operation_id": "update_issue"
    }
  }
}
```

**Output** (simplified):
```json
{
  "operation_id": "update_issue",
  "path": "/rest/api/3/issue/{issueIdOrKey}",
  "method": "PUT",
  "summary": "Edit issue",
  "parameters": [
    {
      "name": "issueIdOrKey",
      "in": "path",
      "required": true,
      "schema": {"type": "string"},
      "description": "The ID or key of the issue (e.g., 'PROJ-123' or '10001')"
    },
    {
      "name": "notifyUsers",
      "in": "query",
      "required": false,
      "schema": {"type": "boolean", "default": true},
      "description": "Whether to send email notifications to watchers"
    }
  ],
  "requestBody": {
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "properties": {
            "fields": {
              "type": "object",
              "properties": {
                "summary": {"type": "string"},
                "description": {"type": "string"},
                "assignee": {
                  "type": "object",
                  "properties": {
                    "accountId": {"type": "string"}
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "responses": {
    "204": {
      "description": "Returned if the request is successful."
    },
    "400": {
      "description": "Returned if the request is invalid."
    },
    "404": {
      "description": "Returned if the issue is not found."
    }
  },
  "examples": {
    "curl": "curl -X PUT https://bitbucket.example.com/rest/api/3/issue/PROJ-123 -H 'Content-Type: application/json' -d '{\"fields\":{\"summary\":\"Updated summary\"}}'",
    "request": {
      "fields": {
        "summary": "Updated summary",
        "assignee": {"accountId": "5b10a2844c20165700ede21g"}
      }
    },
    "response": null
  }
}
```

**Key Insights**:
- Path parameter `issueIdOrKey` is required (must be in URL)
- Query parameter `notifyUsers` is optional (defaults to true)
- 204 response has no body (success indicated by status code)

##### Example 3: Get Schema for "search_for_issues_using_jql" (Query Parameters)

**Scenario**: LLM needs to search issues using JQL.

**MCP Tool Call**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_id",
    "arguments": {
      "operation_id": "search_for_issues_using_jql"
    }
  }
}
```

**Output** (simplified):
```json
{
  "operation_id": "search_for_issues_using_jql",
  "path": "/rest/api/3/search",
  "method": "POST",
  "summary": "Search for issues using JQL (POST)",
  "parameters": [],
  "requestBody": {
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "properties": {
            "jql": {
              "type": "string",
              "description": "JQL query string (e.g., 'project = PROJ AND status = Open')"
            },
            "startAt": {
              "type": "integer",
              "default": 0,
              "description": "Index of first result (for pagination)"
            },
            "maxResults": {
              "type": "integer",
              "default": 50,
              "description": "Maximum results per page (max 100)"
            },
            "fields": {
              "type": "array",
              "items": {"type": "string"},
              "description": "Fields to include in response (e.g., ['summary', 'status'])"
            }
          },
          "required": ["jql"]
        }
      }
    }
  },
  "responses": {
    "200": {
      "description": "Returned if the request is successful.",
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "properties": {
              "startAt": {"type": "integer"},
              "maxResults": {"type": "integer"},
              "total": {"type": "integer"},
              "issues": {
                "type": "array",
                "items": {"type": "object"}
              }
            }
          }
        }
      }
    },
    "400": {
      "description": "Returned if the JQL query is invalid."
    }
  },
  "examples": {
    "curl": "curl -X POST https://bitbucket.example.com/rest/api/3/search -H 'Content-Type: application/json' -d '{\"jql\":\"project = PROJ\",\"maxResults\":10}'",
    "request": {
      "jql": "project = PROJ AND status = Open",
      "maxResults": 10,
      "fields": ["summary", "status", "assignee"]
    },
    "response": {
      "startAt": 0,
      "maxResults": 10,
      "total": 2,
      "issues": [
        {
          "id": "10001",
          "key": "PROJ-123",
          "fields": {
            "summary": "Example issue",
            "status": {"name": "Open"}
          }
        }
      ]
    }
  }
}
```

**Key Insights**:
- `jql` is required, other fields optional
- `maxResults` defaults to 50, max is 100
- `fields` array controls which data is returned (reduces payload size)

#### Error Codes

| Code | HTTP Status | Description | Cause | Solution |
|------|-------------|-------------|-------|----------|
| `OPERATION_NOT_FOUND` | 404 | Operation ID does not exist | Invalid operation_id or typo | Verify operation_id using `search_ids`, check spelling |
| `INVALID_OPERATION_ID` | 400 | Operation ID format is invalid | Empty string or malformed ID | Provide non-empty operation_id from `search_ids` |

**For detailed troubleshooting, see [Troubleshooting Guide - Error Code Reference](troubleshooting.md#error-code-reference)**

#### Performance Notes

**Latency Benchmarks**:
- **Cache Hit**: <10ms (p95)
- **Cache Miss**: <50ms (p95)

**Cache Behavior**:
- **Cache Strategy**: LRU (Least Recently Used) eviction
- **Cache Size**: 1000 operations (sufficient for all Bitbucket operations)
- **Cache Key**: operation_id
- **Cache TTL**: No expiration (schemas rarely change)

**Performance Factors**:
1. **Cache Hit** (10ms):
   - In-memory lookup
   - JSON serialization
   - No database query

2. **Cache Miss** (50ms):
   - Database query (better-sqlite3)
   - Schema transformation
   - Example generation
   - Cache population

**Optimization Tips**:
- First call per operation_id incurs cache miss (~50ms)
- Subsequent calls for same operation_id hit cache (<10ms)
- Restart server clears cache (warm-up period on first requests)

**Throughput**: ≥1000 req/s (cache hit), ≥200 req/s (cache miss)

#### LLM Conversation Examples

##### Example: LLM retrieving schema after search

**LLM (Internal)**: *I found operation_id="create_issue" from search_ids. Now I need to understand what parameters are required.*

**LLM → MCP**:
```json
{
  "name": "get_id",
  "arguments": {
    "operation_id": "create_issue"
  }
}
```

**MCP → LLM**:
```json
{
  "operation_id": "create_issue",
  "path": "/rest/api/3/issue",
  "method": "POST",
  "requestBody": {
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "properties": {
            "fields": {
              "properties": {
                "project": {"required": true},
                "summary": {"required": true},
                "issuetype": {"required": true}
              }
            }
          }
        }
      }
    }
  }
}
```

**LLM (Internal)**: *Okay, I need: project key, summary, and issue type. Let me ask the user for these details.*

**LLM → User**: "To create a bug report, I need the following information:
- Project key (e.g., 'PROJ')
- Issue summary/title
- Issue type (I'll set it to 'Bug' automatically)

What project is this for, and what's the issue summary?"

---

### call_id

Execute Bitbucket API operations with automatic validation, resilience, and error handling.

#### Description

The `call_id` tool is the execution layer that bridges MCP requests to actual Bitbucket API calls. It provides:
- **Input Validation**: Zod schema validation against operation schema
- **Resilience**: Automatic retries, circuit breaker, rate limiting
- **Error Normalization**: Consistent error format across all failures
- **Audit Logging**: Structured logs for all mutations (POST/PUT/DELETE)
- **Timeout Protection**: Configurable timeout (default 60s)

**Use Cases**:
- Create, update, delete Bitbucket resources
- Execute searches and queries
- Retrieve resource metadata
- Perform bulk operations

**Technology**:
- **HTTP Client**: node-fetch (native to Node 22+)
- **Resilience**: Circuit breaker (5 failure threshold, 60s timeout)
- **Rate Limiting**: Token bucket algorithm (100 req/min default)
- **Validation**: Zod schemas with type inference

#### Input Schema

```typescript
interface CallIdInput {
  operation_id: string;              // Required, must match existing operation
  parameters: Record<string, any>;   // Operation parameters (path, query, body)
}
```

**Zod Validation**:
```typescript
const CallIdInputSchema = z.object({
  operation_id: z
    .string()
    .min(1, 'operation_id cannot be empty')
    .describe('Bitbucket operation ID (e.g., "create_issue", "get_issue")'),
  parameters: z
    .record(z.unknown())
    .describe('Operation parameters (path, query, body fields)'),
});
```

**Field Descriptions**:
- `operation_id`: Operation identifier from `search_ids` or `get_id`
- `parameters`: Flattened object containing all operation inputs:
  - Path parameters (e.g., `issueIdOrKey`)
  - Query parameters (e.g., `notifyUsers`, `maxResults`)
  - Request body fields (e.g., `fields.summary`, `fields.description`)

**Parameter Flattening**:
Request body fields can be provided at root level or nested:
```json
// Option 1: Nested (matches Bitbucket API structure)
{
  "fields": {
    "project": {"key": "PROJ"},
    "summary": "Issue title"
  }
}

// Option 2: Flattened (convenience, auto-restructured)
{
  "fields.project.key": "PROJ",
  "fields.summary": "Issue title"
}
```

#### Output Schema

```typescript
interface CallIdOutput {
  content: Array<{
    type: 'text';
    text: string;              // JSON-serialized response or error
  }>;
  isError?: boolean;           // True if operation failed
}

// Success response structure (parsed from text):
interface SuccessResponse {
  success: true;
  status: number;              // HTTP status code (200, 201, 204, etc.)
  data: any;                   // Response body from Bitbucket API
}

// Error response structure (parsed from text):
interface ErrorResponse {
  success: false;
  status: number;              // HTTP status code (400, 401, 403, 404, 429, 500, etc.)
  error: {
    code: string;              // Error code (see table below)
    message: string;           // Human-readable error message
    details?: Record<string, any>;  // Additional error context
  };
}
```

#### Examples

##### Example 1: Create Issue with Required Fields Only

**Scenario**: Create a minimal bug issue.

**MCP Tool Call**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
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
}
```

**Output** (Success):
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":true,\"status\":201,\"data\":{\"id\":\"10001\",\"key\":\"PROJ-123\",\"self\":\"https://bitbucket.example.com/rest/api/3/issue/10001\"}}"
    }
  ]
}
```

**Parsed Response**:
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

##### Example 2: Create Issue with Custom Fields

**Scenario**: Create issue with custom fields (priority, labels, custom text field).

**MCP Tool Call**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "call_id",
    "arguments": {
      "operation_id": "create_issue",
      "parameters": {
        "fields": {
          "project": {
            "key": "PROJ"
          },
          "summary": "Add support for dark mode",
          "description": "Users have requested a dark mode theme option.",
          "issuetype": {
            "name": "Story"
          },
          "priority": {
            "name": "High"
          },
          "labels": ["ui", "accessibility"],
          "customfield_10050": "Q2 2025"
        }
      }
    }
  }
}
```

**Output** (Success):
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":true,\"status\":201,\"data\":{\"id\":\"10002\",\"key\":\"PROJ-124\",\"self\":\"https://bitbucket.example.com/rest/api/3/issue/10002\"}}"
    }
  ]
}
```

**Key Insights**:
- `priority`, `labels`, and custom fields are optional
- Custom fields use format `customfield_XXXXX` (field ID from Bitbucket)
- Arrays (e.g., `labels`) are directly supported

##### Example 3: Update Issue Assignee with Path Parameters

**Scenario**: Assign issue PROJ-123 to user account ID 5b10a2844c20165700ede21g.

**MCP Tool Call**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
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
}
```

**Output** (Success):
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":true,\"status\":204,\"data\":null}"
    }
  ]
}
```

**Key Insights**:
- Path parameter `issueIdOrKey` is provided at root level alongside `fields`
- 204 status means success with no response body (`data: null`)
- Assignee requires `accountId` (not username or email)

#### Error Codes

| Code | HTTP Status | Description | Cause | Solution |
|------|-------------|-------------|-------|----------|
| `VALIDATION_ERROR` | 400 | Input validation failed | Missing required field, wrong type, invalid format | Check `get_id` schema, ensure all required fields present, verify data types match schema |
| `AUTH_ERROR` | 401/403 | Authentication failed | Invalid/expired token, insufficient permissions | Re-run `bitbucket-mcp setup`, verify user has required Bitbucket permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit reached | Too many requests in time window | Wait for rate limit reset (see Retry-After header), reduce request rate |
| `NOT_FOUND` | 404 | Resource not found | Invalid issue key, project doesn't exist | Verify resource exists, check spelling of issue key/project key |
| `NETWORK_ERROR` | N/A | Connection failure | Network timeout, DNS failure, connection refused | Check Bitbucket URL, verify network connectivity, check firewall rules |
| `CIRCUIT_BREAKER_OPEN` | 503 | Circuit breaker protecting from cascading failures | ≥5 consecutive failures detected | Wait 60s for circuit breaker to attempt recovery, check Bitbucket instance health |
| `BITBUCKET_API_ERROR` | 400-599 | Bitbucket returned error response | Various Bitbucket-specific validation errors | Check error details, consult Bitbucket API documentation for specific error |
| `TIMEOUT` | 504 | Operation timed out | Bitbucket took >60s to respond | Retry operation, check Bitbucket instance performance, consider simpler query |
| `SERVER_ERROR` | 500 | Bitbucket internal error | Bitbucket encountered internal error | Retry operation, check Bitbucket logs, contact Bitbucket administrator |

#### Resilience Features

(Source: [backend-architecture.md#resilience](./internal/architecture/backend-architecture.md))

**Purpose**: Prevents cascading failures by failing fast when downstream service (Bitbucket) is unhealthy.

**States**:
- **CLOSED**: Normal operation, requests flow through
- **OPEN**: Circuit breaker active, requests fail immediately with `CIRCUIT_BREAKER_OPEN`
- **HALF_OPEN**: Testing recovery, limited requests allowed

**Configuration**:
- Failure threshold: 5 consecutive failures
- Timeout: 60 seconds (OPEN → HALF_OPEN transition)
- Success threshold (HALF_OPEN → CLOSED): 1 successful request

**Behavior**:
```
Request 1-4: Fail (timeouts, 500 errors) → CLOSED state
Request 5: Fail → Threshold reached → OPEN state
Request 6-N (within 60s): Fail immediately with CIRCUIT_BREAKER_OPEN
After 60s: HALF_OPEN state → Next request is test probe
  If success → CLOSED state (recovery)
  If failure → OPEN state (reset 60s timer)
```

##### Rate Limiting

**Purpose**: Prevents overwhelming Bitbucket instance, respects server-side rate limits.

**Algorithm**: Token bucket
- **Default Rate**: 100 requests per minute
- **Burst Capacity**: 20 requests (can burst temporarily)
- **Refill Rate**: 100 tokens/60s = ~1.67 tokens/second

**Configuration**: Set via `config.yaml`:
```yaml
rateLimit:
  requestsPerMinute: 100
  burstCapacity: 20
```

**Behavior**:
- Request consumes 1 token from bucket
- If bucket empty → `RATE_LIMIT_EXCEEDED` error
- Tokens refill continuously at configured rate
- 429 errors from Bitbucket auto-retry after `Retry-After` header duration

##### Retry Strategy

**Purpose**: Automatic recovery from transient failures.

**Configuration**:
- **Max Retries**: 3 attempts
- **Backoff**: Exponential (1s, 2s, 4s)
- **Jitter**: ±20% randomization to prevent thundering herd

**Retry Conditions**:
- ✅ Network errors (ECONNRESET, ETIMEDOUT)
- ✅ 5xx server errors (500, 502, 503, 504)
- ✅ 429 rate limit (with Retry-After respect)
- ❌ 4xx client errors (400, 401, 403, 404) - no retry
- ❌ Circuit breaker open - no retry (fails immediately)

**Example Retry Flow**:
```
Attempt 1: ETIMEDOUT → Wait 1s → Retry
Attempt 2: 503 Service Unavailable → Wait 2s → Retry
Attempt 3: 200 OK → Success
```

#### Performance Notes

**Latency Benchmarks** (source: [performance-benchmarks-slas.md](./internal/architecture/performance-benchmarks-slas.md)):
- **p50**: 500ms (heavily dependent on Bitbucket response time)
- **p95**: <2000ms
- **p99**: <5000ms

**Latency Breakdown**:
1. **Input Validation** (10-20ms):
   - Zod schema validation
   - Parameter transformation

2. **Network Round-Trip** (100-1500ms):
   - Depends on Bitbucket instance location
   - Local: 50-100ms
   - Cloud: 100-300ms
   - Cross-region: 300-1500ms

3. **Bitbucket Processing** (50-500ms):
   - Simple GET: 50-100ms
   - Create/Update: 100-300ms
   - Complex JQL search: 200-500ms

4. **Response Processing** (5-10ms):
   - JSON parsing
   - Response serialization

**Optimization Tips**:
- Use `fields` parameter in search operations to reduce payload size
- Cache frequently accessed data client-side (issues, projects)
- Batch operations when possible (use bulk APIs)
- Monitor circuit breaker state (frequent OPEN states indicate Bitbucket issues)

**Timeout Configuration**: Set via `config.yaml`:
```yaml
timeout:
  operationTimeoutMs: 60000  # 60 seconds
```

**Throughput**: ≥100 req/s (rate-limited by default config)

#### LLM Conversation Examples

##### Example: Complete Workflow (search → get → call)

**User**: "Create a bug issue in the PAYMENT project for credit card processing failure"

**LLM (Internal)**: *Step 1: Search for operation*

**LLM → MCP** (search_ids):
```json
{"name": "search_ids", "arguments": {"query": "create issue"}}
```

**MCP → LLM**:
```json
{"operations": [{"operation_id": "create_issue", "similarity_score": 0.94}]}
```

**LLM (Internal)**: *Step 2: Get schema*

**LLM → MCP** (get_id):
```json
{"name": "get_id", "arguments": {"operation_id": "create_issue"}}
```

**MCP → LLM**:
```json
{
  "requestBody": {
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "properties": {
            "fields": {
              "required": ["project", "summary", "issuetype"]
            }
          }
        }
      }
    }
  }
}
```

**LLM (Internal)**: *Step 3: I have all required info, execute operation*

**LLM → MCP** (call_id):
```json
{
  "name": "call_id",
  "arguments": {
    "operation_id": "create_issue",
    "parameters": {
      "fields": {
        "project": {"key": "PAYMENT"},
        "summary": "Credit card processing failure",
        "issuetype": {"name": "Bug"}
      }
    }
  }
}
```

**MCP → LLM**:
```json
{
  "success": true,
  "status": 201,
  "data": {"id": "10001", "key": "PAYMENT-42"}
}
```

**LLM → User**: "I've created bug issue PAYMENT-42: 'Credit card processing failure'. You can view it at: https://bitbucket.example.com/browse/PAYMENT-42"

---

## Error Handling

### Error Response Format

All errors follow a consistent structure:

```typescript
interface ErrorResponse {
  success: false;
  status: number;              // HTTP status code or 0 for client errors
  error: {
    code: string;              // Machine-readable error code
    message: string;           // Human-readable error message
    details?: {                // Additional context (optional)
      field?: string;          // Field that caused validation error
      expected?: string;       // Expected value/type
      received?: string;       // Actual value/type
      documentation?: string;  // Link to relevant docs
    };
  };
}
```

### Error Categories

#### Client Errors (4xx)

**Validation Errors (400)**:
```json
{
  "success": false,
  "status": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Required field 'fields.summary' is missing",
    "details": {
      "field": "fields.summary",
      "expected": "string",
      "received": "undefined"
    }
  }
}
```

**Authentication Errors (401)**:
```json
{
  "success": false,
  "status": 401,
  "error": {
    "code": "AUTH_ERROR",
    "message": "Authentication failed: Access token expired",
    "details": {
      "documentation": "https://bitbucket-mcp.example.com/docs/authentication.md"
    }
  }
}
```

**Not Found Errors (404)**:
```json
{
  "success": false,
  "status": 404,
  "error": {
    "code": "NOT_FOUND",
    "message": "Issue 'PROJ-999' not found",
    "details": {
      "resource": "issue",
      "identifier": "PROJ-999"
    }
  }
}
```

**Rate Limit Errors (429)**:
```json
{
  "success": false,
  "status": 429,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded: 100 requests per minute",
    "details": {
      "limit": 100,
      "window": "60s",
      "retryAfter": 30
    }
  }
}
```

#### Server Errors (5xx)

**Bitbucket Internal Errors (500)**:
```json
{
  "success": false,
  "status": 500,
  "error": {
    "code": "SERVER_ERROR",
    "message": "Bitbucket encountered an internal error",
    "details": {
      "bitbucketErrorCode": "INTERNAL_SERVER_ERROR"
    }
  }
}
```

**Circuit Breaker Errors (503)**:
```json
{
  "success": false,
  "status": 503,
  "error": {
    "code": "CIRCUIT_BREAKER_OPEN",
    "message": "Service temporarily unavailable due to repeated failures",
    "details": {
      "state": "OPEN",
      "resetTime": "2025-10-18T14:35:00Z"
    }
  }
}
```

**Timeout Errors (504)**:
```json
{
  "success": false,
  "status": 504,
  "error": {
    "code": "TIMEOUT",
    "message": "Operation timed out after 60000ms",
    "details": {
      "timeout": 60000,
      "elapsed": 60123
    }
  }
}
```

#### Client Errors (Network)

**Network Errors (status 0)**:
```json
{
  "success": false,
  "status": 0,
  "error": {
    "code": "NETWORK_ERROR",
    "message": "Failed to connect to Bitbucket instance",
    "details": {
      "cause": "ECONNREFUSED",
      "url": "https://bitbucket.example.com"
    }
  }
}
```

### Error Handling Best Practices

#### For LLMs

1. **Parse error code first**: Use `error.code` to determine error type
2. **Check for retryable errors**: `RATE_LIMIT_EXCEEDED`, `TIMEOUT`, `SERVER_ERROR` can be retried
3. **Don't retry client errors**: `VALIDATION_ERROR`, `AUTH_ERROR`, `NOT_FOUND` require user action
4. **Extract actionable info**: Use `error.details` to guide user
5. **Link to documentation**: Use `error.details.documentation` for additional help

#### For Developers

1. **Log correlation ID**: Include `correlation_id` from logs for debugging
2. **Monitor circuit breaker state**: Frequent OPEN states indicate Bitbucket issues
3. **Track rate limit hits**: Adjust `requestsPerMinute` config if needed
4. **Set appropriate timeouts**: Adjust `operationTimeoutMs` for slow operations
5. **Handle degraded mode**: Some tools may be unavailable, suggest alternatives

### Common Error Scenarios

#### Scenario 1: Invalid Custom Field

**Error**:
```json
{
  "error": {
    "code": "BITBUCKET_API_ERROR",
    "message": "Field 'customfield_99999' does not exist"
  }
}
```

**Solution**:
1. Call `search_ids` with query "list custom fields"
2. Call `get_id` with `operation_id` from search
3. Call `call_id` to retrieve available custom fields
4. Use correct custom field ID

#### Scenario 2: Missing Required Field

**Error**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Required field 'fields.project' is missing"
  }
}
```

**Solution**:
1. Call `get_id` with current `operation_id`
2. Check `requestBody.required` fields
3. Include missing field in next `call_id` attempt

#### Scenario 3: Authentication Expired

**Error**:
```json
{
  "error": {
    "code": "AUTH_ERROR",
    "message": "Authentication failed: Access token expired"
  }
}
```

**Solution**:
1. Inform user that credentials need refresh
2. Guide user to run: `bitbucket-mcp setup --profile <profile_name>`
3. For OAuth2: Re-run OAuth flow to get new tokens
4. For PAT: Generate new PAT in Bitbucket and re-configure

---

## Performance Considerations

### Latency Benchmarks

Performance targets (source: [performance-benchmarks-slas.md](./internal/architecture/performance-benchmarks-slas.md)):

| Tool | p50 | p95 | p99 | Notes |
|------|-----|-----|-----|-------|
| `search_ids` | 150ms | <500ms | <1000ms | Includes embedding generation (100-200ms) + vector search (20-50ms) |
| `get_id` | <10ms | <50ms | <100ms | Cache hit <10ms, cache miss <50ms |
| `call_id` | 500ms | <2000ms | <5000ms | Heavily dependent on Bitbucket response time (100-1500ms network + 50-500ms processing) |

### Optimization Strategies

#### 1. Reduce search_ids Calls

**Problem**: Embedding generation adds 100-200ms per query.

**Solution**:
- Cache operation_id mappings in LLM context
- Re-use known operation IDs for repeated tasks
- Use `limit=3` for faster responses when fewer results acceptable

**Example**:
```
❌ Inefficient: Search for "create issue" on every issue creation
✅ Efficient: Search once, cache operation_id="create_issue", re-use
```

#### 2. Leverage get_id Cache

**Problem**: Cache miss adds 40ms vs cache hit.

**Solution**:
- Warm up cache by calling `get_id` for common operations at startup
- Keep server running to maintain warm cache
- Common operations: `create_issue`, `update_issue`, `search_for_issues_using_jql`

#### 3. Optimize call_id Parameters

**Problem**: Large response payloads increase latency.

**Solution**:
- Use `fields` parameter to limit returned data
- Specify `maxResults` for search operations
- Avoid fetching changelog/comments unless needed

**Example**:
```json
// ❌ Fetches all fields (~2KB per issue)
{"operation_id": "search_for_issues_using_jql", "parameters": {"jql": "project = PROJ"}}

// ✅ Fetches only needed fields (~200 bytes per issue)
{"operation_id": "search_for_issues_using_jql", "parameters": {
  "jql": "project = PROJ",
  "fields": ["summary", "status"],
  "maxResults": 10
}}
```

#### 4. Batch Operations

**Problem**: Individual API calls for bulk updates are slow.

**Solution**:
- Use bulk operations when available (e.g., `create_issues`, `bulk_set_issue_property`)
- For unavailable bulk operations, implement client-side batching with concurrency limits

**Example**:
```
❌ Sequential: 10 issues × 500ms = 5000ms
✅ Bulk operation: 1 call × 800ms = 800ms
```

#### 5. Monitor Circuit Breaker

**Problem**: Circuit breaker OPEN state causes all requests to fail fast.

**Solution**:
- Monitor logs for `circuit_breaker.state_change` events
- Investigate Bitbucket instance health when circuit breaker opens frequently
- Adjust failure threshold if needed (via config)

**Configuration**:
```yaml
circuitBreaker:
  failureThreshold: 5      # Number of failures before opening
  timeoutMs: 60000         # Time to wait before testing recovery
```

#### 6. Adjust Timeouts

**Problem**: Default 60s timeout may be too short for complex operations.

**Solution**:
- Monitor logs for `TIMEOUT` errors
- Increase timeout for specific heavy operations
- Consider operation simplification (e.g., smaller JQL result sets)

**Configuration**:
```yaml
timeout:
  operationTimeoutMs: 60000  # Increase to 120000 for slow operations
```

### Performance Monitoring

**Key Metrics to Track**:
1. **Latency Distribution**: p50, p95, p99 for each tool
2. **Error Rate**: % of requests resulting in errors
3. **Circuit Breaker State**: Time spent in OPEN state
4. **Rate Limit Hits**: Frequency of `RATE_LIMIT_EXCEEDED` errors
5. **Cache Hit Rate**: % of `get_id` requests hitting cache

**Logging**:
All operations log structured metrics:
```json
{
  "event": "call_id.execute",
  "operation_id": "create_issue",
  "duration_ms": 523,
  "status": 201,
  "correlation_id": "req_abc123"
}
```

Enable DEBUG logging for detailed performance breakdown:
```bash
LOG_LEVEL=debug bitbucket-mcp start
```

---

## Additional Resources

- **MCP Protocol Specification**: https://modelcontextprotocol.io/docs
- **Bitbucket REST API Reference**: https://developer.atlassian.com/server/bitbucket/rest/v1000/intro/
- **Authentication Setup**: [authentication.md](./authentication.md)
- **Troubleshooting Guide**: [troubleshooting.md](./troubleshooting.md)
- **Cookbook Examples**: [cookbook.md](./cookbook.md)

---

## Feedback

Found an error or have suggestions? Please [open an issue](https://github.com/your-org/bitbucket-dc-mcp/issues) or contribute via [pull request](../CONTRIBUTING.md).

---

*Document Version: 1.0*  
*Last Updated: 2025-10-18*  
*Auto-generated sections: Tool schemas (search_ids, get_id, call_id)*
