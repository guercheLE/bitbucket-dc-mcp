# Docker HTTP Mode Examples

This directory contains examples for running the Bitbucket DC MCP Server in HTTP mode using Docker.

## Files

- `docker-http-server.ts` - Node.js example for HTTP server with Docker
- `docker-compose-http.yml` - Docker Compose configuration for HTTP mode
- `Dockerfile.http` - Optimized Dockerfile for HTTP mode
- `README-docker-http.md` - This documentation

## Quick Start

### 1. Build the HTTP Image

```bash
# Build the standard image
docker build -t bitbucket-dc-mcp:latest .

# Or build the HTTP-optimized image
docker build -f examples/Dockerfile.http -t bitbucket-dc-mcp-http:latest .
```

### 2. Run HTTP Mode

```bash
# Basic HTTP server
docker run -d \
  --name bitbucket-mcp-http \
  -p 3000:3000 \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_TOKEN=your-token \
  bitbucket-dc-mcp:latest \
  node /app/dist/cli.js http --host 0.0.0.0 --port 3000

# HTTP server with CORS
docker run -d \
  --name bitbucket-mcp-http \
  -p 3000:3000 \
  -e BITBUCKET_URL=https://bitbucket.example.com \
  -e BITBUCKET_TOKEN=your-token \
  bitbucket-dc-mcp:latest \
  node /app/dist/cli.js http --host 0.0.0.0 --port 3000 --cors
```

### 3. Use Docker Compose

```bash
# Copy the example compose file
cp examples/docker-compose-http.yml docker-compose-http.yml

# Create .env file
echo "BITBUCKET_URL=https://bitbucket.example.com" > .env
echo "BITBUCKET_TOKEN=your-token" >> .env

# Start the service
docker-compose -f docker-compose-http.yml up -d
```

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BITBUCKET_URL` | Your Bitbucket Data Center URL | Required |
| `BITBUCKET_TOKEN` | Personal Access Token | Required |
| `BITBUCKET_AUTH_METHOD` | Authentication method | `pat` |
| `LOG_LEVEL` | Logging level | `info` |
| `BITBUCKET_RATE_LIMIT` | Rate limit (req/min) | `100` |
| `BITBUCKET_TIMEOUT_MS` | Request timeout (ms) | `30000` |

### HTTP Server Options

| Option | Description | Default |
|--------|-------------|---------|
| `--host` | Host to bind to | `0.0.0.0` |
| `--port` | Port to listen on | `3000` |
| `--cors` | Enable CORS | `false` |

## Testing

### Test HTTP Server

```bash
# Test basic connectivity
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'

# Test with authentication
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

### Test MCP Tools

```bash
# Test search_ids tool
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "search_ids",
      "arguments": {
        "query": "create repository",
        "limit": 5
      }
    },
    "id": 1
  }'
```

## Monitoring

### Health Check

```bash
# Check server health
curl http://localhost:3000/health
```

### Metrics (if enabled)

```bash
# View Prometheus metrics
curl http://localhost:9090/metrics
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   
   # Use different port
   docker run -p 8080:8080 ... --port 8080
   ```

2. **Authentication failed**
   ```bash
   # Check environment variables
   docker exec bitbucket-mcp-http env | grep BITBUCKET
   
   # Check logs
   docker logs bitbucket-mcp-http
   ```

3. **CORS issues**
   ```bash
   # Enable CORS
   docker run ... --cors
   ```

### Debug Mode

```bash
# Run with debug logging
docker run -e LOG_LEVEL=debug ... bitbucket-dc-mcp:latest
```

## Security Considerations

1. **Network Security**
   - Use `--host 127.0.0.1` for localhost-only access
   - Use `--host 0.0.0.0` for network access (less secure)

2. **Authentication**
   - Use environment variables for credentials
   - Consider using Docker secrets for production

3. **HTTPS**
   - Use reverse proxy (nginx, traefik) for HTTPS
   - Consider Let's Encrypt for SSL certificates

## Production Deployment

### Using Docker Compose

```yaml
version: '3.8'
services:
  bitbucket-mcp-http:
    image: bitbucket-dc-mcp:latest
    ports:
      - "3000:3000"
    environment:
      BITBUCKET_URL: ${BITBUCKET_URL}
      BITBUCKET_TOKEN: ${BITBUCKET_TOKEN}
    command: ["node", "/app/dist/cli.js", "http", "--host", "0.0.0.0", "--port", "3000", "--cors"]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
```

### Using Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bitbucket-mcp-http
spec:
  replicas: 1
  selector:
    matchLabels:
      app: bitbucket-mcp-http
  template:
    metadata:
      labels:
        app: bitbucket-mcp-http
    spec:
      containers:
      - name: bitbucket-mcp-http
        image: bitbucket-dc-mcp:latest
        ports:
        - containerPort: 3000
        env:
        - name: BITBUCKET_URL
          value: "https://bitbucket.example.com"
        - name: BITBUCKET_TOKEN
          valueFrom:
            secretKeyRef:
              name: bitbucket-secrets
              key: token
        command: ["node", "/app/dist/cli.js", "http", "--host", "0.0.0.0", "--port", "3000"]
---
apiVersion: v1
kind: Service
metadata:
  name: bitbucket-mcp-http-service
spec:
  selector:
    app: bitbucket-mcp-http
  ports:
  - port: 3000
    targetPort: 3000
  type: LoadBalancer
```

## More Examples

- [HTTP Server Guide](../docs/http-server.md)
- [Docker Guide](../docs/docker.md)
- [Authentication Guide](../docs/authentication.md)
- [Troubleshooting Guide](../docs/troubleshooting.md)
