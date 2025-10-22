#!/usr/bin/env node

/**
 * Script de teste para diagnosticar o problema com create_comment_2
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testCreateComment() {
  console.log('🔍 Iniciando teste de create_comment_2...\n');

  // Spawn the MCP server process
  const serverPath = join(__dirname, 'dist', 'index.js');
  const serverProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      LOG_LEVEL: 'debug', // Enable debug logging
    },
  });

  // Capture stderr for logs
  serverProcess.stderr.on('data', (data) => {
    console.error(`[SERVER LOG] ${data.toString()}`);
  });

  // Create MCP client
  const transport = new StdioClientTransport({
    command: serverProcess,
  });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);
    console.log('✅ Conectado ao MCP server\n');

    // Test 1: Simple comment (should work)
    console.log('📝 Teste 1: Comentário simples sem caracteres especiais\n');
    const test1Params = {
      operation_id: 'create_comment_2',
      parameters: {
        projectKey: 'DAYC3',
        repositorySlug: 'couchbase',
        pullRequestId: '173',
        text: 'Teste de comentario simples',
      },
    };

    console.log('Parâmetros enviados:', JSON.stringify(test1Params, null, 2));
    console.log('\n🚀 Executando call_id...\n');

    const result1 = await client.callTool({
      name: 'call_id',
      arguments: test1Params,
    });

    console.log('\n✅ Resultado Teste 1:');
    console.log(JSON.stringify(result1, null, 2));

    // Test 2: Comment with emojis (original problem)
    console.log('\n\n📝 Teste 2: Comentário com emojis e formatação Markdown\n');
    const test2Params = {
      operation_id: 'create_comment_2',
      parameters: {
        projectKey: 'DAYC3',
        repositorySlug: 'couchbase',
        pullRequestId: '173',
        text: '🟢 **SUGESTÃO (NORMAL)**\n\n**Arquivo:** Teste\n\n**Observação:** Este é um teste com emoji.',
      },
    };

    console.log('Parâmetros enviados:', JSON.stringify(test2Params, null, 2));
    console.log('\n🚀 Executando call_id...\n');

    const result2 = await client.callTool({
      name: 'call_id',
      arguments: test2Params,
    });

    console.log('\n✅ Resultado Teste 2:');
    console.log(JSON.stringify(result2, null, 2));

  } catch (error) {
    console.error('\n❌ Erro durante teste:');
    console.error(error);
    if (error.details) {
      console.error('\nDetalhes do erro:');
      console.error(JSON.stringify(error.details, null, 2));
    }
  } finally {
    await client.close();
    serverProcess.kill();
    console.log('\n🛑 Teste finalizado');
  }
}

// Run the test
testCreateComment().catch(console.error);

