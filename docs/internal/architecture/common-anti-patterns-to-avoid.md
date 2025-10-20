# Common Anti-Patterns to Avoid

> **Plain Language Summary:**  
> This section shows common mistakes developers make and how to avoid them. Think of it as a "What NOT to do" guide. Learning from others' mistakes is faster than making them yourself!

### SemanticSearchService Anti-Patterns

#### ❌ **Anti-Pattern 1: Not Caching Query Embeddings**

```typescript
// BAD: Generate embedding on every search (expensive!)
async search(query: string): Promise<SearchResult[]> {
  const embedding = await this.openAIClient.createEmbedding(query);  // $$$
  return this.repository.search(embedding);
}
```

**Why it's bad:** Each OpenAI API call costs money and adds ~200ms latency. Same query searched 10 times = 10 API calls.

**✅ Correct Approach:**
```typescript
// GOOD: Cache embeddings (LRU 1000 entries)
private embeddi ngCache = new LRUCache<string, Float32Array>(1000);

async search(query: string): Promise<SearchResult[]> {
  let embedding = this.embeddingCache.get(query);
  if (!embedding) {
    embedding = await this.openAIClient.createEmbedding(query);
    this.embeddingCache.set(query, embedding);
  }
  return this.repository.search(embedding);
}
```

#### ❌ **Anti-Pattern 2: Returning Raw Similarity Scores**

```typescript
// BAD: Return 0.15 similarity (confusing - higher or lower is better?)
return { operation_id: 'create_issue', similarity: 0.15 };
```

**Why it's bad:** Cosine distance is counter-intuitive (0 = identical, 2 = opposite). LLMs expect higher scores = better.

**✅ Correct Approach:**
```typescript
// GOOD: Convert distance to similarity (1 - distance)
return { 
  operation_id: 'create_issue', 
  similarity_score: 1 - row.distance  // Now 0.85 (higher is better)
};
```

---

### BitbucketClientService Anti-Patterns

#### ❌ **Anti-Pattern 3: Not Resetting Retry Counter on Success**

```typescript
// BAD: Retry counter never resets
private retryCount = 0;

async executeOperation(id: string): Promise<any> {
  if (this.retryCount >= MAX_RETRIES) throw new Error('Max retries');
  
  try {
    return await this.httpClient.post(url, data);
    // BUG: retryCount not reset on success!
  } catch (error) {
    this.retryCount++;
    throw error;
  }
}
```

**Why it's bad:** After 3 failures, ALL future requests fail even if Bitbucket recovered.

**✅ Correct Approach:**
```typescript
// GOOD: Reset counter on each success
async executeOperation(id: string): Promise<any> {
  try {
    const result = await this.httpClient.post(url, data);
    this.retryCount = 0;  // ✅ Reset on success
    return result;
  } catch (error) {
    this.retryCount++;
    if (this.retryCount >= MAX_RETRIES) {
      this.retryCount = 0;  // Reset for next operation
      throw error;
    }
    await this.exponentialBackoff(this.retryCount);
    return this.executeOperation(id);  // Recursive retry
  }
}
```

#### ❌ **Anti-Pattern 4: Logging Credentials in Error Messages**

```typescript
// BAD: Credentials in logs (security risk!)
catch (error) {
  logger.error('Auth failed', {
    username: credentials.username,
    password: credentials.password  // 🚨 SECURITY VIOLATION
  });
}
```

**Why it's bad:** Logs may be stored unencrypted, sent to external systems (Datadog), or viewed by unauthorized users.

**✅ Correct Approach:**
```typescript
// GOOD: Sanitize sensitive data
catch (error) {
  logger.error('Auth failed', {
    username: credentials.username,
    password: '***',  // Mask sensitive data
    bitbucket_url: credentials.bitbucket_url,
    error_code: error.code
  });
}
```

---

### AuthManager Anti-Patterns

#### ❌ **Anti-Pattern 5: Not Validating OAuth State Parameter**

```typescript
// BAD: No CSRF protection (security vulnerability!)
async handleOAuthCallback(code: string): Promise<Credentials> {
  // BUG: Not checking 'state' parameter
  return this.exchangeCodeForTokens(code);
}
```

**Why it's bad:** Attacker can forge OAuth callback, leading to account takeover (CSRF attack).

**✅ Correct Approach:**
```typescript
// GOOD: Validate state parameter (CSRF protection)
private pendingState: string;

async startOAuthFlow(): Promise<string> {
  this.pendingState = crypto.randomUUID();  // Generate random state
  const authUrl = `${bitbucketUrl}/oauth/authorize?state=${this.pendingState}`;
  return authUrl;
}

async handleOAuthCallback(code: string, state: string): Promise<Credentials> {
  if (state !== this.pendingState) {
    throw new SecurityError('Invalid OAuth state - possible CSRF attack');
  }
  this.pendingState = null;  // Consume state (one-time use)
  return this.exchangeCodeForTokens(code);
}
```

#### ❌ **Anti-Pattern 6: Hardcoding Token Refresh Threshold**

```typescript
// BAD: Refresh only when token expires (race condition!)
if (new Date() >= credentials.expires_at) {
  credentials = await this.refreshToken(credentials);
}
```

**Why it's bad:** If token expires between check and usage, API call fails with 401.

**✅ Correct Approach:**
```typescript
// GOOD: Refresh with buffer (5 minutes before expiry)
const REFRESH_BUFFER_MS = 5 * 60 * 1000;  // 5 minutes
const expiryWithBuffer = new Date(credentials.expires_at.getTime() - REFRESH_BUFFER_MS);

if (new Date() >= expiryWithBuffer) {
  credentials = await this.refreshToken(credentials);
}
```

---

### General Anti-Patterns

#### ❌ **Anti-Pattern 7: Using `any` Type Instead of `unknown`**

```typescript
// BAD: Type safety disabled
function parseBitbucketResponse(response: any): Issue {
  return response.fields;  // No validation, runtime errors possible
}
```

**✅ Correct Approach:**
```typescript
// GOOD: Use unknown + type guards
function parseBitbucketResponse(response: unknown): Issue {
  if (!isBitbucketResponse(response)) {
    throw new ValidationError('Invalid Bitbucket response schema');
  }
  return response.fields;  // Type-safe after validation
}
```

#### ❌ **Anti-Pattern 8: Catching Errors Without Context**

```typescript
// BAD: Generic error handling (debugging nightmare)
try {
  await service.executeOperation(id, params);
} catch (error) {
  logger.error('Operation failed');  // Which operation? What params?
}
```

**✅ Correct Approach:**
```typescript
// GOOD: Log error with full context
try {
  await service.executeOperation(id, params);
} catch (error) {
  logger.error('Operation failed', {
    operation_id: id,
    params: sanitizeParams(params),  // Remove sensitive data
    error_message: error.message,
    stack_trace: error.stack,
    correlation_id: getCurrentCorrelationId()
  });
  throw error;  // Re-throw after logging
}
```

---

### Summary: Key Takeaways

1. **Always cache expensive operations** (API calls, embeddings generation)
2. **Reset failure counters on success** (retries, circuit breakers)
3. **Never log sensitive data** (passwords, tokens, API keys)
4. **Validate security parameters** (OAuth state, CSRF tokens)
5. **Use unknown over any** (maintain type safety)
6. **Refresh tokens with buffer** (avoid expiry race conditions)
7. **Convert distances to similarities** (intuitive for LLMs)
8. **Log errors with full context** (operation ID, params, correlation ID)

