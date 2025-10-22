# OAuth 2.0 Setup Guide for Bitbucket Data Center

> **Guia completo para obter Client ID e Client Secret no Bitbucket Data Center**  
> **Versões:** 7.x, 8.x, 9.x  
> **Tempo estimado:** 10-15 minutos  
> **Última atualização:** 22 de Outubro de 2025

## Índice

- [Visão Geral](#visão-geral)
- [Requisitos por Versão](#requisitos-por-versão)
- [Bitbucket Data Center 7.0+ (Recomendado)](#bitbucket-data-center-70-oauth-20-nativo)
- [Troubleshooting](#troubleshooting)
- [Verificação da Configuração](#verificação-da-configuração)

---

## Visão Geral

OAuth 2.0 permite que o Bitbucket MCP Server acesse seu Bitbucket Data Center de forma segura, sem armazenar senhas. Este guia mostra como:

1. ✅ Criar uma aplicação OAuth 2.0 no Bitbucket
2. ✅ Obter Client ID e Client Secret
3. ✅ Configurar permissões apropriadas
4. ✅ Testar a integração

**Por que OAuth 2.0?**
- 🔒 **Segurança**: Tokens temporários em vez de senhas permanentes
- 🔄 **Refresh tokens**: Renovação automática sem re-autenticação
- 👤 **User-specific**: Cada usuário autoriza individualmente
- 📝 **Auditável**: Todas as ações são rastreadas

---

## Requisitos por Versão

| Versão do Bitbucket DC | OAuth 2.0 Nativo | Alternativas | Recomendação |
|------------------------|------------------|--------------|--------------|
| **9.x** | ✅ Sim | PAT | **OAuth 2.0 (este guia)** |
| **8.x** | ✅ Sim | PAT | **OAuth 2.0 ou PAT** |
| **7.0+** | ✅ Sim | PAT | **PAT** (mais simples) |

> 💡 **Dica**: Se sua versão suporta, considere usar [Personal Access Tokens (PAT)](./authentication.md#2-personal-access-token-pat-recommended-for-development) para uma configuração mais simples.

---

## Bitbucket Data Center 7.0+ (OAuth 2.0 Nativo)

### ✅ Versões Suportadas
- Bitbucket Data Center 7.0 ou superior
- Bitbucket Data Center 8.x (todas as versões)
- Bitbucket Data Center 9.x (todas as versões)

### Passo 1: Verificar Versão do Bitbucket

Antes de começar, confirme que você tem Bitbucket 7.0 ou superior:

```bash
# Acesse: https://seu-bitbucket.com/rest/api/latest/application-properties
# Ou execute no terminal:
curl https://seu-bitbucket.com/rest/api/latest/application-properties | jq '.version'
```

**Resultado esperado:** `"7.0.0"` ou superior

---

### Passo 2: Acessar Administração do Bitbucket

1. **Faça login como administrador**
   - Use uma conta com permissões de **Bitbucket Administrator** ou **System Administrator**

2. **Abra o menu de administração**
   - Clique no ícone de **engrenagem** (⚙️) no canto superior direito
   - Selecione **"Administration"** (Administração)

---

### Passo 3: Criar Application Link

1. **Navegue até Application Links**
   - No menu lateral esquerdo, procure a seção **"Add-ons"**
   - Clique em **"Application Links"**

2. **Inicie a criação de novo link**
   - Clique no botão **"Create link"** no canto superior direito

---

### Passo 4: Configurar Aplicação OAuth 2.0

#### 4.1 Selecionar Tipo de Aplicação

Na janela que abrir:

1. **Tipo de aplicação**: Selecione **"External application"** (Aplicação externa)
2. **Direção**: Selecione **"Incoming"** (Entrada)
   - Isso significa que o Bitbucket **recebe** requisições do MCP Server
3. Clique em **"Continue"** (Continuar)

#### 4.2 Preencher Detalhes da Aplicação

Agora preencha os campos:

| Campo | Valor | Descrição |
|-------|-------|-----------|
| **Name** | `Bitbucket MCP Server` | Nome que aparecerá na lista de apps |
| **Redirect URL** | `http://localhost:8080/callback` | URL de callback local para OAuth |
| **Permissions** | (ver abaixo) | Escopos de acesso necessários |

**Redirect URL por ambiente:**
- **Desenvolvimento local**: `http://localhost:8080/callback`
- **Servidor remoto**: `https://seu-servidor.com/oauth/callback`
- **Porta customizada**: `http://localhost:PORTA/callback` (substitua PORTA)

#### 4.3 Selecionar Permissões (Scopes)

Marque as seguintes permissões:

```
Permissions (Scopes):
✅ REPOSITORY_READ - Read repositories
✅ REPOSITORY_WRITE - Write to repositories
✅ PROJECT_READ - Read projects
✅ ACCOUNT - User account information
```

> **⚠️ Importante**: Se você não marcar os escopos adequados, algumas operações podem falhar.

#### 4.4 Salvar Aplicação

1. Revise todas as informações
2. Clique em **"Save"** (Salvar)

---

### Passo 5: Obter Client ID e Client Secret

Após salvar, você verá a aplicação criada. Agora obtenha as credenciais:

1. **Localizar a aplicação**
   - Na lista de Application Links, encontre **"Bitbucket MCP Server"**
   - Clique no nome da aplicação para abrir detalhes

2. **Copiar Client ID**
   - Copie o Client ID exibido

3. **Revelar e copiar Client Secret**
   - Clique no botão **"Show secret"** (Mostrar segredo)
   - **⚠️ ATENÇÃO**: O secret é mostrado **APENAS UMA VEZ**
   - Copie e salve em um local seguro (gerenciador de senhas, por exemplo)

4. **Confirmar valores copiados**
   - Client ID: `abc123xyz789def456` ✅
   - Client Secret: `XyZ789aBc123DeF456gHi789JkL012mNo345` ✅

---

### Passo 6: Configurar MCP Server

Agora use o setup wizard:

```bash
bitbucket-dc-mcp setup

# Quando solicitado:
# 1. Bitbucket URL: https://seu-bitbucket.com
# 2. Auth method: OAuth 2.0
# 3. Client ID: [Cole o valor copiado]
# 4. Client Secret: [Cole o valor copiado]
# 5. Callback port: 8080 (ou sua porta customizada)
# 6. Autorize no navegador quando solicitado
```

---

## Troubleshooting

### Erro: "Application Links não encontrado no menu"

**Possíveis causas:**
- Seu usuário não tem permissões de administrador
- Bitbucket versão muito antiga (< 7.0)
- Plugin desabilitado

**Soluções:**
1. Verifique permissões: Admin → User Management → Groups
   - Você deve estar em `bitbucket-administrators` ou `bitbucket-system-administrators`
2. Verifique plugins: Admin → Add-ons → Application Links
3. Se não aparecer, contate seu administrador Bitbucket

---

### Erro: "Client Secret não aparece após criação"

**Causa:** Client Secret é mostrado apenas uma vez por segurança.

**Solução:**
1. Delete a aplicação OAuth criada
2. Crie uma nova aplicação seguindo o guia novamente
3. Copie o Client Secret **imediatamente** após criação
4. Salve em um gerenciador de senhas

---

### Erro: "redirect_uri_mismatch" durante OAuth

**Causa:** A URL de callback configurada não corresponde à registrada.

**Solução:**
1. Verifique o Redirect URL no Bitbucket Application Link
2. Deve ser **exatamente**: `http://localhost:8080/callback`
3. Se você mudou a porta, atualize também no Bitbucket:
   - Administração → Application Links → Edite sua aplicação
   - Altere Redirect URL para `http://localhost:SUA_PORTA/callback`

---

### Erro: "insufficient_scope" ao usar a API

**Causa:** Permissões (scopes) insuficientes na aplicação OAuth.

**Solução:**
1. Administração → Application Links → Edite **"Bitbucket MCP Server"**
2. Verifique que os seguintes scopes estão marcados:
   - ✅ `REPOSITORY_READ`
   - ✅ `REPOSITORY_WRITE`
   - ✅ `PROJECT_READ`
   - ✅ `ACCOUNT`
3. Salve e execute `bitbucket-dc-mcp setup --force` novamente

---

## Verificação da Configuração

Após configurar, teste a conexão:

```bash
# Testar autenticação
bitbucket-dc-mcp test-connection

# Deve mostrar:
# ✅ Configuration file found
# ✅ Configuration is valid
# ✅ Credentials found in keychain
# ✅ Connection successful!
# ✅ Authentication verified
```

Se ver erros, consulte o [Troubleshooting](#troubleshooting) acima.

---

## Resumo Rápido por Versão

| Versão | Método Recomendado | Tempo de Setup | Dificuldade |
|--------|-------------------|----------------|-------------|
| **Bitbucket 9.x** | OAuth 2.0 | 10 min | ⭐⭐⭐ Fácil |
| **Bitbucket 8.x** | OAuth 2.0 ou PAT | 5-10 min | ⭐⭐⭐⭐ Muito Fácil |
| **Bitbucket 7.x** | PAT | 3 min | ⭐⭐⭐⭐⭐ Trivial |

---

## Próximos Passos

Após obter Client ID e Client Secret:

1. ✅ Execute `bitbucket-dc-mcp setup`
2. ✅ Cole as credenciais quando solicitado
3. ✅ Autorize no navegador
4. ✅ Teste com `bitbucket-dc-mcp test-connection`
5. ✅ Configure Claude Desktop (veja [README.md](../README.md#configuração))

**Precisa de ajuda?**
- 📖 Guia completo: [authentication.md](./authentication.md)
- 🐛 Problemas: [troubleshooting.md](./troubleshooting.md)
- 💬 Suporte: [GitHub Issues](https://github.com/your-repo/issues)

---

**Dúvidas frequentes:**
- **"PAT ou OAuth 2.0?"**
  - PAT: Mais simples, ideal para desenvolvimento e CI/CD
  - OAuth 2.0: Melhor para produção com múltiplos usuários

- **"Posso usar o mesmo Client ID/Secret em múltiplos servidores?"**
  - Sim, mas crie aplicações separadas para melhor controle e auditoria.

