#!/bin/sh
set -e

# Docker entrypoint script for Bitbucket Data Center MCP Server
# Validates environment, checks dependencies, and starts the MCP server

echo "🚀 Starting Bitbucket Data Center MCP Server..."

# Validate required environment variables
if [ -z "$BITBUCKET_URL" ]; then
  echo "❌ ERROR: BITBUCKET_URL environment variable is required"
  echo "   Example: docker run -e BITBUCKET_URL=https://bitbucket.example.com ..."
  exit 1
fi

echo "✅ BITBUCKET_URL configured: $BITBUCKET_URL"

# Validate authentication method is set
if [ -z "$BITBUCKET_AUTH_METHOD" ]; then
  echo "⚠️  WARNING: BITBUCKET_AUTH_METHOD not set, defaulting to 'pat'"
  export BITBUCKET_AUTH_METHOD="pat"
fi

echo "✅ Auth method: $BITBUCKET_AUTH_METHOD"

# Validate auth credentials based on method
case "$BITBUCKET_AUTH_METHOD" in
  pat)
    if [ -z "$BITBUCKET_TOKEN" ]; then
      echo "❌ ERROR: BITBUCKET_TOKEN required for PAT authentication"
      exit 1
    fi
    echo "✅ PAT token configured"
    ;;
  basic)
    if [ -z "$BITBUCKET_USERNAME" ] || [ -z "$BITBUCKET_PASSWORD" ]; then
      echo "❌ ERROR: BITBUCKET_USERNAME and BITBUCKET_PASSWORD required for Basic authentication"
      exit 1
    fi
    echo "✅ Basic auth credentials configured"
    ;;
  oauth1|oauth2)
    echo "ℹ️  OAuth authentication detected - credentials should be in config file"
    ;;
  *)
    echo "⚠️  WARNING: Unknown auth method '$BITBUCKET_AUTH_METHOD'"
    ;;
esac

# Check if embeddings database exists
if [ ! -f "/app/data/embeddings.db" ]; then
  echo "❌ ERROR: embeddings.db not found at /app/data/embeddings.db"
  echo "   The Docker image may be corrupted or incomplete"
  exit 1
fi

echo "✅ Embeddings database found ($(du -h /app/data/embeddings.db | cut -f1))"

# Check if config file exists in volume mount (optional)
if [ -f "/root/.bitbucket-dc-mcp/config.yml" ]; then
  echo "✅ Config file found in volume mount"
else
  echo "ℹ️  No config file in volume mount, using environment variables only"
fi

# Display configuration summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Configuration Summary:"
echo "  Bitbucket URL: $BITBUCKET_URL"
echo "  Auth Method: $BITBUCKET_AUTH_METHOD"
echo "  Log Level: ${LOG_LEVEL:-info}"
echo "  Rate Limit: ${BITBUCKET_RATE_LIMIT:-100} req/min"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run any pending migrations (placeholder for future use)
# echo "🔄 Running database migrations..."
# node /app/dist/migrations.js

echo "🎯 Starting MCP server..."

# Use exec to replace shell process with Node.js for proper signal handling
# This ensures SIGTERM/SIGINT are handled correctly by the application
exec node /app/dist/index.js
