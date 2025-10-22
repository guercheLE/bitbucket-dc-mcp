# OAuth 1.0a Setup Guide for Bitbucket Data Center

> **Guia completo para obter Consumer Key e Consumer Secret no Bitbucket Data Center**  
> **Versões:** 7.x, 8.x, 9.x  
> **Tempo estimado:** 15-20 minutos  
> **Última atualização:** 22 de Outubro de 2025

## Índice

- [Visão Geral](#visão-geral)
- [Quando Usar OAuth 1.0a](#quando-usar-oauth-10a)
- [Requisitos](#requisitos)
- [Guia Passo a Passo](#guia-passo-a-passo)
  - [Passo 1: Gerar Chaves RSA](#passo-1-gerar-chaves-rsa)
  - [Passo 2: Criar Application Link no Bitbucket](#passo-2-criar-application-link-no-bitbucket)
  - [Passo 3: Configurar Incoming Authentication](#passo-3-configurar-incoming-authentication)
  - [Passo 4: Obter Consumer Key e Consumer Secret](#passo-4-obter-consumer-key-e-consumer-secret)
  - [Passo 5: Configurar MCP Server](#passo-5-configurar-mcp-server)
- [Diferença entre Consumer Key/Secret e Tokens de Acesso](#diferença-entre-consumer-keysecret-e-tokens-de-acesso)
- [Troubleshooting](#troubleshooting)
- [Alternativas Recomendadas](#alternativas-recomendadas)

---

## Visão Geral

OAuth 1.0a é um método de autenticação legado suportado por todas as versões do Bitbucket Data Center. Embora seja mais complexo que OAuth 2.0 ou PAT, é a única opção OAuth disponível para algumas versões antigas.

**⚠️ AVISO DE DESCONTINUAÇÃO**

OAuth 1.0a foi descontinuado pela Atlassian. Se sua versão do Bitbucket suporta, prefira:
- **OAuth 2.0** (Bitbucket 7.0+) - Mais moderno e simples
- **Personal Access Token (PAT)** (Bitbucket 7.0+) - Mais fácil de configurar

**Por que ainda usar OAuth 1.0a?**
- ✅ Funciona em todas as versões do Bitbucket Data Center
- ✅ Mais seguro que Basic Authentication
- ✅ Tokens podem ser revogados sem mudar senha

---

## Quando Usar OAuth 1.0a

### ✅ Use OAuth 1.0a se:

- Você precisa de autenticação OAuth em versões específicas
- Basic Authentication não é permitido por política de segurança

### ❌ NÃO use OAuth 1.0a se:

| Versão do Bitbucket | Use Ao Invés | Por quê |
|---------------------|--------------|---------|
| **Bitbucket 7.0+** | OAuth 2.0 ou PAT | Mais simples, mais seguro, melhor suporte |
| **Desenvolvimento local** | PAT ou Basic Auth | OAuth 1.0a é complexo demais para dev |

---

## Requisitos

Antes de começar, você precisará:

### 1. Acesso Administrativo
- ✅ Permissões de **Bitbucket Administrator** ou **System Administrator**
- ✅ Acesso ao menu de administração do Bitbucket
- ✅ Permissão para criar Application Links

### 2. Ferramentas de Linha de Comando
- ✅ **OpenSSL** - Para gerar chaves RSA
  ```bash
  # Verificar se OpenSSL está instalado
  openssl version
  # Deve mostrar: OpenSSL 1.1.1 ou superior
  ```
- ✅ **Terminal/Command Line** - Para executar comandos

### 3. Versão do Bitbucket
- ✅ Bitbucket Data Center 7.0 ou superior
- ✅ Bitbucket Server 7.0 ou superior (descontinuado)

### 4. Conectividade
- ✅ Acesso à URL do Bitbucket
- ✅ Porta 8080 disponível (ou outra porta para callback)
- ✅ HTTPS recomendado (HTTP funciona para localhost)

---

## Guia Passo a Passo

### Passo 1: Gerar Chaves RSA

OAuth 1.0a com assinatura RSA-SHA1 requer um par de chaves pública/privada.

#### 1.1 Gerar Chave Privada

```bash
# Criar diretório para armazenar chaves
mkdir -p ~/.bitbucket-dc-mcp
cd ~/.bitbucket-dc-mcp

# Gerar chave privada RSA de 2048 bits
openssl genrsa -out bitbucket_privatekey.pem 2048

# Verificar se a chave foi criada corretamente
openssl rsa -in bitbucket_privatekey.pem -check
```

**Saída esperada:**
```
RSA key ok
writing RSA key
```

#### 1.2 Gerar Chave Pública

```bash
# Extrair chave pública da chave privada
openssl rsa -in bitbucket_privatekey.pem -pubout -out bitbucket_publickey.pem

# Visualizar chave pública (você precisará dela no Passo 3)
cat bitbucket_publickey.pem
```

**A chave pública terá este formato:**
```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxy5...
... várias linhas de caracteres ...
... Base64 encoded ...
-----END PUBLIC KEY-----
```

#### 1.3 Proteger as Chaves

```bash
# Definir permissões restritas (somente leitura para o dono)
chmod 400 bitbucket_privatekey.pem
chmod 444 bitbucket_publickey.pem

# Verificar permissões
ls -la ~/.bitbucket-dc-mcp/bitbucket_*.pem
```

**⚠️ SEGURANÇA DAS CHAVES:**
- ❌ **NUNCA** faça commit das chaves privadas no Git
- ❌ **NUNCA** compartilhe chaves privadas (nem com sua equipe)
- ❌ **NUNCA** envie chaves privadas por email ou Slack
- ✅ Mantenha backup seguro das chaves (criptografado)
- ✅ Use chaves diferentes para cada ambiente (dev/prod)

---

### Passo 2: Criar Application Link no Bitbucket

Agora vamos configurar o Bitbucket para aceitar conexões OAuth 1.0a.

#### 2.1 Acessar Administração do Bitbucket

1. **Fazer login como administrador**
   - Acesse seu Bitbucket Data Center
   - Use uma conta com permissões administrativas

2. **Abrir menu de administração**
   - Clique no ícone de **engrenagem** (⚙️) no canto superior direito
   - Selecione **"Administration"**

#### 2.2 Navegar até Application Links

1. **Encontrar Application Links**
   - No menu lateral esquerdo, procure **"Add-ons"**
   - Clique em **"Application Links"**

2. **Visualizar links existentes**
   - Você verá uma lista de Application Links já configurados (pode estar vazia)

#### 2.3 Criar Novo Application Link

1. **Iniciar criação**
   - Clique no botão **"Create link"** (ou **"Add application link"** em versões antigas)
   - Uma janela modal aparecerá

2. **Informar URL da aplicação**
   - No campo **"Application URL"**, digite: `http://localhost:8080`
   - Para servidor remoto, use sua URL: `https://seu-servidor.com`
   - Clique em **"Create new link"** ou **"Continue"**

3. **Ignorar avisos (se aparecerem)**
   - Bitbucket pode avisar que não consegue alcançar a URL
   - Clique em **"Continue"** mesmo assim
   - A URL é apenas informativa para OAuth 1.0a

---

### Passo 3: Configurar Incoming Authentication

Agora você configurará como o Bitbucket autentica requisições OAuth 1.0a.

#### 3.1 Configurar Detalhes Básicos da Aplicação

Na primeira tela de configuração:

| Campo | Valor | Descrição |
|-------|-------|-----------|
| **Application Name** | `Bitbucket MCP Server` | Nome que aparecerá na lista |
| **Application Type** | `Generic Application` | Tipo de aplicação |
| **Create incoming link** | ✅ Marcar | **IMPORTANTE:** Deve estar marcado |

Clique em **"Continue"**

#### 3.2 Configurar Incoming Authentication

**Esta é a parte mais importante!** Aqui você configura o Consumer Key e a chave pública.

##### 3.2.1 Consumer Key

- **Consumer Key**: Digite um identificador único, por exemplo: `bitbucket-mcp-server`
  - ⚠️ **Anote este valor!** Você precisará dele no Passo 5
  - Use apenas letras minúsculas, números e hífens
  - Exemplos: `bitbucket-mcp-server`, `mcp-integration`, `claude-bitbucket-connector`

##### 3.2.2 Consumer Name

- **Consumer Name**: `Bitbucket MCP Server` (nome amigável)

##### 3.2.3 Public Key

- **Public Key**: Cole o conteúdo completo de `bitbucket_publickey.pem`

   ```bash
   # Copiar chave pública para clipboard
   # macOS:
   cat ~/.bitbucket-dc-mcp/bitbucket_publickey.pem | pbcopy
   
   # Linux (requer xclip):
   cat ~/.bitbucket-dc-mcp/bitbucket_publickey.pem | xclip -selection clipboard
   
   # Windows (PowerShell):
   Get-Content ~/.bitbucket-dc-mcp/bitbucket_publickey.pem | clip
   
   # Ou simplesmente visualize e copie manualmente:
   cat ~/.bitbucket-dc-mcp/bitbucket_publickey.pem
   ```

- Cole **TODO** o conteúdo, incluindo as linhas `-----BEGIN PUBLIC KEY-----` e `-----END PUBLIC KEY-----`

##### 3.2.4 Consumer Callback URL (Opcional)

- **Consumer Callback URL**: `http://localhost:8080/callback`
- Para servidor remoto: `https://seu-servidor.com/oauth/callback`

#### 3.3 Salvar Configuração

- Revise todas as informações
- Clique em **"Continue"** ou **"Save"**
- Você será redirecionado para a lista de Application Links

---

### Passo 4: Obter Consumer Key e Consumer Secret

#### 4.1 O que são Consumer Key e Consumer Secret?

**ATENÇÃO:** Há uma confusão comum aqui!

| Item | O que é | Onde obter |
|------|---------|------------|
| **Consumer Key** | Identificador da aplicação que **você escolheu** | Você definiu no Passo 3.2.1 |
| **Consumer Secret** | (Opcional) Senha compartilhada para HMAC-SHA1 | Não é necessário para RSA-SHA1 |
| **Access Token** | Token de acesso do usuário | Obtido automaticamente no primeiro uso |
| **Token Secret** | Segredo do token de acesso | Obtido automaticamente no primeiro uso |

#### 4.2 Para OAuth 1.0a com RSA-SHA1 (Recomendado)

Você **NÃO precisa** de Consumer Secret!

**O que você precisa:**
1. ✅ **Consumer Key** - O identificador que você escolheu (ex: `bitbucket-mcp-server`)
2. ✅ **Private Key** - O arquivo `bitbucket_privatekey.pem` que você gerou no Passo 1
3. ✅ **Public Key** - Já foi configurada no Bitbucket no Passo 3

**Consumer Secret fica vazio ou não é usado!**

---

### Passo 5: Configurar MCP Server

Agora você vai usar as informações obtidas para configurar o MCP Server.

#### 5.1 Usando o Setup Wizard (Recomendado)

```bash
# Execute o setup wizard
bitbucket-dc-mcp setup

# Quando solicitado:
# 1. Bitbucket URL: https://seu-bitbucket.com
# 2. Auth method: OAuth 1.0a
```

**Durante a configuração, você será perguntado:**

##### Consumer Key
```
? Enter OAuth 1.0a Consumer Key: bitbucket-mcp-server
```
- Digite o Consumer Key que você escolheu no Passo 3.2.1
- **Exemplo:** `bitbucket-mcp-server`

##### Consumer Secret
```
? Enter OAuth 1.0a Consumer Secret: (deixe vazio para RSA-SHA1)
```
- **Se você usou RSA-SHA1:** Deixe vazio (apenas pressione Enter)
- **Se você usou HMAC-SHA1:** Digite o Consumer Secret que você definiu

##### Private Key Path
```
? Enter path to private key file: ~/.bitbucket-dc-mcp/bitbucket_privatekey.pem
```
- Digite o caminho completo para o arquivo `bitbucket_privatekey.pem`
- **Caminho padrão:** `~/.bitbucket-dc-mcp/bitbucket_privatekey.pem`

---

## Diferença entre Consumer Key/Secret e Tokens de Acesso

Esta é a fonte de confusão mais comum! Veja a diferença:

### Consumer Credentials (Configuração da Aplicação)

| Item | O que é | Onde configurar | Usado para |
|------|---------|-----------------|------------|
| **Consumer Key** | ID da aplicação | Você escolhe no Bitbucket | Identificar sua aplicação |
| **Consumer Secret** | Senha da aplicação (HMAC-SHA1) | Opcional, você define | Assinar requisições HMAC |
| **Private Key** | Chave RSA privada (RSA-SHA1) | Você gera com OpenSSL | Assinar requisições RSA |
| **Public Key** | Chave RSA pública (RSA-SHA1) | Você cola no Bitbucket | Verificar assinaturas |

**Configurados UMA VEZ** durante setup inicial.

### User Credentials (Tokens de Acesso do Usuário)

| Item | O que é | Onde configurar | Usado para |
|------|---------|-----------------|------------|
| **Request Token** | Token temporário | Obtido automaticamente | Iniciar flow OAuth |
| **Access Token** | Token de acesso do usuário | Obtido após autorização | Fazer chamadas API |
| **Token Secret** | Segredo do access token | Obtido com access token | Assinar requisições API |

**Obtidos AUTOMATICAMENTE** quando o usuário autoriza a aplicação.

---

## Troubleshooting

### Erro: "Consumer key not found"

**Sintoma:**
```
✗ OAuth 1.0a authentication failed: Consumer key not found
```

**Causas:**
- Consumer Key digitado incorretamente no setup
- Consumer Key no Bitbucket não corresponde ao configurado no MCP

**Solução:**
1. Verifique o Consumer Key no Bitbucket:
   - Administração → Application Links → Editar "Bitbucket MCP Server"
   - Anote o Consumer Key exato (com letras maiúsculas/minúsculas)
2. Execute `bitbucket-dc-mcp setup --force`
3. Digite o Consumer Key exatamente como está no Bitbucket

---

### Erro: "Invalid signature"

**Sintoma:**
```
✗ OAuth signature validation failed
```

**Causas:**
- Chave pública no Bitbucket não corresponde à chave privada usada
- Chave privada foi regenerada mas chave pública não foi atualizada
- Formato incorreto da chave pública no Bitbucket

**Solução:**
1. Regenere o par de chaves:
   ```bash
   cd ~/.bitbucket-dc-mcp
   openssl genrsa -out bitbucket_privatekey.pem 2048
   openssl rsa -in bitbucket_privatekey.pem -pubout -out bitbucket_publickey.pem
   ```
2. Atualize a chave pública no Bitbucket:
   - Administração → Application Links → Editar "Bitbucket MCP Server"
   - Cole a nova chave pública (todo o conteúdo de `bitbucket_publickey.pem`)
   - Salve
3. Execute `bitbucket-dc-mcp setup --force`

---

### Erro: "Private key file not found"

**Sintoma:**
```
✗ Cannot read private key file: ENOENT: no such file or directory
```

**Causas:**
- Caminho do arquivo de chave privada está incorreto
- Arquivo foi movido ou deletado
- Permissões do arquivo impedem leitura

**Solução:**
1. Verifique se o arquivo existe:
   ```bash
   ls -la ~/.bitbucket-dc-mcp/bitbucket_privatekey.pem
   ```
2. Se não existir, gere novamente (veja Passo 1)
3. Verifique permissões:
   ```bash
   chmod 400 ~/.bitbucket-dc-mcp/bitbucket_privatekey.pem
   ```
4. Execute setup com caminho correto:
   ```bash
   bitbucket-dc-mcp setup --force
   ```

---

## Alternativas Recomendadas

### 🌟 Se você tem Bitbucket 7.0 ou superior

**Use Personal Access Token (PAT)** - Muito mais simples!

```bash
bitbucket-dc-mcp setup

# Selecione: Personal Access Token (PAT)
# Tempo de setup: 3 minutos
```

**Como gerar PAT:**
1. Login no Bitbucket
2. Clique no seu avatar → **Personal Access Tokens**
3. **Create token** → Nome: `Bitbucket MCP Server`
4. Copie o token gerado
5. Cole no setup wizard

**Guia completo:** [authentication.md - PAT Setup](./authentication.md#2-personal-access-token-pat-recommended-for-development)

---

### 🔐 Se você tem Bitbucket 7.0 ou superior (produção)

**Use OAuth 2.0** - Mais moderno e seguro!

```bash
bitbucket-dc-mcp setup

# Selecione: OAuth 2.0
# Tempo de setup: 10 minutos
```

**Vantagens sobre OAuth 1.0a:**
- ✅ Tokens com refresh automático
- ✅ Setup mais simples (sem chaves RSA)
- ✅ Melhor segurança (PKCE)
- ✅ Suporte ativo da Atlassian

**Guia completo:** [oauth2-datacenter-setup.md](./oauth2-datacenter-setup.md)

---

## Resumo Rápido

### O que você precisa para OAuth 1.0a:

1. ✅ **Consumer Key** - Identificador que você escolhe (ex: `bitbucket-mcp-server`)
2. ✅ **Private Key** - Arquivo gerado com OpenSSL (`bitbucket_privatekey.pem`)
3. ✅ **Public Key** - Cola no Bitbucket durante configuração
4. ❌ **Consumer Secret** - NÃO é necessário para RSA-SHA1

### Comandos importantes:

```bash
# Gerar chaves
openssl genrsa -out ~/.bitbucket-dc-mcp/bitbucket_privatekey.pem 2048
openssl rsa -in ~/.bitbucket-dc-mcp/bitbucket_privatekey.pem -pubout -out ~/.bitbucket-dc-mcp/bitbucket_publickey.pem

# Ver chave pública (para colar no Bitbucket)
cat ~/.bitbucket-dc-mcp/bitbucket_publickey.pem

# Configurar MCP Server
bitbucket-dc-mcp setup
```

---

## Próximos Passos

Após configurar OAuth 1.0a:

1. ✅ Execute `bitbucket-dc-mcp test-connection` para testar
2. ✅ Configure Claude Desktop (veja [README.md](../README.md))
3. ✅ Teste com comandos: `bitbucket-dc-mcp search "your query"`
4. ✅ Leia sobre [melhores práticas de segurança](./authentication.md#best-practices)

**Precisa de ajuda?**
- 📖 Guia de autenticação completo: [authentication.md](./authentication.md)
- 🐛 Problemas: [troubleshooting.md](./troubleshooting.md)
- 💬 Suporte: [GitHub Issues](https://github.com/your-repo/issues)

---

**Última atualização:** 22 de Outubro de 2025  
**Versão do documento:** 1.0  
**Autor:** Bitbucket Data Center MCP Server Contributors

