#!/bin/bash

# Exemplos de Configuração de Logging para bitbucket-dc-mcp
# =========================================================

echo "=== Exemplos de Configuração de Logging ==="
echo ""

# Exemplo 1: Logging padrão (apenas stderr)
echo "1. Logging padrão (stderr apenas):"
echo "   bitbucket-dc-mcp start"
echo ""

# Exemplo 2: Logging em arquivo com configurações padrão
echo "2. Logging em arquivo (com stderr mantido):"
echo "   export LOG_OUTPUT=file"
echo "   export LOG_FILE_PATH=./logs/bitbucket-dc-mcp.log"
echo "   bitbucket-dc-mcp start"
echo ""
echo "   Resultado: ./logs/YYYY-MM-DD-bitbucket-dc-mcp-PID.log"
echo ""

# Exemplo 3: Logging com rotação customizada
echo "3. Logging com rotação customizada:"
echo "   export LOG_OUTPUT=file"
echo "   export LOG_FILE_PATH=/var/log/bitbucket-mcp/app.log"
echo "   export LOG_MAX_SIZE=100   # 100 MB por arquivo"
echo "   export LOG_MAX_FILES=60   # Manter 60 arquivos (~2 meses)"
echo "   bitbucket-dc-mcp start"
echo ""

# Exemplo 4: Desenvolvimento com logs legíveis
echo "4. Desenvolvimento com logs legíveis:"
echo "   export LOG_LEVEL=debug"
echo "   export LOG_PRETTY=true"
echo "   bitbucket-dc-mcp start"
echo ""

# Exemplo 5: Teste com múltiplas instâncias
echo "5. Teste com múltiplas instâncias:"
echo "   Terminal 1:"
echo "     export LOG_OUTPUT=file"
echo "     export LOG_FILE_PATH=./logs/app.log"
echo "     bitbucket-dc-mcp start  # Cria 2025-01-22-bitbucket-dc-mcp-12345.log"
echo ""
echo "   Terminal 2:"
echo "     export LOG_OUTPUT=file"
echo "     export LOG_FILE_PATH=./logs/app.log"
echo "     bitbucket-dc-mcp start  # Cria 2025-01-22-bitbucket-dc-mcp-54321.log"
echo ""
echo "   Ambas as instâncias funcionam sem conflitos!"
echo ""

# Exemplo 6: Monitoramento em tempo real
echo "6. Monitoramento em tempo real:"
echo "   # Logs em arquivo, mas stderr continua ativo"
echo "   export LOG_OUTPUT=file"
echo "   export LOG_FILE_PATH=./logs/app.log"
echo "   bitbucket-dc-mcp start 2>&1 | grep -i error"
echo ""
echo "   # Ou monitorar o arquivo diretamente"
echo "   tail -f ./logs/2025-01-22-bitbucket-dc-mcp-12345.log"
echo ""

# Exemplo 7: Produção com alta disponibilidade
echo "7. Produção com alta disponibilidade:"
echo "   export LOG_OUTPUT=file"
echo "   export LOG_FILE_PATH=/var/log/bitbucket-mcp/production.log"
echo "   export LOG_LEVEL=info"
echo "   export LOG_MAX_SIZE=50    # Rotação a cada 50 MB"
echo "   export LOG_MAX_FILES=30   # Manter 30 arquivos"
echo "   bitbucket-dc-mcp start"
echo ""

# Exemplo 8: Debugging intensivo (cuidado com espaço em disco)
echo "8. Debugging intensivo:"
echo "   export LOG_OUTPUT=file"
echo "   export LOG_FILE_PATH=./logs/debug.log"
echo "   export LOG_LEVEL=trace"
echo "   export LOG_MAX_SIZE=10    # Rotação frequente"
echo "   export LOG_MAX_FILES=5    # Poucos arquivos"
echo "   bitbucket-dc-mcp start"
echo ""

echo "=== Verificando Configuração Atual ==="
echo "LOG_OUTPUT=${LOG_OUTPUT:-stdout (padrão)}"
echo "LOG_FILE_PATH=${LOG_FILE_PATH:-./logs/bitbucket-dc-mcp.log (padrão)}"
echo "LOG_LEVEL=${LOG_LEVEL:-info (padrão)}"
echo "LOG_MAX_SIZE=${LOG_MAX_SIZE:-50 MB (padrão)}"
echo "LOG_MAX_FILES=${LOG_MAX_FILES:-30 (padrão)}"
echo ""

echo "=== Estrutura de Logs com Múltiplas Instâncias ==="
echo "logs/"
echo "├── 2025-01-20-bitbucket-dc-mcp-11111.log  (dia anterior)"
echo "├── 2025-01-21-bitbucket-dc-mcp-22222.log  (ontem)"
echo "├── 2025-01-22-bitbucket-dc-mcp-33333.log  (instância 1 hoje)"
echo "├── 2025-01-22-bitbucket-dc-mcp-44444.log  (instância 2 hoje)"
echo "└── 2025-01-22-bitbucket-dc-mcp-55555.log  (instância 3 hoje)"
echo ""

echo "=== Políticas de Rotação Implementadas ==="
echo "✅ Rotação diária automática (00:00 UTC)"
echo "✅ Rotação por tamanho (padrão: 50 MB)"
echo "✅ Retenção limitada (padrão: 30 arquivos)"
echo "✅ Nome único por processo (PID no nome)"
echo "✅ Stderr sempre ativo (monitoramento real-time)"
echo "✅ Suporte a múltiplas instâncias simultâneas"
echo ""

