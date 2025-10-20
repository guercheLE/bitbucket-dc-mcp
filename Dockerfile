# Multi-stage Dockerfile for Bitbucket Data Center MCP Server
# Stage 1: Builder - Compile TypeScript (embeddings must be pre-generated)
FROM node:22-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and scripts FIRST (needed for preinstall/postinstall)
COPY package*.json tsconfig.json ./
COPY scripts/ ./scripts/

# Copy pre-generated data files - MUST exist before npm ci
# embeddings.db must be generated before building Docker image
COPY data/ ./data/

# Validate embeddings.db exists BEFORE installing dependencies
# This ensures build fails fast if embeddings are missing
RUN if [ ! -f data/embeddings.db ]; then \
        echo ""; \
        echo "❌ ERROR: embeddings.db not found!"; \
        echo ""; \
        echo "The embeddings database must be generated BEFORE building the Docker image."; \
        echo ""; \
        echo "To generate the embeddings database, run:"; \
        echo "  npm run download-openapi"; \
        echo "  npm run generate-schemas"; \
        echo "  npm run generate-embeddings"; \
        echo "  npm run populate-db"; \
        echo ""; \
        echo "Then rebuild the Docker image."; \
        echo ""; \
        exit 1; \
    fi

# Validate embeddings.db has expected size (>1MB)
RUN [ $(stat -c%s data/embeddings.db) -gt 1000000 ] || \
    (echo "ERROR: embeddings.db is too small (< 1MB) - may be corrupted" && exit 1)

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY vitest.config.ts ./

# Build TypeScript to JavaScript
# This will run validate-embeddings script via prebuild hook
RUN npm run build

# Stage 3: Final production image
# Use Node.js 22 slim image
FROM node:22-slim AS production

# Install runtime dependencies only (python3 for native modules)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/* && \
    groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (skip scripts to avoid preinstall/postinstall)
RUN npm ci --production --ignore-scripts && \
    npm cache clean --force

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist

# Copy embeddings database from builder
COPY --from=builder /app/data/embeddings.db ./data/embeddings.db

# Copy entrypoint script
COPY scripts/docker-entrypoint.sh ./scripts/
RUN chmod +x ./scripts/docker-entrypoint.sh

# Create volume mount point for config
VOLUME ["/root/.bitbucket-mcp"]

# Run as non-root user for security
USER nodejs

# Health check to verify server is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node /app/dist/healthcheck.js || exit 1

# Entrypoint script validates env vars and starts MCP server
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
