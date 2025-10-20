# Database Schema

### sqlite-vec Schema

```sql
-- Operations metadata table
CREATE TABLE operations (
    operation_id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    summary TEXT NOT NULL,
    description TEXT,
    tags TEXT, -- JSON array
    parameters TEXT, -- JSON array
    request_body TEXT, -- JSON
    responses TEXT, -- JSON
    deprecated INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Embeddings virtual table (sqlite-vec extension)
CREATE VIRTUAL TABLE embeddings USING vec0(
    operation_id TEXT PRIMARY KEY,
    vector FLOAT[768] -- 768 dimensions (Xenova/all-mpnet-base-v2)
);

-- Index para fast lookups
CREATE INDEX idx_operations_tags ON operations(tags);
CREATE INDEX idx_operations_method ON operations(method);

-- Exemplo de query de cosine similarity search
-- SELECT 
--   e.operation_id,
--   o.summary,
--   vec_distance_cosine(e.vector, :query_vector) as similarity
-- FROM embeddings e
-- JOIN operations o ON e.operation_id = o.operation_id
-- ORDER BY similarity ASC  -- ASC porque vec_distance_cosine retorna distância (menor = mais similar)
-- LIMIT :limit;
```

**Schema Rationale:**
- `operations` table: Metadata denormalized para fast reads (no JOINs complexos)
- `embeddings` virtual table: sqlite-vec otimiza storage e queries de vectors
- JSON columns: Flexibilidade para nested structures sem schema migrations
- Indexes: Tags e method queries são comuns em filters futuros
- Primary key: `operation_id` é unique, stable (não muda entre API versions)

**Performance Considerations:**
- Database size: ~500 operations × 768 floats × 4 bytes = ~1.5MB embeddings + ~1MB metadata = **~2.5MB total**
- Query latency: <100ms para cosine similarity search (target <50ms median)
- No writes em runtime: Database é read-only após build (append-only se adicionar custom operations v1.2+)
- Backup strategy: `embeddings.db` pode ser regenerado via build script (não é crítico backup)

### Database Migration Strategy

**Schema Versioning:**
```sql
-- Metadata table para track schema version
CREATE TABLE schema_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_metadata (key, value) VALUES ('version', '1.0.0');
INSERT INTO schema_metadata (key, value) VALUES ('built_at', datetime('now'));
INSERT INTO schema_metadata (key, value) VALUES ('openapi_version', '11.0.1');
```

**Migration Files Structure:**
```
migrations/
├── v1.0.0_initial_schema.sql
├── v1.1.0_add_tags_index.sql
├── v1.1.0_add_tags_index.rollback.sql
├── v1.2.0_add_custom_operations.sql
└── v1.2.0_add_custom_operations.rollback.sql
```

**Migration Execution:**
```typescript
// src/core/database-migrator.ts
class DatabaseMigrator {
  async getCurrentVersion(): Promise<string> {
    // Read from schema_metadata table
  }
  
  async applyMigrations(targetVersion?: string): Promise<void> {
    // Apply migrations sequentially
    // Each migration wrapped in transaction
    // Update schema_metadata on success
  }
  
  async rollback(toVersion: string): Promise<void> {
    // Execute rollback scripts in reverse order
  }
}
```

**Startup Migration Check:**
```typescript
// src/index.ts startup sequence
async function startup() {
  const db = await initDatabase();
  const migrator = new DatabaseMigrator(db);
  
  const currentVersion = await migrator.getCurrentVersion();
  const appVersion = require('../package.json').version;
  
  if (semver.lt(currentVersion, appVersion)) {
    logger.info(`Applying migrations from ${currentVersion} to ${appVersion}`);
    await migrator.applyMigrations(appVersion);
  }
  
  // Continue with MCP server startup
}
```

**Migration Strategy:**
- **Additive changes:** Safe to apply (add columns, add indexes)
- **Breaking changes:** Require major version bump + rebuild strategy
- **Zero-downtime:** Old versions must work with new schema (grace period)
- **Rebuild trigger:** `npm run rebuild-db` regenerates entire database from scratch

**Backup & Recovery:**
```bash
# Backup current database before migration
cp data/embeddings.db data/embeddings.db.backup

# If migration fails, rollback
npm run db:rollback -- --to-version 1.0.0

# Or restore from backup
mv data/embeddings.db.backup data/embeddings.db
```

**Version Compatibility Matrix:**
| App Version | Min DB Version | Max DB Version |
|-------------|----------------|----------------|
| 1.0.x       | 1.0.0          | 1.0.x          |
| 1.1.x       | 1.0.0          | 1.1.x          |
| 1.2.x       | 1.1.0          | 1.2.x          |

