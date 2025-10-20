#!/usr/bin/env node

/**
 * Copyright (c) 2025 Bitbucket Data Center MCP Server Contributors
 *
 * This file is part of bitbucket-dc-mcp.
 *
 * bitbucket-dc-mcp is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * bitbucket-dc-mcp is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with bitbucket-dc-mcp. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Validate embeddings database exists and is valid
 * Fails the build if embeddings.db is missing or invalid
 */

import { existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EMBEDDINGS_PATH = join(__dirname, '..', 'data', 'embeddings.db');
const MIN_SIZE = 1000000; // 1MB minimum

console.log('🔍 Validating embeddings database...');
console.log(`   Path: ${EMBEDDINGS_PATH}`);

// Check if file exists
if (!existsSync(EMBEDDINGS_PATH)) {
  console.error(`
❌ ERROR: embeddings.db not found!

The embeddings database is required but does not exist at:
  ${EMBEDDINGS_PATH}

This file must be generated before building or packaging.

To generate the embeddings database, run:
  npm run download-openapi
  npm run generate-schemas
  npm run generate-embeddings
  npm run populate-db

Note: This process can take 20-30 minutes.
`);
  process.exit(1);
}

// Check file size
const stats = statSync(EMBEDDINGS_PATH);
const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);

if (stats.size < MIN_SIZE) {
  console.error(`
❌ ERROR: embeddings.db is too small!

The embeddings database exists but appears to be invalid:
  Size: ${sizeInMB} MB (expected > ${(MIN_SIZE / 1024 / 1024).toFixed(2)} MB)

The database may be corrupted or incomplete.

Please regenerate the embeddings database:
  rm data/embeddings.db
  npm run download-openapi
  npm run generate-schemas
  npm run generate-embeddings
  npm run populate-db
`);
  process.exit(1);
}

// Validation passed
console.log(`✅ Embeddings database validated successfully`);
console.log(`   Size: ${sizeInMB} MB`);
console.log('');

