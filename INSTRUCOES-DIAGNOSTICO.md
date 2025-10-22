# 🚀 INSTRUÇÕES RÁPIDAS - Diagnóstico na Máquina do Escritório

## 📝 O Que Fazer na Máquina do Escritório (Windows)

### 1️⃣ Sincronizar o Código Atualizado

```powershell
# Opção A: Se tem Git configurado no NPM global
cd C:\Users\gl0022\AppData\Local\nvm\v22.15.1\node_modules\bitbucket-dc-mcp
git pull origin main  # ou a branch que você está usando

# Opção B: Copiar manualmente
# Copie o arquivo src/services/bitbucket-client.ts atualizado do seu Mac
# para a máquina Windows
```

### 2️⃣ Recompilar o Projeto

```powershell
cd C:\Users\gl0022\AppData\Local\nvm\v22.15.1\node_modules\bitbucket-dc-mcp
npm run build
```

**Aguarde a compilação terminar!** Deve aparecer algo como:
```
✅ Embeddings database validated successfully
> bitbucket-dc-mcp@1.3.1 build
> tsc
```

### 3️⃣ Copiar os Scripts de Teste

Copie estes arquivos do seu Mac para a máquina Windows no diretório do `bitbucket-dc-mcp`:

- `test-create-comment.ps1`
- `DIAGNOSTICO-CREATE-COMMENT.md` (opcional, para referência)

### 4️⃣ Executar o Script de Diagnóstico

```powershell
cd C:\Users\gl0022\AppData\Local\nvm\v22.15.1\node_modules\bitbucket-dc-mcp

# Executar o script
.\test-create-comment.ps1
```

### 5️⃣ Coletar os Logs

Após a execução, o script criará uma pasta `diagnostic-logs\` com arquivos como:

```
diagnostic-logs\
  ├── teste-1-simples_2025-10-22_14-30-00.log
  ├── teste-2-emoji_2025-10-22_14-30-00.log
  └── teste-3-markdown_2025-10-22_14-30-00.log
```

### 6️⃣ Analisar os Logs

Abra os arquivos `.log` e procure por estas linhas-chave:

#### ✅ Logs que indicam SUCESSO:

```json
"event": "bitbucket_client.extract_body_include"
"key": "text"
"valueType": "string"
"valueLength": 41
```

```json
"event": "bitbucket_client.extract_body_final"
"bodyKeys": ["text"]
"isEmpty": false
```

#### ❌ Logs que indicam o PROBLEMA:

```json
"event": "bitbucket_client.extract_body_empty"
"allParams": ["projectKey", "repositorySlug", "pullRequestId", "text"]
"pathParams": ["projectKey", "repositorySlug", "pullRequestId"]
```

OU

```json
"event": "bitbucket_client.extract_body_final"
"bodyKeys": []
"isEmpty": true
```

### 7️⃣ Compartilhar os Resultados

**Envie para análise:**
1. Os 3 arquivos `.log` gerados
2. Um print ou cópia das linhas que contêm `extract_body_`

Pode comprimir tudo em um ZIP e me enviar.

---

## 🔍 O Que Estamos Investigando

O código adicionado vai mostrar **exatamente**:

1. ✅ Quais parâmetros estão chegando na função
2. ✅ Quais são identificados como "path parameters"
3. ✅ Quais são incluídos no body da requisição
4. ✅ Se o body final está vazio ou não
5. ✅ O conteúdo do body JSON que será enviado

Com essas informações, conseguiremos identificar se:

- O parâmetro `text` está sendo **removido incorretamente**
- O body está sendo **serializado de forma errada**
- Há algum **problema de encoding** com caracteres especiais

---

## ⚡ Solução Temporária (Se Urgente)

Se você precisar criar comentários AGORA e não pode esperar o diagnóstico:

### Opção 1: Interface Web
Criar os comentários manualmente no Bitbucket.

### Opção 2: Usar cURL Direto

```powershell
$headers = @{
    "Authorization" = "Bearer SEU_TOKEN_AQUI"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

$body = @{
    text = "Seu comentário aqui"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://bitbucket.daycoval.dev.br/rest/api/latest/projects/DAYC3/repos/couchbase/pull-requests/173/comments" `
  -Method POST `
  -Headers $headers `
  -Body $body
```

---

## 🆘 Precisa de Ajuda?

Se tiver qualquer dúvida ao executar:

1. Tire print da tela do erro
2. Copie a mensagem de erro completa
3. Me envie junto com o contexto (qual passo estava executando)

---

## ✅ Checklist

- [ ] Código atualizado (`git pull` ou cópia manual)
- [ ] Projeto recompilado (`npm run build`)
- [ ] Script copiado (`test-create-comment.ps1`)
- [ ] Script executado (`.\test-create-comment.ps1`)
- [ ] Logs coletados (pasta `diagnostic-logs\`)
- [ ] Logs analisados (procurou por `extract_body_`)
- [ ] Resultados compartilhados (arquivos `.log` enviados)

---

## 📞 Próxima Etapa

Após você executar isso e me enviar os logs, vou:

1. ✅ Identificar a causa raiz exata
2. ✅ Implementar a correção definitiva
3. ✅ Testar a solução
4. ✅ Enviar o código corrigido para você
5. ✅ Garantir que o `create_comment_2` funcione perfeitamente

---

**Tempo estimado**: 10-15 minutos para executar tudo

