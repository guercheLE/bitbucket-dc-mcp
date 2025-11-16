# Rollback Procedures

### Docker Rollback

```bash
# Before upgrade: Tag current working version
docker tag bitbucket-dc-mcp:latest bitbucket-dc-mcp:rollback-v1.0.0

# Upgrade
docker pull bitbucket-dc-mcp:1.1.0
docker tag bitbucket-dc-mcp:1.1.0 bitbucket-dc-mcp:latest
docker stop bitbucket-mcp
docker rm bitbucket-mcp
docker run -d --name bitbucket-mcp ... bitbucket-dc-mcp:latest

# If upgrade fails: Rollback
docker stop bitbucket-mcp
docker rm bitbucket-mcp
docker run -d --name bitbucket-mcp ... bitbucket-dc-mcp:rollback-v1.0.0

# Verify
docker logs bitbucket-mcp | tail -50
docker exec bitbucket-mcp node -e "console.log(require('./package.json').version)"
```

### npm Rollback

```bash
# Check current version
npm list -g bitbucket-dc-mcp

# Rollback to specific version
npm install -g bitbucket-dc-mcp@1.0.0

# Or uninstall and reinstall
npm uninstall -g bitbucket-dc-mcp
npm install -g bitbucket-dc-mcp@1.0.0

# Verify
bitbucket-mcp version
```

### Configuration Rollback

```bash
# Config files are automatically backed up on changes
ls -la ~/.bitbucket-mcp/
# config.yml
# config.yml.backup-20250115-143022
# config.yml.backup-20250114-091544

# Restore backup
cp ~/.bitbucket-mcp/config.yml.backup-20250115-143022 ~/.bitbucket-mcp/config.yml

# Restart MCP server
# Credentials in OS keychain are not affected (persist across config changes)
```

