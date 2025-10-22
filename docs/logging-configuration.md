# Configuração de Logging

## Visão Geral

O `bitbucket-dc-mcp` utiliza o Pino para logging estruturado com suporte a múltiplas instâncias e rotação automática de arquivos.

## Formato de Arquivos de Log

Quando configurado para logging em arquivo, os arquivos seguem o formato:

```
YYYY-MM-DD-bitbucket-dc-mcp-PID.log
```

**Exemplo:** `2025-01-22-bitbucket-dc-mcp-12345.log`

Onde:
- `YYYY-MM-DD`: Data de criação do processo
- `bitbucket-dc-mcp`: Nome da aplicação
- `PID`: Process ID (identificador único do processo)

## Variáveis de Ambiente

### Logs Gerais

#### `LOG_OUTPUT`

Define onde os logs serão escritos:

- `stdout` (padrão): Logs vão para stderr (compatível com MCP stdio)
- `file`: Logs vão para arquivo E stderr (monitoramento em tempo real mantido)
- `both`: Logs vão para arquivo E stderr (mesmo comportamento que `file`)

**Importante:** Mesmo quando configurado como `file`, os logs continuam indo para stderr para permitir monitoramento em tempo real através dos clientes MCP.

### `LOG_FILE_PATH`

Caminho base para os arquivos de log.

- **Padrão:** `./logs/bitbucket-dc-mcp.log`
- O PID e data serão automaticamente adicionados ao nome do arquivo

**Exemplo:**
```bash
export LOG_FILE_PATH=/var/log/bitbucket-mcp/app.log
# Resultado: /var/log/bitbucket-mcp/2025-01-22-bitbucket-dc-mcp-12345.log
```

### `LOG_LEVEL`

Nível de logging:

- `trace`: Mais detalhado
- `debug`: Informações de debug
- `info`: Informações gerais (padrão)
- `warn`: Avisos
- `error`: Erros
- `fatal`: Erros fatais

### `LOG_PRETTY`

Ativa formatação legível (apenas para desenvolvimento):

- `true`: Logs formatados com cores
- `false` (padrão): Logs em JSON estruturado

### `LOG_MAX_SIZE`

Tamanho máximo de cada arquivo de log em MB antes de rotacionar.

- **Padrão:** `50` (50 MB)
- **Intervalo:** 1-1000 MB

### `LOG_MAX_FILES`

Número máximo de arquivos de log mantidos.

- **Padrão:** `30` (aproximadamente 1 mês de histórico com rotação diária)
- **Intervalo:** 1-100 arquivos

### Logs de Erro (Separados)

#### `LOG_ERROR_FILE_PATH`

Caminho base para os arquivos de log de erro (error e fatal).

- **Padrão:** `./logs/bitbucket-dc-mcp-errors.log`
- Logs de nível `error` e `fatal` vão para arquivo separado
- O PID e data serão automaticamente adicionados ao nome do arquivo

**Exemplo:**
```bash
export LOG_ERROR_FILE_PATH=/var/log/bitbucket-mcp/errors.log
# Resultado: /var/log/bitbucket-mcp/2025-01-22-bitbucket-dc-mcp-errors-12345.log
```

#### `LOG_ERROR_MAX_SIZE`

Tamanho máximo de cada arquivo de log de erro em MB antes de rotacionar.

- **Padrão:** `100` (100 MB - maior que logs gerais para retenção de erros)
- **Intervalo:** 1-1000 MB

#### `LOG_ERROR_MAX_FILES`

Número máximo de arquivos de log de erro mantidos.

- **Padrão:** `90` (aproximadamente 3 meses de histórico - mais longo que logs gerais)
- **Intervalo:** 1-100 arquivos

**Justificativa:** Logs de erro têm políticas mais generosas para:
- ✅ Conformidade regulatória
- ✅ Análise de tendências de longo prazo
- ✅ Investigações forenses
- ✅ Alertas e monitoramento

## Políticas de Rotação

### Logs Gerais

Os logs gerais são automaticamente rotacionados quando:

1. **Rotação Diária**: Um novo arquivo é criado a cada dia (00:00 UTC)
2. **Limite de Tamanho**: Quando o arquivo atinge 50 MB (`LOG_MAX_SIZE`)
3. **Retenção**: Mantém 30 arquivos (~1 mês)

### Logs de Erro

Os logs de erro (separados) têm políticas mais generosas:

1. **Rotação Diária**: Um novo arquivo é criado a cada dia (00:00 UTC)
2. **Limite de Tamanho**: Quando o arquivo atinge 100 MB (`LOG_ERROR_MAX_SIZE`)
3. **Retenção**: Mantém 90 arquivos (~3 meses)

A rotação usa a biblioteca `pino-roll` que garante:
- ✅ Segurança em escrita concorrente
- ✅ Compressão automática de arquivos antigos (opcional)
- ✅ Limpeza automática respeitando `LOG_MAX_FILES` e `LOG_ERROR_MAX_FILES`

## Suporte a Múltiplas Instâncias

Cada instância do servidor MCP cria seu próprio arquivo de log identificado pelo PID. Isso permite:

✅ **Múltiplos clientes MCP**: VS Code, Cursor AI, Claude Desktop, etc podem executar o servidor simultaneamente
✅ **Sem conflitos de escrita**: Cada processo tem seu arquivo exclusivo
✅ **Fácil debugging**: Identificar logs de cada instância específica

### Exemplo com Múltiplas Instâncias

```bash
# Cursor AI inicia servidor (PID 12345)
# → 2025-01-22-bitbucket-dc-mcp-12345.log

# VS Code inicia servidor (PID 54321)
# → 2025-01-22-bitbucket-dc-mcp-54321.log

# Ambos escrevem sem conflitos
```

## Exemplos de Uso

### Logging Padrão (stderr apenas)

```bash
# Sem variáveis de ambiente
bitbucket-dc-mcp start
```

### Logging em Arquivo

```bash
export LOG_OUTPUT=file
export LOG_FILE_PATH=/var/log/bitbucket-mcp/app.log
export LOG_LEVEL=info
export LOG_MAX_SIZE=100  # 100 MB
export LOG_MAX_FILES=60  # 2 meses de histórico

bitbucket-dc-mcp start
```

### Desenvolvimento com Logs Legíveis

```bash
export LOG_LEVEL=debug
export LOG_PRETTY=true

bitbucket-dc-mcp start
```

### Rotação Agressiva (pouco espaço em disco)

```bash
export LOG_OUTPUT=file
export LOG_FILE_PATH=./logs/app.log
export LOG_MAX_SIZE=10   # 10 MB
export LOG_MAX_FILES=5   # Apenas 5 arquivos

bitbucket-dc-mcp start
```

## Estrutura de Diretórios

Com a configuração padrão (`LOG_FILE_PATH=./logs/bitbucket-dc-mcp.log`):

```
logs/
├── 2025-01-20-bitbucket-dc-mcp-11111.log      # Arquivo antigo
├── 2025-01-21-bitbucket-dc-mcp-22222.log      # Arquivo de ontem
├── 2025-01-22-bitbucket-dc-mcp-33333.log      # Instância atual (PID 33333)
└── 2025-01-22-bitbucket-dc-mcp-44444.log      # Outra instância (PID 44444)
```

## Redação de Campos Sensíveis

Os seguintes campos são automaticamente censurados nos logs:

- `password`
- `token`, `access_token`, `refresh_token`
- `authorization`
- `credentials`
- `apiKey`, `api_key`
- `secret`
- `client_secret`
- `privateKey`, `private_key`
- `sessionToken`, `session_token`

### Sanitização Automática

O sistema implementa sanitização automática em múltiplas camadas:

#### 1. **MCP Tools (search_ids, get_id, call_id)**
- Todos os inputs são sanitizados antes do logging
- Parâmetros de operação são redacted
- Queries de busca são sanitizadas

#### 2. **CLI Commands (search, get, call)**
- Logging estruturado com sanitização
- Parâmetros de comando são redacted
- Operação IDs são sanitizados

#### 3. **HTTP Client (Bitbucket API)**
- Headers de autenticação são redacted (`Authorization: Bearer ***`)
- URLs são sanitizadas
- Body de requisições não é logado
- Response body não é logado

**Exemplo:**
```json
{
  "level": "info",
  "msg": "User authenticated",
  "password": "***",  // Censurado
  "token": "***",     // Censurado
  "query": "***",     // Censurado
  "operation_id": "***"  // Censurado
}
```

## Troubleshooting

### Logs não estão sendo gravados

1. Verifique permissões do diretório:
   ```bash
   ls -la /path/to/logs
   ```

2. Verifique se o diretório existe:
   ```bash
   mkdir -p /path/to/logs
   ```

3. Verifique variáveis de ambiente:
   ```bash
   echo $LOG_OUTPUT
   echo $LOG_FILE_PATH
   ```

### Muitos arquivos de log

Ajuste `LOG_MAX_FILES` para um valor menor:

```bash
export LOG_MAX_FILES=10
```

### Logs muito grandes

Ajuste `LOG_MAX_SIZE` para um valor menor:

```bash
export LOG_MAX_SIZE=25  # 25 MB
```

## Monitoramento em Tempo Real

Mesmo com `LOG_OUTPUT=file`, você pode monitorar logs em tempo real:

```bash
# Através de stderr (se o servidor estiver em primeiro plano)
bitbucket-dc-mcp start 2>&1 | grep ERROR

# Através do arquivo
tail -f /path/to/logs/2025-01-22-bitbucket-dc-mcp-12345.log
```

## Performance

O sistema de logging usa:
- **Workers separados** para escrita em arquivo (não bloqueia a aplicação)
- **Buffering inteligente** para minimizar operações de I/O
- **Rotação assíncrona** que não impacta performance do servidor

Overhead estimado: < 1% de CPU, < 50MB de memória adicional

