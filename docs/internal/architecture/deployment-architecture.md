# Deployment Architecture

### Deployment Strategy

**Frontend Deployment:**
- **Platform:** N/A (produto é backend/CLI apenas)
- **Build Command:** N/A
- **Output Directory:** N/A
- **CDN/Edge:** N/A

**Backend Deployment:**
- **Platform:** Self-hosted (Docker, npm, bare metal) on customer infrastructure
- **Build Command:** `npm run build` (TypeScript → JavaScript)
- **Deployment Method:** 
  1. **Docker:** Multi-stage build → lightweight Alpine image (<200MB)
  2. **npm:** Global package (`npm install -g`) → systemd/PM2 service
  3. **Bare Metal:** Clone repo → build → run via process manager

**Rationale:** Self-hosted deployment é requirement para compliance (GDPR, HIPAA). Cloud-hosted seria deal-breaker para 70%+ do mercado enterprise.

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [22]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Build
        run: npm run build
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Upload coverage
        if: matrix.os == 'ubuntu-latest' && matrix.node-version == '22'
        uses: codecov/codecov-action@v3
  
  build-docker:
    runs-on: ubuntu-latest
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push multi-arch
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            your-org/bitbucket-dc-mcp:latest
            your-org/bitbucket-dc-mcp:${{ github.sha }}
  
  publish-npm:
    runs-on: ubuntu-latest
    needs: lint-and-test
    if: startsWith(github.ref, 'refs/tags/v')
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|--------------|-------------|---------|
| Development | N/A | localhost (stdio) | Local development |
| Staging | N/A | Customer staging (stdio) | Pre-production testing |
| Production | N/A | Customer production (stdio) | Live environment |

**Notes:**
- "Backend URL" é stdio transport (stdin/stdout), não HTTP URL
- Cada customer tem sua própria instância self-hosted
- No centralized staging/production (customer-controlled deployment)

