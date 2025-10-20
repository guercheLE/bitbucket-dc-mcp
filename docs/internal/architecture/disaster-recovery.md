# Disaster Recovery

### Data Backup Strategy

**Critical Data:**
1. **Config Files:** `~/.bitbucket-mcp/config.yml`
   - Backup: Daily, keep 30 days
   - Recovery: Restore from backup or re-run setup wizard

2. **Credentials:** OS Keychain entries
   - Backup: OS-level keychain backup (user responsibility)
   - Recovery: Re-authenticate via setup wizard

**Regenerable Data (not critical):**
3. **Embeddings DB:** `data/embeddings.db`
   - Backup: Optional (can regenerate)
   - Recovery: `npm run build:all` (requires OpenAI API key)

4. **Generated Schemas:** `src/validation/generated-schemas.ts`
   - Backup: Git-committed (part of source)
   - Recovery: `npm run build:schemas`

### Recovery Scenarios

**Scenario 1: Corrupted embeddings.db**
```bash
# Symptoms: search_ids fails with "Database error"
# Recovery:
cd bitbucket-dc-mcp-server
npm run build:openapi
npm run build:schemas
npm run build:embeddings  # Requires OPENAI_API_KEY
npm run build:db
npm run build
# Estimated time: 5-10 minutes
```

**Scenario 2: Lost config file**
```bash
# Symptoms: Server fails to start, "Config not found"
# Recovery:
bitbucket-mcp setup  # Re-run setup wizard
# OR restore from backup:
cp ~/.bitbucket-mcp/config.yml.backup-YYYYMMDD ~/.bitbucket-mcp/config.yml
# Estimated time: 5 minutes (wizard) or instant (restore)
```

**Scenario 3: Lost credentials**
```bash
# Symptoms: Authentication errors (401/403)
# Recovery:
bitbucket-mcp setup  # Re-run setup wizard, re-authenticate
# Wizard will update OS keychain with new credentials
# Estimated time: 5 minutes
```

**Scenario 4: Total system failure**
```bash
# Recovery steps:
1. Reinstall: npm install -g bitbucket-dc-mcp@1.0.0
2. Restore config: cp backup ~/.bitbucket-mcp/config.yml
3. Re-authenticate: bitbucket-mcp setup (credentials only)
4. Embeddings regenerate automatically on first search (or run build:all)
# Estimated time: 10-15 minutes
```

### Backup Automation (Recommendation)

```bash
# cron job for daily config backup
0 2 * * * cp ~/.bitbucket-mcp/config.yml ~/.bitbucket-mcp/config.yml.backup-$(date +\%Y\%m\%d)

# cleanup old backups (keep 30 days)
0 3 * * * find ~/.bitbucket-mcp/ -name "config.yml.backup-*" -mtime +30 -delete
```

