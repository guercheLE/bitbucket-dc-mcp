# 🔍 DIAGNÓSTICO: Problema com create_comment_2

## 📋 Resumo do Problema

A operação `create_comment_2` está falhando com erro **400 - ValidationError**: "Text must be provided when adding a comment", mesmo quando o parâmetro `text` está sendo enviado.

## 🎯 Causa Provável Identificada

O body da requisição HTTP está chegando **VAZIO** no servidor Bitbucket, apesar do parâmetro `text` estar sendo enviado. A função `extractRequestBody()` pode estar:

1. Removendo TODOS os parâmetros (incluindo `text`) por engano
2. Não identificando corretamente quais são path parameters vs body parameters
3. Gerando um body JSON vazio ou malformado

## 🔧 O Que Foi Feito

Adicionei **logging detalhado** na função `extractRequestBody()` em `src/services/bitbucket-client.ts` para diagnosticar exatamente o que está acontecendo.

## 📝 Passos para Diagnosticar na Máquina do Escritório (Windows)

### Passo 1: Atualizar o Código

```bash
# No diretório bitbucket-dc-mcp
cd C:\Users\gl0022\AppData\Local\nvm\v22.15.1\node_modules\bitbucket-dc-mcp

# Pull das mudanças (ou copie o arquivo bitbucket-client.ts atualizado)
# Recompilar
npm run build
```

### Passo 2: Criar Script de Teste (Windows PowerShell)

Crie o arquivo `test-create-comment.ps1`:

```powershell
# test-create-comment.ps1
# Script para diagnosticar create_comment_2 no Windows

Write-Host "🔍 Teste de create_comment_2 com debug logging" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Habilitar debug logging
$env:LOG_LEVEL = "debug"
$env:NODE_ENV = "development"

# Test 1: Texto simples
Write-Host "📝 Teste 1: Texto simples sem caracteres especiais" -ForegroundColor Yellow
Write-Host ""

node dist/cli.js call create_comment_2 `
  --projectKey "DAYC3" `
  --repositorySlug "couchbase" `
  --pullRequestId "173" `
  --text "Teste de comentario simples" `
  2>&1 | Tee-Object -FilePath "log-teste-1-simples.txt"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 2

# Test 2: Texto com emoji
Write-Host "📝 Teste 2: Texto com emoji" -ForegroundColor Yellow
Write-Host ""

node dist/cli.js call create_comment_2 `
  --projectKey "DAYC3" `
  --repositorySlug "couchbase" `
  --pullRequestId "173" `
  --text "🟢 Teste com emoji" `
  2>&1 | Tee-Object -FilePath "log-teste-2-emoji.txt"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "✅ Testes concluídos! Logs salvos em log-teste-*.txt" -ForegroundColor Green
```

### Passo 3: Executar o Teste

```powershell
# No PowerShell
cd C:\Users\gl0022\AppData\Local\nvm\v22.15.1\node_modules\bitbucket-dc-mcp
.\test-create-comment.ps1
```

## 🔍 O Que Procurar nos Logs

Os logs de debug agora vão mostrar **exatamente** o que está acontecendo dentro da função `extractRequestBody()`:

### Logs Esperados (Caso de Sucesso):

```json
{
  "event": "bitbucket_client.extract_body_debug",
  "path": "/rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments",
  "pathParamNames": ["projectKey", "repositorySlug", "pullRequestId"],
  "allParamKeys": ["projectKey", "repositorySlug", "pullRequestId", "text"]
}

{
  "event": "bitbucket_client.extract_body_skip",
  "key": "projectKey",
  "reason": "path_parameter"
}

{
  "event": "bitbucket_client.extract_body_skip",
  "key": "repositorySlug",
  "reason": "path_parameter"
}

{
  "event": "bitbucket_client.extract_body_skip",
  "key": "pullRequestId",
  "reason": "path_parameter"
}

{
  "event": "bitbucket_client.extract_body_include",
  "key": "text",
  "valueType": "string",
  "valueLength": 29
}

{
  "event": "bitbucket_client.extract_body_final",
  "bodyKeys": ["text"],
  "isEmpty": false
}

{
  "event": "bitbucket_client.extract_body_result",
  "source": "filtered",
  "bodyLength": 43,
  "bodyPreview": "{\"text\":\"Teste de comentario simples\"}",
  "bodyKeys": ["text"]
}
```

### Logs que Indicam o Problema:

Se você ver este log:

```json
{
  "event": "bitbucket_client.extract_body_empty",
  "path": "/rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments",
  "method": "post",
  "allParams": ["projectKey", "repositorySlug", "pullRequestId", "text"],
  "pathParams": ["projectKey", "repositorySlug", "pullRequestId"]
}
```

**Isso significa que o parâmetro `text` está sendo filtrado incorretamente!**

Se você ver:

```json
{
  "event": "bitbucket_client.extract_body_final",
  "bodyKeys": [],
  "isEmpty": true
}
```

**Isso confirma que o body está vazio!**

## 🐛 Possíveis Causas e Soluções

### Causa 1: Query Parameters Não Identificados

Se `text` estiver sendo tratado como query parameter e filtrado, precisamos ajustar a lógica.

**Solução**: Modificar `extractRequestBody()` para consultar o schema da operação e identificar corretamente os body parameters.

### Causa 2: Problema de Encoding

Se os logs mostrarem que `text` está sendo incluído, mas o Bitbucket ainda retorna erro, pode ser problema de encoding (emojis, UTF-8).

**Solução**: Adicionar normalização de encoding antes de enviar.

### Causa 3: Formato do Body Incorreto

O Bitbucket DC pode esperar um formato específico diferente do Bitbucket Cloud.

**Solução**: Verificar se o body precisa estar em um wrapper específico (ex: `{ comment: { text: "..." } }`).

## 📤 Próximos Passos

1. **Execute o script de teste** na máquina do escritório
2. **Capture os arquivos** `log-teste-1-simples.txt` e `log-teste-2-emoji.txt`
3. **Me envie os logs** - especialmente as linhas com eventos:
   - `bitbucket_client.extract_body_debug`
   - `bitbucket_client.extract_body_skip`
   - `bitbucket_client.extract_body_include`
   - `bitbucket_client.extract_body_final`
   - `bitbucket_client.extract_body_result`
   - `bitbucket_client.extract_body_empty`

4. Com esses logs, conseguirei identificar **exatamente** onde o problema está ocorrendo

## 🔗 Comparação com bitbucket-mcp-server (que funciona)

No projeto que **funciona** (`bitbucket-mcp-server`), a abordagem é diferente:

```typescript
// bitbucket-mcp-server - pullrequests.ts (linha 1520)
const data = await apiService.post(
  `/2.0/repositories/${workspace}/${repo_slug}/pullrequests/${pull_request_id}/comments`,
  validatedParams.body  // <-- Body separado explicitamente
);
```

O parâmetro `body` já vem separado dos path parameters no schema de validação:

```typescript
// Schema define claramente (linha 678)
export const post_repositories_workspace_repo_slug_pullrequests_pull_request_id_commentsSchema = z.object({
  workspace: z.string(),  // path param
  repo_slug: z.string(),  // path param
  pull_request_id: z.string(),  // path param
  body: z.unknown()  // body param (separado)
});
```

**Diferença chave**: O schema já separa path params de body params na validação.

No `bitbucket-dc-mcp`, todos os parâmetros vêm juntos e precisamos separá-los manualmente usando regex no path template.

## 💡 Possível Fix Rápido (Se Confirmado)

Se os logs confirmarem que o problema é a separação de parâmetros, podemos tentar esta solução:

### Opção A: Forçar uso de `body` property

Modificar o input para usar estrutura explícita:

```javascript
{
  operation_id: "create_comment_2",
  parameters: {
    projectKey: "DAYC3",
    repositorySlug: "couchbase", 
    pullRequestId: "173",
    body: {  // <-- Body explícito
      text: "Comentário aqui"
    }
  }
}
```

### Opção B: Consultar operations.json

Modificar `extractRequestBody()` para consultar o schema da operação em `data/operations.json` e identificar corretamente quais parâmetros são do body via `requestBody`.

### Opção C: Adicionar Whitelist/Blacklist

Criar lista de body parameters conhecidos para `create_comment_2`:

```typescript
const KNOWN_BODY_PARAMS: Record<string, string[]> = {
  'create_comment_2': ['text', 'anchor', 'parent', 'severity', 'state']
};
```

## 📋 Checklist de Execução

- [ ] Pull/copiar código atualizado com debug logging
- [ ] Recompilar (`npm run build`)
- [ ] Executar script de teste (`.\test-create-comment.ps1`)
- [ ] Capturar logs (`log-teste-*.txt`)
- [ ] Buscar nos logs os eventos `extract_body_*`
- [ ] Enviar logs para análise
- [ ] Identificar causa raiz
- [ ] Implementar fix definitivo
- [ ] Testar fix
- [ ] Commit e push da solução

---

## 📞 Suporte

Após executar os testes, compartilhe os logs comigo. Com os dados de debug, conseguirei identificar o problema exato e implementar a correção definitiva.

**Arquivos importantes para compartilhar:**
- `log-teste-1-simples.txt`
- `log-teste-2-emoji.txt`
- Qualquer outro log do MCP server que mostre os eventos `extract_body_*`

