#!/bin/bash

# Script para testar create_comment_2 com debug habilitado

echo "🔍 Teste de create_comment_2 com debug logging"
echo "=============================================="
echo ""

# Set environment variables for debug logging
export LOG_LEVEL=debug
export NODE_ENV=development

# Test 1: Simple text without special characters
echo "📝 Teste 1: Texto simples"
echo ""

node dist/cli.js call create_comment_2 \
  --projectKey "DAYC3" \
  --repositorySlug "couchbase" \
  --pullRequestId "173" \
  --text "Teste de comentario simples sem emojis"

echo ""
echo "=============================================="
echo ""

# Wait a moment
sleep 2

# Test 2: Text with emojis
echo "📝 Teste 2: Texto com emoji"
echo ""

node dist/cli.js call create_comment_2 \
  --projectKey "DAYC3" \
  --repositorySlug "couchbase" \
  --pullRequestId "173" \
  --text "🟢 Teste com emoji"

echo ""
echo "=============================================="
echo "✅ Testes concluídos"

