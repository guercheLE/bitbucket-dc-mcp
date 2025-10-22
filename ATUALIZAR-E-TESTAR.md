# 🔄 ATUALIZAR E TESTAR - Debug Logging Completo

## 🎯 O Que Foi Adicionado

Adicionei **logging detalhado** em TODOS os pontos críticos:

### ✅ Logs Adicionados em `bitbucket-client.ts`:
1. **Antes de extrair o body** - mostra todos os parâmetros recebidos
2. **Durante extração do body** - mostra quais params são path vs body
3. **Depois da extração** - mostra o body final que será enviado
4. **Na requisição HTTP** - mostra se o body existe e seu tamanho

### ✅ Logs Adicionados em `call-id-tool.ts`:
1. **Parâmetros recebidos** - antes da validação
2. **Resultado da validação** - quais keys foram validadas
3. **Antes de enviar** - dados que serão enviados ao BitbucketClient

## 🚀 Como Atualizar na Máquina do Escritório

### Opção A: Via NPM (Recomendado)

Quando eu publicar a nova versão no NPM, você vai atualizar assim:

```powershell
# 1. Desinstalar versão antiga
npm uninstall -g bitbucket-dc-mcp

# 2. Instalar nova versão
npm install -g bitbucket-dc-mcp@latest

# 3. Verificar versão instalada (deve ser 1.4.0 ou superior)
npx bitbucket-dc-mcp --version
```

### Opção B: Via Git Pull (Se tem Git)

```powershell
cd C:\Users\gl0022\AppData\Local\nvm\v22.15.1\node_modules\bitbucket-dc-mcp
git pull origin main
npm run build
```

### Opção C: Copiar Arquivos Manualmente

1. Faça download destes arquivos do GitHub:
   - `dist/services/bitbucket-client.js`
   - `dist/tools/call-id-tool.js`
   
2. Substitua em:
   ```
   C:\Users\gl0022\AppData\Local\nvm\v22.15.1\node_modules\bitbucket-dc-mcp\dist\
   ```

## 📊 Como Testar com Debug Logging

### 1. Habilitar Debug Level

```powershell
$env:LOG_LEVEL = "debug"
```

### 2. Executar create_comment via MCP

Usando o MCP diretamente (via Cursor/Claude Desktop):

```json
{
  "operation_id": "create_comment_2",
  "parameters": {
    "projectKey": "DAYC3",
    "repositorySlug": "couchbase",
    "pullRequestId": "173",
    "text": "Teste com debug logging ativado"
  }
}
```

### 3. Capturar os Logs

Os logs serão salvos em:
```
%USERPROFILE%\.bitbucket-dc-mcp\logs\bitbucket-dc-mcp-<data>.log
```

Ou aparecem no console se estiver rodando em foreground.

## 🔍 Logs Importantes a Buscar

### Logs Críticos do `extractRequestBody`:

```jsonc
// 1. INÍCIO da extração
{
  "event": "bitbucket_client.extract_body_start",
  "method": "post",
  "path": "/rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/pull-requests/{pullRequestId}/comments",
  "pathParamNames": ["projectKey", "repositorySlug", "pullRequestId"],
  "allParamKeys": ["projectKey", "repositorySlug", "pullRequestId", "text"],  // ← DEVE incluir "text"!
  "paramsCount": 4,
  "params": {
    "projectKey": "DAYC3",
    "repositorySlug": "couchbase",
    "pullRequestId": "173",
    "text": "Teste com debug..."
  }
}

// 2. Parâmetros sendo FILTRADOS
{
  "event": "bitbucket_client.extract_body_skip",
  "key": "projectKey",
  "reason": "path_parameter"
}
// ... (repetir para repositorySlug e pullRequestId)

// 3. Parâmetro sendo INCLUÍDO
{
  "event": "bitbucket_client.extract_body_include",
  "key": "text",  // ← DEVE aparecer!
  "valueType": "string",
  "valueLength": 28
}

// 4. Body FINAL antes de serializar
{
  "event": "bitbucket_client.extract_body_final",
  "bodyKeys": ["text"],  // ← DEVE ter "text" aqui!
  "isEmpty": false  // ← DEVE ser false!
}

// 5. Resultado da extração
{
  "event": "bitbucket_client.extract_body_result",
  "source": "filtered",
  "bodyLength": 43,
  "bodyPreview": "{\"text\":\"Teste com debug...\"}",  // ← DEVE estar correto!
  "bodyKeys": ["text"]
}

// 6. Request HTTP sendo enviado
{
  "event": "bitbucket_client.api_request",
  "operationId": "create_comment_2",
  "method": "post",
  "hasBody": true,  // ← DEVE ser true!
  "bodyLength": 43,
  "bodyPreview": "{\"text\":\"Teste com debug...\"}"
}
```

### ⚠️ Se o Body Estiver Vazio (BUG):

```jsonc
{
  "event": "bitbucket_client.extract_body_empty",
  "path": "/rest/api/latest/projects/.../comments",
  "method": "post",
  "allParams": ["projectKey", "repositorySlug", "pullRequestId", "text"],
  "pathParams": ["projectKey", "repositorySlug", "pullRequestId"]
  // ← Se "text" aparecer em "pathParams", ACHAMOS O BUG!
}
```

### ⚠️ Se o Body Não Está Sendo Enviado:

```jsonc
{
  "event": "bitbucket_client.api_request",
  "hasBody": false,  // ← PROBLEMA! Deveria ser true
  "bodyLength": undefined
}
```

## 📤 O Que Me Enviar

Depois de executar o teste:

1. **Arquivo de log completo** (ou pelo menos as linhas com `extract_body_*`)
2. **Erro retornado** (se houver)
3. **Resultado** (sucesso ou falha)

## 🎯 Cenários Esperados

### ✅ Cenário 1: Body Sendo Criado Corretamente

Se você ver:
- `extract_body_start` com "text" em `allParamKeys`
- `extract_body_include` para o "text"
- `extract_body_final` com `isEmpty: false`
- `extract_body_result` com body não-vazio
- MAS ainda assim erro 400

**Significa**: O body está sendo criado, mas não está sendo enviado no HTTP request.

### ❌ Cenário 2: "text" Sendo Filtrado Como Path Param

Se você ver:
- `extract_body_skip` para "text"
- `extract_body_final` com `isEmpty: true`
- `extract_body_empty` warning

**Significa**: Bug na lógica de identificação de path parameters.

### ⚠️ Cenário 3: Parâmetros Não Chegando

Se você NÃO ver "text" em `allParamKeys` no `extract_body_start`:

**Significa**: Problema na validação de parâmetros antes de chegar no BitbucketClient.

---

## 💡 Próximos Passos

Após executar o teste e me enviar os logs:

1. ✅ Analisarei exatamente onde o bug está ocorrendo
2. ✅ Implementarei o fix específico
3. ✅ Testarei a solução
4. ✅ Publicarei nova versão no NPM
5. ✅ Você atualiza e testa

---

**Com esses logs detalhados, VOU ENCONTRAR O BUG COM CERTEZA!** 🎯

