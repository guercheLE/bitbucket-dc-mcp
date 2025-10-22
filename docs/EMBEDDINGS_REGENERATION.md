# Regeneração do Banco de Dados de Embeddings

Este documento descreve como regenerar o banco de dados `embeddings.db` quando necessário, especialmente para limpar dados desatualizados ou incompatíveis.

## Quando Regenerar

Regenere o banco de dados de embeddings quando:

1. **Dados desatualizados**: O banco contém operações de versões antigas com IDs incompatíveis
2. **Contaminação de dados**: O banco contém operações de outros servidores MCP
3. **Corrupção**: O banco está corrompido ou inacessível
4. **Atualização da API**: A especificação OpenAPI foi atualizada
5. **Mudança de servidor**: Migração entre diferentes tipos de servidor (Cloud/Data Center)

## Comandos de Regeneração

### Para Bitbucket Data Center MCP

```bash
# Navegar para o diretório do projeto
cd bitbucket-dc-mcp

# 1. Remover banco existente (limpeza completa)
rm data/embeddings.db
rm data/embeddings.db-wal 2>/dev/null || true
rm data/embeddings.db-shm 2>/dev/null || true

# 2. Regenerar dados do zero
npm run download-openapi
npm run generate-schemas  
npm run generate-embeddings
npm run populate-db

# 3. Compilar o projeto
npm run build
```

### Para Jira Data Center MCP

```bash
# Navegar para o diretório do projeto
cd jira-dc-mcp

# 1. Remover banco existente (limpeza completa)
rm data/embeddings.db
rm data/embeddings.db-wal 2>/dev/null || true
rm data/embeddings.db-shm 2>/dev/null || true

# 2. Regenerar dados do zero
npm run download-openapi
npm run generate-schemas
npm run generate-embeddings  
npm run populate-db

# 3. Compilar o projeto
npm run build
```

## Comando Único (Recomendado)

Para regeneração completa em um único comando:

```bash
# Bitbucket DC MCP
cd bitbucket-dc-mcp && rm -f data/embeddings.db* && npm run build:all

# Jira DC MCP  
cd jira-dc-mcp && rm -f data/embeddings.db* && npm run build:all
```

## Verificação Pós-Regeneração

Após a regeneração, verifique se o banco foi criado corretamente:

```bash
# Verificar se o arquivo existe e tem tamanho adequado
ls -lh data/embeddings.db

# Validar integridade do banco
npm run validate-embeddings
```

## Limpeza Automática

O script `populate-db.ts` foi melhorado para:

1. **Remover arquivos WAL e SHM**: Limpa arquivos auxiliares do SQLite
2. **Adicionar metadados de servidor**: Identifica o tipo de servidor no banco
3. **Validação de integridade**: Verifica se não há dados órfãos

## Troubleshooting

### Erro: "Database locked"
```bash
# Parar todos os processos que usam o banco
pkill -f "bitbucket-dc-mcp" || true
pkill -f "jira-dc-mcp" || true

# Aguardar alguns segundos e tentar novamente
sleep 3
npm run populate-db
```

### Erro: "sqlite-vec extension not found"
```bash
# Reinstalar dependências
npm install

# Verificar se a extensão está disponível
npm run test:sqlite-vec
```

### Erro: "OpenAI API key required"
```bash
# Configurar chave da API (apenas para geração de embeddings)
export OPENAI_API_KEY="sua-chave-aqui"

# Ou usar modelo local (mais lento, mas sem custos)
export EMBEDDING_MODEL="local"
npm run generate-embeddings
```

## Tempo Estimado

### Hardware Específico

**MacBook Air M1 (8GB RAM):**
- **Download OpenAPI**: 30-60 segundos
- **Geração de Schemas**: 10-30 segundos  
- **Geração de Embeddings**: 2-3 minutos (modelo local)
- **População do Banco**: 30-60 segundos
- **Compilação**: 30-60 segundos
- **Total**: ~3 minutos

**GitHub Actions (Ubuntu runners):**
- **Download OpenAPI**: 1-2 minutos
- **Geração de Schemas**: 30-60 segundos  
- **Geração de Embeddings**: 2-3 horas (modelo local, recursos limitados)
- **População do Banco**: 2-5 minutos
- **Compilação**: 1-2 minutos
- **Total**: ~3 horas (não recomendado para CI/CD)

### Recomendações por Ambiente

**Desenvolvimento Local:**
- Use modelo local (`EMBEDDING_MODEL=local`) para evitar custos de API
- Tempo total: 3-5 minutos em hardware moderno

**CI/CD (GitHub Actions):**
- **NÃO recomendo** regeneração automática em CI/CD
- Use banco pré-gerado commitado no repositório
- Regeneração manual apenas quando necessário
- Considere usar runners com mais recursos (GitHub-hosted runners maiores)

### Estratégia para CI/CD

**Problema**: GitHub Actions runners têm recursos limitados e regeneração leva ~3 horas

**Solução Recomendada**:
1. **Commit do banco**: Inclua `data/embeddings.db` no repositório
2. **Regeneração manual**: Apenas quando OpenAPI spec muda
3. **Workflow condicional**: Regenerar apenas em PRs que alteram specs
4. **Cache de dependências**: Use GitHub Actions cache para node_modules

**Exemplo de workflow**:
```yaml
# .github/workflows/regenerate-embeddings.yml
name: Regenerate Embeddings
on:
  workflow_dispatch:  # Manual trigger only
  push:
    paths:
      - 'data/openapi.json'
      - 'scripts/generate-embeddings.ts'

jobs:
  regenerate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run build:all
      - run: git add data/embeddings.db
      - run: git commit -m "Update embeddings database"
      - run: git push
```

**Produção:**
- Regeneração offline em ambiente dedicado
- Use modelo local para evitar dependências externas
- Backup do banco antes de regenerar

## Backup e Recuperação

### Backup Preventivo
```bash
# Fazer backup antes de regenerar
cp data/embeddings.db data/embeddings.db.backup-$(date +%Y%m%d)

# Restaurar se necessário
mv data/embeddings.db.backup-YYYYMMDD data/embeddings.db
```

### Recuperação de Emergência
```bash
# Se a regeneração falhar, restaurar backup
mv data/embeddings.db.backup-* data/embeddings.db

# Ou regenerar do zero
rm -f data/embeddings.db* && npm run build:all
```

## Notas Importantes

1. **Dados não são perdidos**: O banco é regenerado a partir das especificações OpenAPI
2. **Custo de API**: Geração de embeddings pode ter custo se usar OpenAI API
3. **Modelo local**: Use `EMBEDDING_MODEL=local` para evitar custos de API
4. **Versionamento**: O banco inclui metadados de versão para compatibilidade
5. **Limpeza automática**: O script remove automaticamente dados desatualizados

## Suporte

Para problemas específicos:

1. Verifique os logs: `npm run populate-db 2>&1 | tee populate.log`
2. Valide dependências: `npm run validate-deps`
3. Teste componentes: `npm run test:components`
4. Consulte documentação: `docs/internal/architecture/`
