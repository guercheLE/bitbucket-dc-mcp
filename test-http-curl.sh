#!/bin/bash
# test-http-curl.sh
# Versão alternativa usando cURL (para Windows com Git Bash ou WSL)

# ===========================================================================
# CONFIGURAÇÃO
# ===========================================================================
BITBUCKET_TOKEN="SEU_TOKEN_AQUI"  # ← SUBSTITUA PELO SEU TOKEN!
BITBUCKET_URL="https://bitbucket.daycoval.dev.br"
PROJECT_KEY="DAYC3"
REPOSITORY_SLUG="couchbase"
PULL_REQUEST_ID="173"

# ===========================================================================

echo ""
echo "========================================"
echo "  TESTE HTTP DIRETO (cURL)"
echo "========================================"
echo ""

if [ "$BITBUCKET_TOKEN" = "SEU_TOKEN_AQUI" ]; then
    echo "❌ ERRO: Token não configurado!"
    echo ""
    echo "Edite o arquivo e configure o BITBUCKET_TOKEN na linha 6"
    echo ""
    exit 1
fi

URL="$BITBUCKET_URL/rest/api/latest/projects/$PROJECT_KEY/repos/$REPOSITORY_SLUG/pull-requests/$PULL_REQUEST_ID/comments"

mkdir -p http-test-logs
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

echo "🌐 URL: $URL"
echo ""

# ===========================================================================
# TESTE 1: Comentário Simples
# ===========================================================================
echo "========================================"
echo "📝 TESTE 1: Comentário Simples"
echo "========================================"
echo ""

BODY1='{"text":"Teste HTTP direto - comentario simples - diagnostico"}'

echo "📄 Body: $BODY1"
echo ""
echo "🚀 Enviando..."
echo ""

curl -X POST "$URL" \
  -H "Authorization: Bearer $BITBUCKET_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$BODY1" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -o "http-test-logs/teste-1-simples-curl_$TIMESTAMP.log" \
  -s -S

if [ $? -eq 0 ]; then
    echo "✅ Requisição enviada"
else
    echo "❌ Erro ao enviar requisição"
fi

echo ""
echo "💾 Log: http-test-logs/teste-1-simples-curl_$TIMESTAMP.log"
echo ""

sleep 2

# ===========================================================================
# TESTE 2: Comentário com Emoji
# ===========================================================================
echo "========================================"
echo "📝 TESTE 2: Comentário com Emoji"
echo "========================================"
echo ""

BODY2='{"text":"🟢 Teste HTTP direto - com emoji - diagnostico"}'

echo "📄 Body: $BODY2"
echo ""
echo "🚀 Enviando..."
echo ""

curl -X POST "$URL" \
  -H "Authorization: Bearer $BITBUCKET_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$BODY2" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -o "http-test-logs/teste-2-emoji-curl_$TIMESTAMP.log" \
  -s -S

if [ $? -eq 0 ]; then
    echo "✅ Requisição enviada"
else
    echo "❌ Erro ao enviar requisição"
fi

echo ""
echo "💾 Log: http-test-logs/teste-2-emoji-curl_$TIMESTAMP.log"
echo ""

sleep 2

# ===========================================================================
# TESTE 3: Body Vazio
# ===========================================================================
echo "========================================"
echo "📝 TESTE 3: Body Vazio (Controle)"
echo "========================================"
echo ""

BODY3='{}'

echo "📄 Body: $BODY3"
echo ""
echo "🚀 Enviando..."
echo ""

curl -X POST "$URL" \
  -H "Authorization: Bearer $BITBUCKET_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$BODY3" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -o "http-test-logs/teste-3-vazio-curl_$TIMESTAMP.log" \
  -s -S

if [ $? -eq 0 ]; then
    echo "✅ Requisição enviada (esperamos erro 400)"
else
    echo "❌ Erro ao enviar requisição"
fi

echo ""
echo "💾 Log: http-test-logs/teste-3-vazio-curl_$TIMESTAMP.log"
echo ""

# ===========================================================================
# RESUMO
# ===========================================================================
echo ""
echo "========================================"
echo "  RESUMO"
echo "========================================"
echo ""
echo "📁 Logs salvos em: http-test-logs/"
echo ""
echo "📄 Arquivos:"
ls -1 http-test-logs/*$TIMESTAMP*.log | sed 's/.*\//   - /'
echo ""
echo "🔍 Revise os logs para ver os resultados:"
echo ""
echo "   cat http-test-logs/teste-1-simples-curl_$TIMESTAMP.log"
echo "   cat http-test-logs/teste-2-emoji-curl_$TIMESTAMP.log"
echo "   cat http-test-logs/teste-3-vazio-curl_$TIMESTAMP.log"
echo ""
echo "✅ Testes concluídos!"
echo ""

