# API Specification

### MCP Tools API (stdio transport)

O servidor expõe 3 tools via Model Context Protocol usando stdio transport (stdin/stdout). Não é REST API tradicional - comunicação via JSON-RPC over stdio.

#### Tool: search_ids

**Purpose:** Busca semântica de operations Bitbucket usando linguagem natural.

**Input Schema:**
```typescript
interface SearchIdsInput {
  query: string;        // Natural language query (required)
  limit?: number;       // Max results, default 5, range 1-20
}
```

**Output Schema:**
```typescript
interface SearchIdsOutput {
  operations: Array<{
    operation_id: string;
    summary: string;
    similarity_score: number; // 0-1
  }>;
}
```

**Example Request (MCP JSON-RPC):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_ids",
    "arguments": {
      "query": "how to update issue assignee",
      "limit": 5
    }
  }
}
```

**Example Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "operations": [
      {
        "operation_id": "update_issue_assignee",
        "summary": "Assign an issue to a user",
        "similarity_score": 0.94
      },
      {
        "operation_id": "edit_issue",
        "summary": "Edit issue fields including assignee",
        "similarity_score": 0.89
      }
    ]
  }
}
```

#### Tool: get_id

**Purpose:** Recupera schema completo, documentação, e exemplos para uma operation.

**Input Schema:**
```typescript
interface GetIdInput {
  operation_id: string; // Required
}
```

**Output Schema:**
```typescript
interface GetIdOutput {
  operation_id: string;
  path: string;
  method: string;
  summary: string;
  description: string;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  examples: {
    curl: string;
    request: any;
    response: any;
  };
  documentation_url?: string;
}
```

#### Tool: call_id

**Purpose:** Executa operation Bitbucket com validação e resilience.

**Input Schema:**
```typescript
interface CallIdInput {
  operation_id: string;  // Required
  parameters: Record<string, any>; // Path/query/body params
}
```

**Output Schema:**
```typescript
interface CallIdOutput {
  success: boolean;
  status: number;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
```

**Example Call (create issue):**
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
          "project": { "key": "PROJ" },
          "summary": "Bug report",
          "issuetype": { "name": "Bug" }
        }
      }
    }
  }
}
```

