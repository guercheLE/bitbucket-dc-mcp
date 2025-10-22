# 🌐 TESTE HTTP DIRETO - Diagnóstico create_comment

## 🎯 Objetivo

Este teste vai fazer requisições HTTP **DIRETAS** para o Bitbucket, **SEM passar pelo MCP**. Isso vai provar se:

- ✅ O problema está **NO MCP** (código do bitbucket-dc-mcp)
- ❌ Ou o problema está **NA API** do Bitbucket

## 📋 Pré-requisitos

Você precisa de um **Personal Access Token** do Bitbucket com permissão de escrita.

### Como Obter o Token:

1. Acesse: `https://bitbucket.daycoval.dev.br/profile`
2. Vá em **"Personal access tokens"** ou **"Tokens de acesso pessoal"**
3. Clique em **"Create token"** ou **"Criar token"**
4. Configure:
   - **Name**: `MCP Diagnostic Test`
   - **Permissions**: Marque **"Write"** em **"Repositories"**
   - **Expiry**: 1 dia (é só para teste)
5. Clique em **"Create"** e **COPIE o token** (você só verá uma vez!)

## 🚀 Como Executar

### No Windows (PowerShell)

```powershell
# 1. Navegue até o diretório
cd C:\Users\gl0022\AppData\Local\nvm\v22.15.1\node_modules\bitbucket-dc-mcp

# 2. Abra o arquivo no Notepad para editar
notepad test-http-direct.ps1

# 3. Na linha 15, substitua "SEU_TOKEN_AQUI" pelo token que você copiou:
$BITBUCKET_TOKEN = "ATBBxxx..."  # Cole seu token aqui

# 4. Salve e feche o Notepad

# 5. Execute o script
.\test-http-direct.ps1
```

## 📊 Interpretação dos Resultados

### ✅ Cenário 1: TESTE 1 e 2 com SUCESSO

```
✅ TESTE 1: SUCESSO!
✅ TESTE 2: SUCESSO!
❌ TESTE 3: ERRO ESPERADO (body vazio)
```

**Conclusão**: 
- 🎯 **O PROBLEMA ESTÁ NO MCP!**
- A API do Bitbucket está funcionando perfeitamente
- O MCP não está enviando o body corretamente

**Próximo passo**: Investigar o código do MCP que monta o body HTTP.

---

### ❌ Cenário 2: TODOS OS TESTES FALHARAM

```
❌ TESTE 1: ERRO "Text must be provided"
❌ TESTE 2: ERRO "Text must be provided"
❌ TESTE 3: ERRO "Text must be provided"
```

**Conclusão**:
- 🔴 **PROBLEMA NA API DO BITBUCKET OU NO TOKEN**
- Verifique se:
  - Token tem permissão de escrita
  - PR #173 ainda está aberto
  - Seu usuário tem permissão no repositório

**Próximo passo**: Verificar permissões e token.

---

### ⚠️ Cenário 3: TESTE 1 FALHOU, mas TESTE 2 SUCESSO

```
❌ TESTE 1: ERRO
✅ TESTE 2: SUCESSO (com emoji)
```

**Conclusão**:
- 🤔 Problema intermitente ou de encoding
- Pode ser problema de caracteres especiais na primeira tentativa

**Próximo passo**: Repetir teste.

---

## 📁 Onde Estão os Logs

Os logs serão salvos em:
```
C:\Users\gl0022\AppData\Local\nvm\v22.15.1\node_modules\bitbucket-dc-mcp\http-test-logs\
```

Arquivos gerados:
- `teste-1-simples-http_[timestamp].log`
- `teste-2-emoji-http_[timestamp].log`
- `teste-3-vazio-http_[timestamp].log`

## 🔍 O Que Procurar nos Logs

### Se o teste teve SUCESSO:

O log terá algo assim:
```json
STATUS: SUCESSO
RESPONSE:
{
  "id": 12345,
  "text": "Teste HTTP direto...",
  "author": { ... },
  "createdDate": 1729630123000
}
```

### Se o teste FALHOU:

O log terá:
```json
STATUS: ERRO
Status Code: 400
Body:
{
  "errors": [
    {
      "message": "Text must be provided when adding a comment."
    }
  ]
}
```

## 🐛 Troubleshooting

### Erro: "Cannot convert value..."
- O token não foi configurado corretamente
- Abra o arquivo e verifique a linha 15

### Erro: "401 Unauthorized"
- Token inválido ou expirado
- Gere um novo token

### Erro: "403 Forbidden"  
- Token sem permissão de escrita
- Crie novo token com permissão "Write" em "Repositories"

### Erro: "404 Not Found"
- PR #173 não existe ou foi fechado
- Verifique se o PR ainda está aberto no Bitbucket

## 📤 Compartilhando Resultados

Depois de executar, compartilhe:

1. A saída no console (copie tudo)
2. Os 3 arquivos `.log` da pasta `http-test-logs\`

Com esses dados, conseguiremos:
- ✅ Confirmar se o problema é no MCP ou na API
- ✅ Identificar a causa exata
- ✅ Implementar a correção definitiva

---

## 💡 Por Que Este Teste é Importante?

Este teste **elimina o MCP da equação** e testa a API diretamente. Se:

- **HTTP direto funciona** → Problema no MCP (nosso código)
- **HTTP direto falha** → Problema na API ou permissões

É o teste mais rápido para isolar o problema! 🎯

