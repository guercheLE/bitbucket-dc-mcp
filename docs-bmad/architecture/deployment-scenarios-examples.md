# Deployment Scenarios & Examples

### Scenario 1: Docker Deployment (Production)

**Use Case:** Deploy em Kubernetes cluster para shared team usage

```bash
# Build Docker image com embeddings pre-generated
docker build --build-arg OPENAI_API_KEY=sk-... -t bitbucket-dc-mcp:1.0.0 .

# Run container com config volume mounted
docker run -d --name bitbucket-mcp \
  -v /data/bitbucket-mcp-config:/root/.bitbucket-mcp \
  -e LOG_LEVEL=info \
  --restart unless-stopped \
  bitbucket-dc-mcp:1.0.0

# Check logs
docker logs -f bitbucket-mcp

# Connect from Claude Desktop (configure MCP client to use docker exec)
# claude-mcp-config.json:
{
  "mcpServers": {
    "bitbucket": {
      "command": "docker",
      "args": ["exec", "-i", "bitbucket-mcp", "node", "dist/index.js"]
    }
  }
}
```

### Scenario 2: npm Global Install (Development)

**Use Case:** Local development workstation

```bash
# Install globally
npm install -g bitbucket-dc-mcp

# Run setup wizard
bitbucket-mcp setup
# Configures: Bitbucket URL, auth method, credentials (saved to ~/.bitbucket-mcp/)

# Test search
bitbucket-mcp search "create issue"

# Connect from Claude Desktop
# claude-mcp-config.json:
{
  "mcpServers": {
    "bitbucket": {
      "command": "bitbucket-mcp"
    }
  }
}
```

### Scenario 3: Kubernetes Deployment (Enterprise)

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bitbucket-mcp-server
spec:
  replicas: 3  # Horizontal scaling (stateless design)
  selector:
    matchLabels:
      app: bitbucket-mcp
  template:
    metadata:
      labels:
        app: bitbucket-mcp
    spec:
      containers:
      - name: bitbucket-mcp
        image: your-org/bitbucket-dc-mcp:1.0.0
        env:
        - name: BITBUCKET_URL
          valueFrom:
            configMapKeyRef:
              name: bitbucket-mcp-config
              key: bitbucket_url
        - name: BITBUCKET_AUTH_METHOD
          value: "pat"
        - name: BITBUCKET_TOKEN
          valueFrom:
            secretKeyRef:
              name: bitbucket-mcp-secret
              key: pat_token
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        stdin: true
        tty: false
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: bitbucket-mcp-config
data:
  bitbucket_url: "https://bitbucket.company.com"
---
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-mcp-secret
type: Opaque
stringData:
  pat_token: "your-personal-access-token"
```

