# test-create-comment.ps1
# Script para diagnosticar create_comment_2 no Windows
# 
# Uso: .\test-create-comment.ps1
# 
# Este script executa testes com a operação create_comment_2 e captura logs detalhados
# para diagnosticar por que o body está chegando vazio no Bitbucket

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DIAGNÓSTICO: create_comment_2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório correto
if (-not (Test-Path ".\dist\cli.js")) {
    Write-Host "❌ ERRO: dist\cli.js não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Execute este script no diretório do bitbucket-dc-mcp:" -ForegroundColor Yellow
    Write-Host "  cd C:\Users\gl0022\AppData\Local\nvm\v22.15.1\node_modules\bitbucket-dc-mcp" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Habilitar debug logging
$env:LOG_LEVEL = "debug"
$env:NODE_ENV = "development"

Write-Host "⚙️  Configuração:" -ForegroundColor Green
Write-Host "   LOG_LEVEL = debug"
Write-Host "   NODE_ENV = development"
Write-Host ""

# Criar diretório para logs
$logDir = ".\diagnostic-logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

Write-Host "📁 Logs serão salvos em: $logDir\" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# TESTE 1: Texto simples
# ============================================================
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "📝 TESTE 1: Texto Simples" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Parâmetros:" -ForegroundColor Gray
Write-Host "  projectKey: DAYC3" -ForegroundColor Gray
Write-Host "  repositorySlug: couchbase" -ForegroundColor Gray
Write-Host "  pullRequestId: 173" -ForegroundColor Gray
Write-Host "  text: 'Teste de comentario simples - diagnóstico'" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Executando..." -ForegroundColor Cyan
Write-Host ""

$logFile1 = Join-Path $logDir "teste-1-simples_$timestamp.log"

node dist/cli.js call create_comment_2 `
  --projectKey "DAYC3" `
  --repositorySlug "couchbase" `
  --pullRequestId "173" `
  --text "Teste de comentario simples - diagnostico" `
  *>&1 | Tee-Object -FilePath $logFile1

Write-Host ""
Write-Host "✅ Teste 1 concluído. Log salvo em:" -ForegroundColor Green
Write-Host "   $logFile1" -ForegroundColor Gray
Write-Host ""

# Aguardar um pouco
Start-Sleep -Seconds 3

# ============================================================
# TESTE 2: Texto com emoji
# ============================================================
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "📝 TESTE 2: Texto com Emoji" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Parâmetros:" -ForegroundColor Gray
Write-Host "  projectKey: DAYC3" -ForegroundColor Gray
Write-Host "  repositorySlug: couchbase" -ForegroundColor Gray
Write-Host "  pullRequestId: 173" -ForegroundColor Gray
Write-Host "  text: '🟢 Teste com emoji - diagnóstico'" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Executando..." -ForegroundColor Cyan
Write-Host ""

$logFile2 = Join-Path $logDir "teste-2-emoji_$timestamp.log"

node dist/cli.js call create_comment_2 `
  --projectKey "DAYC3" `
  --repositorySlug "couchbase" `
  --pullRequestId "173" `
  --text "🟢 Teste com emoji - diagnostico" `
  *>&1 | Tee-Object -FilePath $logFile2

Write-Host ""
Write-Host "✅ Teste 2 concluído. Log salvo em:" -ForegroundColor Green
Write-Host "   $logFile2" -ForegroundColor Gray
Write-Host ""

# Aguardar um pouco
Start-Sleep -Seconds 3

# ============================================================
# TESTE 3: Texto com formatação Markdown
# ============================================================
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "📝 TESTE 3: Texto com Markdown" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

$markdownText = @"
**TESTE DE DIAGNÓSTICO**

Este é um comentário com:
- Formatação Markdown
- Lista de itens
- **Negrito**

Código:
``````
texto code block
``````
"@

Write-Host "Parâmetros:" -ForegroundColor Gray
Write-Host "  projectKey: DAYC3" -ForegroundColor Gray
Write-Host "  repositorySlug: couchbase" -ForegroundColor Gray
Write-Host "  pullRequestId: 173" -ForegroundColor Gray
Write-Host "  text: [Markdown complexo]" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Executando..." -ForegroundColor Cyan
Write-Host ""

$logFile3 = Join-Path $logDir "teste-3-markdown_$timestamp.log"

node dist/cli.js call create_comment_2 `
  --projectKey "DAYC3" `
  --repositorySlug "couchbase" `
  --pullRequestId "173" `
  --text $markdownText `
  *>&1 | Tee-Object -FilePath $logFile3

Write-Host ""
Write-Host "✅ Teste 3 concluído. Log salvo em:" -ForegroundColor Green
Write-Host "   $logFile3" -ForegroundColor Gray
Write-Host ""

# ============================================================
# RESUMO
# ============================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📁 Todos os logs foram salvos em:" -ForegroundColor Green
Write-Host "   $logDir\" -ForegroundColor Gray
Write-Host ""

# Listar arquivos de log criados
Write-Host "📄 Arquivos gerados:" -ForegroundColor Cyan
Get-ChildItem -Path $logDir -Filter "*$timestamp*.log" | ForEach-Object {
    Write-Host "   - $($_.Name)" -ForegroundColor Gray
}
Write-Host ""

# Verificar se há eventos de debug nos logs
Write-Host "🔍 Buscando eventos de debug nos logs..." -ForegroundColor Cyan
Write-Host ""

$foundDebugEvents = $false

Get-ChildItem -Path $logDir -Filter "*$timestamp*.log" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    
    if ($content -match "extract_body_debug|extract_body_final|extract_body_empty") {
        $foundDebugEvents = $true
        Write-Host "✅ Eventos de debug encontrados em: $($_.Name)" -ForegroundColor Green
        
        # Extrair linhas relevantes
        $content -split "`n" | Where-Object { 
            $_ -match "extract_body" -or $_ -match "bitbucket_client\.request_start"
        } | Select-Object -First 20 | ForEach-Object {
            Write-Host "   $_" -ForegroundColor DarkGray
        }
        Write-Host ""
    }
}

if (-not $foundDebugEvents) {
    Write-Host "⚠️  Nenhum evento de debug encontrado nos logs!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Isso pode significar:" -ForegroundColor Yellow
    Write-Host "  1. O código atualizado não foi compilado (rode: npm run build)" -ForegroundColor Yellow
    Write-Host "  2. LOG_LEVEL não está como 'debug'" -ForegroundColor Yellow
    Write-Host "  3. Os logs estão em outro lugar (stderr vs stdout)" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================
# PRÓXIMOS PASSOS
# ============================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PRÓXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Revise os logs em: $logDir\" -ForegroundColor White
Write-Host ""
Write-Host "2. Procure por estes eventos de debug:" -ForegroundColor White
Write-Host "   • bitbucket_client.extract_body_debug" -ForegroundColor Gray
Write-Host "   • bitbucket_client.extract_body_include" -ForegroundColor Gray
Write-Host "   • bitbucket_client.extract_body_skip" -ForegroundColor Gray
Write-Host "   • bitbucket_client.extract_body_final" -ForegroundColor Gray
Write-Host "   • bitbucket_client.extract_body_empty (IMPORTANTE!)" -ForegroundColor Red
Write-Host ""
Write-Host "3. Se encontrar 'extract_body_empty' ou 'isEmpty: true':" -ForegroundColor White
Write-Host "   ➜ O parâmetro 'text' está sendo filtrado incorretamente!" -ForegroundColor Red
Write-Host ""
Write-Host "4. Compartilhe os logs para análise detalhada" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Diagnóstico concluído!" -ForegroundColor Green
Write-Host ""

