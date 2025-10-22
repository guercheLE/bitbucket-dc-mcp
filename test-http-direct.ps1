# test-http-direct.ps1
# Script para testar create_comment DIRETAMENTE via HTTP (sem MCP)
# Isso vai provar se o problema é no MCP ou na API do Bitbucket

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTE HTTP DIRETO - create_comment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ===========================================================================
# CONFIGURAÇÃO - VOCÊ PRECISA PREENCHER ESTAS INFORMAÇÕES
# ===========================================================================

# Seu Personal Access Token do Bitbucket
$BITBUCKET_TOKEN = "SEU_TOKEN_AQUI"  # ← SUBSTITUA PELO SEU TOKEN!

# URL base do seu Bitbucket
$BITBUCKET_URL = "https://bitbucket.daycoval.dev.br"

# Informações do Pull Request
$PROJECT_KEY = "DAYC3"
$REPOSITORY_SLUG = "couchbase"
$PULL_REQUEST_ID = "173"

# ===========================================================================

Write-Host "⚙️  Configuração:" -ForegroundColor Green
Write-Host "   Bitbucket URL: $BITBUCKET_URL" -ForegroundColor Gray
Write-Host "   Project: $PROJECT_KEY" -ForegroundColor Gray
Write-Host "   Repository: $REPOSITORY_SLUG" -ForegroundColor Gray
Write-Host "   Pull Request: $PULL_REQUEST_ID" -ForegroundColor Gray
Write-Host "   Token: " -NoNewline -ForegroundColor Gray
if ($BITBUCKET_TOKEN -eq "SEU_TOKEN_AQUI") {
    Write-Host "❌ NÃO CONFIGURADO!" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  ATENÇÃO: Você precisa configurar o BITBUCKET_TOKEN no script!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Como obter o token:" -ForegroundColor Yellow
    Write-Host "  1. Acesse: $BITBUCKET_URL/profile" -ForegroundColor Gray
    Write-Host "  2. Vá em 'Personal access tokens' ou 'Tokens de acesso pessoal'" -ForegroundColor Gray
    Write-Host "  3. Crie um novo token com permissão de 'Write' em repositórios" -ForegroundColor Gray
    Write-Host "  4. Copie o token e cole no script na linha 15" -ForegroundColor Gray
    Write-Host ""
    exit 1
} else {
    Write-Host "✅ Configurado (${BITBUCKET_TOKEN.Substring(0, 4)}...)" -ForegroundColor Green
}
Write-Host ""

# Criar diretório para logs
$logDir = ".\http-test-logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# ===========================================================================
# TESTE 1: Comentário Simples (apenas "text")
# ===========================================================================
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "📝 TESTE 1: Comentário Simples" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

$url = "$BITBUCKET_URL/rest/api/latest/projects/$PROJECT_KEY/repos/$REPOSITORY_SLUG/pull-requests/$PULL_REQUEST_ID/comments"

$headers = @{
    "Authorization" = "Bearer $BITBUCKET_TOKEN"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$body = @{
    text = "Teste HTTP direto - comentario simples - diagnostico"
} | ConvertTo-Json

Write-Host "🌐 URL:" -ForegroundColor Cyan
Write-Host "   $url" -ForegroundColor Gray
Write-Host ""
Write-Host "📄 Request Body:" -ForegroundColor Cyan
Write-Host $body -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Enviando requisição HTTP..." -ForegroundColor Cyan
Write-Host ""

$logFile1 = Join-Path $logDir "teste-1-simples-http_$timestamp.log"

try {
    $response = Invoke-RestMethod `
        -Uri $url `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ SUCESSO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📥 Resposta do servidor:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Gray
    
    # Salvar resposta no log
    @"
TESTE 1: Comentário Simples
========================================
STATUS: SUCESSO
URL: $url
REQUEST BODY:
$body

RESPONSE:
$($response | ConvertTo-Json -Depth 5)
"@ | Out-File -FilePath $logFile1 -Encoding UTF8
    
} catch {
    Write-Host "❌ ERRO!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Detalhes do erro:" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Gray
    Write-Host "   Status: $($_.Exception.Response.StatusDescription)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Mensagem:" -ForegroundColor Gray
    
    # Tentar ler o corpo da resposta de erro
    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        $reader.Close()
        
        Write-Host $errorBody -ForegroundColor DarkRed
        
        # Salvar erro no log
        @"
TESTE 1: Comentário Simples
========================================
STATUS: ERRO
URL: $url
REQUEST BODY:
$body

ERROR RESPONSE:
Status Code: $($_.Exception.Response.StatusCode.value__)
Status: $($_.Exception.Response.StatusDescription)

Body:
$errorBody
"@ | Out-File -FilePath $logFile1 -Encoding UTF8
        
    } catch {
        Write-Host $_.Exception.Message -ForegroundColor DarkRed
        
        @"
TESTE 1: Comentário Simples
========================================
STATUS: ERRO
URL: $url
REQUEST BODY:
$body

ERROR:
$($_.Exception.Message)
"@ | Out-File -FilePath $logFile1 -Encoding UTF8
    }
}

Write-Host ""
Write-Host "💾 Log salvo em: $logFile1" -ForegroundColor Cyan
Write-Host ""

# Aguardar antes do próximo teste
Start-Sleep -Seconds 2

# ===========================================================================
# TESTE 2: Comentário com Emoji
# ===========================================================================
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "📝 TESTE 2: Comentário com Emoji" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

$body2 = @{
    text = "🟢 Teste HTTP direto - com emoji - diagnostico"
} | ConvertTo-Json

Write-Host "📄 Request Body:" -ForegroundColor Cyan
Write-Host $body2 -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Enviando requisição HTTP..." -ForegroundColor Cyan
Write-Host ""

$logFile2 = Join-Path $logDir "teste-2-emoji-http_$timestamp.log"

try {
    $response = Invoke-RestMethod `
        -Uri $url `
        -Method POST `
        -Headers $headers `
        -Body $body2 `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ SUCESSO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📥 Resposta do servidor:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Gray
    
    @"
TESTE 2: Comentário com Emoji
========================================
STATUS: SUCESSO
URL: $url
REQUEST BODY:
$body2

RESPONSE:
$($response | ConvertTo-Json -Depth 5)
"@ | Out-File -FilePath $logFile2 -Encoding UTF8
    
} catch {
    Write-Host "❌ ERRO!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Detalhes do erro:" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Gray
    Write-Host "   Status: $($_.Exception.Response.StatusDescription)" -ForegroundColor Gray
    Write-Host ""
    
    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Host $errorBody -ForegroundColor DarkRed
        
        @"
TESTE 2: Comentário com Emoji
========================================
STATUS: ERRO
URL: $url
REQUEST BODY:
$body2

ERROR RESPONSE:
Status Code: $($_.Exception.Response.StatusCode.value__)
Body:
$errorBody
"@ | Out-File -FilePath $logFile2 -Encoding UTF8
        
    } catch {
        Write-Host $_.Exception.Message -ForegroundColor DarkRed
        
        @"
TESTE 2: Comentário com Emoji
========================================
STATUS: ERRO
$($_.Exception.Message)
"@ | Out-File -FilePath $logFile2 -Encoding UTF8
    }
}

Write-Host ""
Write-Host "💾 Log salvo em: $logFile2" -ForegroundColor Cyan
Write-Host ""

# Aguardar antes do próximo teste
Start-Sleep -Seconds 2

# ===========================================================================
# TESTE 3: Comentário Vazio (para confirmar o erro)
# ===========================================================================
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "📝 TESTE 3: Body Vazio (Teste de Controle)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Este teste envia um body VAZIO para confirmar que recebemos" -ForegroundColor Gray
Write-Host "o mesmo erro que o MCP está recebendo." -ForegroundColor Gray
Write-Host ""

$body3 = "{}"  # Body vazio

Write-Host "📄 Request Body:" -ForegroundColor Cyan
Write-Host $body3 -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Enviando requisição HTTP..." -ForegroundColor Cyan
Write-Host ""

$logFile3 = Join-Path $logDir "teste-3-vazio-http_$timestamp.log"

try {
    $response = Invoke-RestMethod `
        -Uri $url `
        -Method POST `
        -Headers $headers `
        -Body $body3 `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "❓ SUCESSO (inesperado!)" -ForegroundColor Yellow
    Write-Host ""
    $response | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Gray
    
    @"
TESTE 3: Body Vazio
========================================
STATUS: SUCESSO (INESPERADO!)
RESPONSE:
$($response | ConvertTo-Json -Depth 5)
"@ | Out-File -FilePath $logFile3 -Encoding UTF8
    
} catch {
    Write-Host "✅ ERRO ESPERADO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Este é o erro que esperávamos:" -ForegroundColor Green
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Gray
    Write-Host ""
    
    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Host $errorBody -ForegroundColor DarkYellow
        
        @"
TESTE 3: Body Vazio (Controle)
========================================
STATUS: ERRO ESPERADO
URL: $url
REQUEST BODY: {}

ERROR RESPONSE:
Status Code: $($_.Exception.Response.StatusCode.value__)
Body:
$errorBody
"@ | Out-File -FilePath $logFile3 -Encoding UTF8
        
    } catch {
        Write-Host $_.Exception.Message -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "💾 Log salvo em: $logFile3" -ForegroundColor Cyan
Write-Host ""

# ===========================================================================
# RESUMO
# ===========================================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMO DOS TESTES HTTP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📁 Logs salvos em: $logDir\" -ForegroundColor Green
Write-Host ""
Write-Host "📄 Arquivos:" -ForegroundColor Cyan
Get-ChildItem -Path $logDir -Filter "*$timestamp*.log" | ForEach-Object {
    Write-Host "   - $($_.Name)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "🔍 INTERPRETAÇÃO DOS RESULTADOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se TESTE 1 e TESTE 2 falharam com 'Text must be provided':" -ForegroundColor White
Write-Host "   ➜ O problema está no MCP (body não está sendo enviado)" -ForegroundColor Red
Write-Host ""
Write-Host "Se TESTE 1 e TESTE 2 tiveram SUCESSO:" -ForegroundColor White
Write-Host "   ➜ A API está funcionando! O problema É no MCP!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Se TESTE 3 falhou com 'Text must be provided':" -ForegroundColor White
Write-Host "   ➜ Confirmado que body vazio gera esse erro específico" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Testes HTTP concluídos!" -ForegroundColor Green
Write-Host ""
Write-Host "📤 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. Revise os logs em: $logDir\" -ForegroundColor Gray
Write-Host "   2. Compartilhe os resultados" -ForegroundColor Gray
Write-Host "   3. Com base nos resultados, saberemos se o problema" -ForegroundColor Gray
Write-Host "      está no MCP ou na API do Bitbucket" -ForegroundColor Gray
Write-Host ""

