# Additional Technical Details

### Dockerfile (Multi-stage Build)

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Build TypeScript
RUN npm run build

# Generate embeddings database (requires OPENAI_API_KEY)
ARG OPENAI_API_KEY
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
RUN npm run build:openapi && \
    npm run build:schemas && \
    npm run build:embeddings && \
    npm run build:db

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data/embeddings.db ./data/embeddings.db

# Create directory for config
RUN mkdir -p /root/.bitbucket-mcp

# Health check (future v1.1)
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
#   CMD node dist/health-check.js || exit 1

# Entry point
ENTRYPOINT ["node", "dist/index.js"]

# Labels
LABEL org.opencontainers.image.title="Bitbucket DataCenter MCP Server"
LABEL org.opencontainers.image.description="MCP server for Bitbucket DC with semantic search"
LABEL org.opencontainers.image.source="https://github.com/your-org/bitbucket-dc-mcp-server"
```

**Usage:**

```bash
# Build (requires OpenAI API key for embeddings)
docker build --build-arg OPENAI_API_KEY=sk-... -t bitbucket-dc-mcp:latest .

# Run with environment variables (PAT auth)
docker run --rm -i \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_AUTH_METHOD=pat \
  -e BITBUCKET_TOKEN=your-pat-token \
  bitbucket-dc-mcp:latest

# Run with config file mounted
docker run --rm -i \
  -v ~/.bitbucket-mcp:/root/.bitbucket-mcp \
  bitbucket-dc-mcp:latest
```

### package.json Configuration

```json
{
  "name": "bitbucket-dc-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for Bitbucket DataCenter with semantic search",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "bitbucket-mcp": "dist/cli.js"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "build:openapi": "tsx scripts/download-openapi.ts",
    "build:schemas": "tsx scripts/generate-schemas.ts",
    "build:embeddings": "tsx scripts/generate-embeddings.ts",
    "build:db": "tsx scripts/populate-db.ts",
    "build:all": "npm run build:openapi && npm run build:schemas && npm run build:embeddings && npm run build:db && npm run build",
    "setup": "node dist/cli.js setup",
    "search": "node dist/cli.js search",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest",
    "lint": "eslint src tests scripts",
    "lint:fix": "eslint src tests scripts --fix",
    "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\" \"scripts/**/*.ts\"",
    "type-check": "tsc --noEmit"
  },
  "keywords": ["bitbucket", "mcp", "semantic-search", "llm", "data-center", "ai"],
  "author": "Your Name",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "better-sqlite3": "^9.0.0",
    "js-yaml": "^4.1.0",
    "node-fetch": "^3.3.0",
    "node-keytar": "^7.9.0",
    "pino": "^8.16.0",
    "pino-rotating-file": "^1.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/js-yaml": "^4.0.0",
    "@types/node": "^18.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "eslint": "^8.50.0",
    "eslint-config-prettier": "^9.0.0",
    "prettier": "^3.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"],
      "@tools/*": ["./src/tools/*"],
      "@services/*": ["./src/services/*"],
      "@core/*": ["./src/core/*"],
      "@auth/*": ["./src/auth/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### ESLint Configuration

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "rules": {
    "no-console": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error"
  }
}
```

### Circuit Breaker Implementation Details

#### Step-by-Step Implementation Guide

**🎯 Goal:** Protect the system from cascading failures when Bitbucket DC is down by failing fast instead of waiting for timeouts.

**📋 Implementation Steps:**

1. **Define States (5 minutes)**
   - `CLOSED`: Normal operation, requests pass through
   - `OPEN`: Circuit is broken, requests fail immediately
   - `HALF_OPEN`: Testing if service recovered, allow 1 request

2. **Track Failures (10 minutes)**
   ```typescript
   // Keep count of consecutive failures
   private failureCount = 0;
   
   // On each request result:
   if (success) {
     this.failureCount = 0;  // Reset on first success
   } else {
     this.failureCount++;
     if (this.failureCount >= threshold) {
       this.state = 'OPEN';  // Open circuit
     }
   }
   ```

3. **Implement Timeout Recovery (10 minutes)**
   - When circuit opens, start timer (e.g., 30 seconds)
   - After timeout, transition to HALF_OPEN
   - Allow 1 test request to check if service recovered

4. **Handle State Transitions (15 minutes)**
   - CLOSED → OPEN: When failure threshold reached (e.g., 5 failures)
   - OPEN → HALF_OPEN: After timeout (e.g., 30s)
   - HALF_OPEN → CLOSED: If test request succeeds
   - HALF_OPEN → OPEN: If test request fails

5. **Add Logging (5 minutes)**
   ```typescript
   logger.warn('Circuit breaker opened', {
     service: this.name,
     failureCount: this.failureCount,
     nextRetryAt: new Date(Date.now() + this.config.timeout)
   });
   ```

6. **Test Edge Cases (15 minutes)**
   - Concurrent requests when circuit opens
   - Multiple successes needed in HALF_OPEN (e.g., 2 successes)
   - Rapid state transitions

**⏱️ Total Time:** ~60 minutes

**✅ Validation Checklist:**
- [ ] Circuit opens after N consecutive failures
- [ ] Circuit stays open for timeout duration
- [ ] Circuit allows test request in HALF_OPEN
- [ ] Circuit closes after success in HALF_OPEN
- [ ] State transitions are logged with context
- [ ] Concurrent requests handled safely

```typescript
// src/core/circuit-breaker.ts
type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;  // Failures to open circuit (default: 5)
  timeout: number;           // Time before trying HALF_OPEN (default: 30000ms)
  successThreshold: number;  // Successes in HALF_OPEN to close (default: 2)
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private config: CircuitBreakerConfig;
  
  constructor(
    private name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      timeout: config.timeout ?? 30000,
      successThreshold: config.successThreshold ?? 2,
    };
  }
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // OPEN state: Fail fast
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info(`Circuit breaker ${this.name}: OPEN → HALF_OPEN (attempting reset)`);
      } else {
        throw new CircuitBreakerOpenError(
          `Circuit breaker ${this.name} is OPEN. Service may be unavailable.`
        );
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'CLOSED';
        logger.info(`Circuit breaker ${this.name}: HALF_OPEN → CLOSED`);
      }
    }
  }
  
  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit breaker ${this.name}: CLOSED → OPEN (${this.failureCount} failures)`);
    }
  }
  
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    const elapsed = Date.now() - this.lastFailureTime.getTime();
    return elapsed >= this.config.timeout;
  }
  
  getState(): CircuitBreakerState {
    return this.state;
  }
  
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    logger.info(`Circuit breaker ${this.name}: Manual reset`);
  }
}
```

### Rate Limiter Implementation (Token Bucket)

#### Step-by-Step Implementation Guide

**🎯 Goal:** Prevent overwhelming Bitbucket DC with too many requests by implementing a "token bucket" algorithm that allows up to N requests per second.

**📋 Implementation Steps:**

1. **Understand Token Bucket Analogy (Concept)**
   - Imagine a bucket that holds tokens (permissions to make a request)
   - Bucket refills at constant rate (e.g., 100 tokens/second)
   - Each request consumes 1 token
   - If bucket is empty, request must wait

2. **Initialize State (5 minutes)**
   ```typescript
   private tokens: number;         // Current available tokens
   private lastRefill: number;     // Timestamp of last refill
   private maxTokens: number;      // Bucket capacity (e.g., 100)
   private refillRate: number;     // Tokens added per second (e.g., 100)
   
   constructor(maxTokens: number) {
     this.tokens = maxTokens;  // Start with full bucket
     this.lastRefill = Date.now();
   }
   ```

3. **Implement Refill Logic (15 minutes)**
   ```typescript
   private refill(): void {
     const now = Date.now();
     const elapsedSeconds = (now - this.lastRefill) / 1000;
     
     // Add tokens for elapsed time
     const tokensToAdd = elapsedSeconds * this.refillRate;
     this.tokens = Math.min(this.tokens + tokensToAdd, this.maxTokens);
     
     this.lastRefill = now;
   }
   ```

4. **Implement Acquire Logic (15 minutes)**
   ```typescript
   async acquire(): Promise<void> {
     this.refill();  // Refill bucket first
     
     if (this.tokens >= 1) {
       this.tokens -= 1;  // Consume 1 token
       return;            // Request allowed
     }
     
     // Not enough tokens, calculate wait time
     const waitMs = (1 / this.refillRate) * 1000;
     await new Promise(resolve => setTimeout(resolve, waitMs));
     
     // Retry (recursively or with loop)
     return this.acquire();
   }
   ```

5. **Add Logging (5 minutes)**
   ```typescript
   logger.debug('Rate limit check', {
     availableTokens: this.tokens.toFixed(2),
     action: this.tokens >= 1 ? 'allowed' : 'throttled'
   });
   ```

6. **Test Burst Scenarios (10 minutes)**
   - 100 requests at once (should consume all tokens immediately)
   - 200 requests over 1 second (first 100 pass, rest throttled)
   - Gradual requests over time (tokens refill between requests)

**⏱️ Total Time:** ~50 minutes

**✅ Validation Checklist:**
- [ ] Allows burst up to maxTokens
- [ ] Throttles when bucket empty
- [ ] Refills tokens at correct rate
- [ ] Wait time calculation is accurate
- [ ] No race conditions with concurrent requests
- [ ] Logging shows throttle events

**⚠️ Common Mistakes to Avoid:**
- ❌ **Forgetting to refill before checking**: Always `refill()` before `if (tokens >= 1)`
- ❌ **Integer math errors**: Use floating point for fractional tokens (0.5 tokens OK)
- ❌ **Race conditions**: In Node.js single-threaded this is less of an issue, but be careful with async refills

```typescript
// src/core/rate-limiter.ts
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  
  constructor(
    private maxTokens: number,      // Max requests per second
    private refillRate: number = maxTokens  // Tokens added per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }
  
  async acquire(): Promise<void> {
    this.refill();
    
    if (this.tokens < 1) {
      const waitTime = this.calculateWaitTime();
      logger.debug('Rate limit reached, waiting', { wait_ms: waitTime });
      await this.sleep(waitTime);
      this.refill();
    }
    
    this.tokens--;
  }
  
  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
  
  private calculateWaitTime(): number {
    const tokensNeeded = 1 - this.tokens;
    return (tokensNeeded / this.refillRate) * 1000; // ms
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Cache Manager Implementation (LRU)

```typescript
// src/core/cache-manager.ts
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiresAt?: number;
}

export class CacheManager<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private accessOrder: K[] = [];
  
  constructor(
    private maxSize: number,
    private defaultTTL?: number // milliseconds
  ) {}
  
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      return undefined;
    }
    
    // Update access order (LRU)
    this.updateAccessOrder(key);
    
    return entry.value;
  }
  
  set(key: K, value: V, ttl?: number): void {
    const expiresAt = (ttl ?? this.defaultTTL) 
      ? Date.now() + (ttl ?? this.defaultTTL!)
      : undefined;
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      expiresAt,
    });
    
    this.updateAccessOrder(key);
    this.evictIfNeeded();
  }
  
  private updateAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
  
  private evictIfNeeded(): void {
    while (this.cache.size > this.maxSize) {
      const leastRecentKey = this.accessOrder.shift();
      if (leastRecentKey) {
        this.cache.delete(leastRecentKey);
      }
    }
  }
  
  delete(key: K): boolean {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
  
  size(): number {
    return this.cache.size;
  }
  
  // Metrics
  getHitRate(): number {
    // Track hits/misses for monitoring (implementation simplified here)
    return 0.8; // Placeholder
  }
}
```

### Build Scripts Architecture

#### OpenAPI Processing Pipeline

```typescript
// scripts/download-openapi.ts
/**
 * Downloads Bitbucket DC OpenAPI specification
 * Input: Bitbucket DC URL or local file path
 * Output: data/openapi.json
 */

// scripts/generate-schemas.ts
/**
 * Generates Zod schemas from OpenAPI spec
 * Input: data/openapi.json
 * Output: src/validation/generated-schemas.ts
 * 
 * Process:
 * 1. Parse OpenAPI components/schemas
 * 2. Convert to Zod schema definitions
 * 3. Generate TypeScript file with exports
 */

// scripts/generate-embeddings.ts
/**
 * Generates embeddings for operation descriptions
 * Input: data/operations.json
 * Output: data/embeddings.json
 * 
 * Process:
 * 1. For each operation, create description text
 * 2. Batch operations (100 per request)
 * 3. Call OpenAI embeddings API
 * 4. Save vectors to JSON (intermediate format)
 * 
 * Cost: ~$0.10 for 500 operations (one-time build cost)
 */

// scripts/populate-db.ts
/**
 * Populates sqlite-vec database
 * Input: data/operations.json, data/embeddings.json
 * Output: data/embeddings.db
 * 
 * Process:
 * 1. Create database and tables
 * 2. Insert operations metadata
 * 3. Insert embeddings into vec0 virtual table
 * 4. Create indexes
 * 5. VACUUM for optimization
 */
```

**Build Pipeline Execution:**

```bash
# Complete build process (run once, or when OpenAPI spec updates)
npm run build:all

# Individual steps (for development)
npm run build:openapi      # 1. Download OpenAPI spec
npm run build:schemas      # 2. Generate Zod schemas
npm run build:embeddings   # 3. Generate embeddings (requires OPENAI_API_KEY)
npm run build:db           # 4. Populate sqlite-vec
npm run build              # 5. Compile TypeScript
```

