# Data Models

### Operation

**Purpose:** Representa uma operação da Bitbucket REST API (endpoint) com metadata para semantic search e execução.

**Key Attributes:**
- `operation_id: string` - ID único (ex: "get_projects", "create_repository")
- `path: string` - Endpoint path (ex: "/rest/api/latest/projects")
- `method: string` - HTTP method (GET, POST, PUT, DELETE)
- `summary: string` - Descrição breve (usado em semantic search)
- `description: string` - Descrição detalhada (usado em semantic search)
- `tags: string[]` - Categorias (ex: ["Issues", "Projects"])
- `parameters: Parameter[]` - Path/query/header params
- `requestBody: RequestBody | null` - Schema do body (se POST/PUT)
- `responses: Record<string, Response>` - Response schemas por status code

#### TypeScript Interface

```typescript
interface Operation {
  operation_id: string;
  path: string;
  method: HttpMethod;
  summary: string;
  description: string;
  tags: string[];
  parameters: Parameter[];
  requestBody: RequestBody | null;
  responses: Record<string, Response>;
  deprecated: boolean;
  security: SecurityRequirement[];
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: JsonSchema;
  description?: string;
}

interface RequestBody {
  required: boolean;
  content: Record<string, MediaType>;
}

interface MediaType {
  schema: JsonSchema;
  examples?: Record<string, Example>;
}
```

#### Relationships

- **Has Many** Embeddings (via `operation_id` FK em embeddings table)
- **References** Schemas (via JSON schemas inline ou $ref)
- **Belongs To** Tag categories

### Embedding

**Purpose:** Armazena representação vetorial (embedding) da operation description para semantic search via cosine similarity.

**Key Attributes:**
- `operation_id: string` - FK para Operation
- `vector: Float32Array` - Embedding 768 dimensions (Xenova/all-mpnet-base-v2)
- `model: string` - Modelo usado (ex: "Xenova/all-mpnet-base-v2")
- `created_at: Date` - Timestamp de geração

#### TypeScript Interface

```typescript
interface Embedding {
  operation_id: string;
  vector: Float32Array; // 768 floats
  model: string;
  created_at: Date;
}

interface SearchResult {
  operation_id: string;
  similarity_score: number; // 0-1 cosine similarity
  operation: Operation; // Joined data
}
```

#### Relationships

- **Belongs To** Operation (via `operation_id`)

### Credentials

**Purpose:** Armazena credentials de autenticação Bitbucket DC de forma segura no OS keychain.

**Key Attributes:**
- `bitbucket_url: string` - Base URL Bitbucket DC instance
- `auth_method: AuthMethod` - Método de auth usado
- `access_token?: string` - OAuth2/PAT token
- `refresh_token?: string` - OAuth2 refresh token
- `expires_at?: Date` - Token expiration
- `username?: string` - Basic auth username
- `password?: string` - Basic auth password (encrypted)
- `consumer_key?: string` - OAuth 1.0a consumer key
- `consumer_secret?: string` - OAuth 1.0a consumer secret

#### TypeScript Interface

```typescript
type AuthMethod = 'oauth2' | 'pat' | 'oauth1' | 'basic';

interface Credentials {
  bitbucket_url: string;
  auth_method: AuthMethod;
  // OAuth2/PAT
  access_token?: string;
  refresh_token?: string;
  expires_at?: Date;
  // Basic Auth
  username?: string;
  password?: string; // Encrypted in keychain
  // OAuth 1.0a
  consumer_key?: string;
  consumer_secret?: string;
  oauth_token?: string;
  oauth_token_secret?: string;
}

interface CredentialStorage {
  save(key: string, credentials: Credentials): Promise<void>;
  load(key: string): Promise<Credentials | null>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}
```

#### Relationships

- **Belongs To** Bitbucket DC instance (via `bitbucket_url`)

### Config

**Purpose:** Configuração do servidor MCP, carregada de arquivo YAML, env vars, ou defaults.

**Key Attributes:**
- `bitbucket_url: string` - Base URL Bitbucket DC
- `auth_method: AuthMethod` - Método de autenticação
- `rate_limit: number` - Max requests/second (default: 100)
- `timeout: number` - Request timeout ms (default: 30000)
- `log_level: LogLevel` - Log verbosity (default: 'info')
- `cache_size: number` - Max cache entries (default: 1000)
- `retry_attempts: number` - Max retries (default: 3)
- `circuit_breaker_threshold: number` - Failures para abrir circuit (default: 5)

#### TypeScript Interface

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Config {
  bitbucket_url: string;
  auth_method: AuthMethod;
  rate_limit: number;
  timeout: number;
  log_level: LogLevel;
  cache_size: number;
  retry_attempts: number;
  circuit_breaker_threshold: number;
  circuit_breaker_timeout: number;
}

const DEFAULT_CONFIG: Partial<Config> = {
  rate_limit: 100,
  timeout: 30000,
  log_level: 'info',
  cache_size: 1000,
  retry_attempts: 3,
  circuit_breaker_threshold: 5,
  circuit_breaker_timeout: 30000,
};
```

#### Relationships

- **Has One** CredentialStorage (via `bitbucket_url`)

