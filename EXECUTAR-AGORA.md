# ⚡ EXECUTAR AGORA - Guia Rápido

## 🎯 O Que Fazer na Máquina do Escritório

### 1️⃣ Copiar Arquivo

Copie este arquivo para a máquina do escritório:
```
test-http-direct.ps1
```

Salve em qualquer pasta (exemplo: `C:\Temp\`)

### 2️⃣ Obter Token do Bitbucket

1. Abra o navegador
2. Acesse: `https://bitbucket.daycoval.dev.br/profile`
3. Clique em **"Personal access tokens"**
4. Clique em **"Create token"**
5. Configure:
   - Name: `Teste MCP`
   - Permissions: Marque **"Write"** em **"Repositories"**
   - Expiry: **1 dia**
6. Clique em **"Create"**
7. **COPIE O TOKEN** (você só verá uma vez!)

### 3️⃣ Editar o Script

1. Botão direito em `test-http-direct.ps1`
2. Escolha **"Edit"** ou **"Editar com Notepad"**
3. Na **linha 15**, substitua:
   ```powershell
   $BITBUCKET_TOKEN = "SEU_TOKEN_AQUI"
   ```
   Por:
   ```powershell
   $BITBUCKET_TOKEN = "ATBBxxx..."  # Cole o token aqui
   ```
4. **Salve** (Ctrl+S) e feche

### 4️⃣ Executar

1. Abra **PowerShell** (botão direito no arquivo → "Run with PowerShell")
   
   OU
   
2. No PowerShell:
   ```powershell
   cd C:\Temp  # ou onde salvou
   .\test-http-direct.ps1
   ```

### 5️⃣ Ver Resultados

O script vai criar uma pasta `http-test-logs\` com 3 arquivos de log.

**Copie tudo** que apareceu no console e me envie junto com os 3 arquivos `.log`

---

## 📊 O Que os Resultados Vão Mostrar

### ✅ Caso 1: Testes 1 e 2 SUCESSO

```
✅ TESTE 1: SUCESSO!
✅ TESTE 2: SUCESSO!
```

**Conclusão**: 🎯 **O PROBLEMA ESTÁ NO MCP!**

A API do Bitbucket funciona perfeitamente. O bug está no código do `bitbucket-dc-mcp` que não está enviando o body corretamente.

**Próximo passo**: Vou corrigir o código do MCP.

---

### ❌ Caso 2: Todos os Testes FALHARAM

```
❌ TESTE 1: ERRO
❌ TESTE 2: ERRO
❌ TESTE 3: ERRO
```

**Conclusão**: ⚠️ **Problema de permissão ou token**

Verifique:
- Token tem permissão de "Write"?
- PR #173 ainda está aberto?
- Seu usuário tem acesso ao repositório?

**Próximo passo**: Revisar permissões.

---

## 🆘 Problemas Comuns

### "Execution Policy"

Se aparecer erro sobre "execution policy":
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\test-http-direct.ps1
```

### "401 Unauthorized"

- Token inválido → Gere novo token

### "404 Not Found"

- PR foi fechado ou não existe
- Verifique o número do PR

---

## 📞 Depois de Executar

Me envie:
1. ✅ Tudo que apareceu no console (copie completo)
2. ✅ Os 3 arquivos da pasta `http-test-logs\`

Com esses dados, vou:
- ✅ Confirmar se é bug no MCP ou problema de API
- ✅ Implementar a correção exata
- ✅ Testar e entregar a solução final

---

**Tempo estimado**: 5 minutos ⏱️

