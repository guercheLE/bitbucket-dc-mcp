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

import fs from 'node:fs';
import path from 'node:path';

const operationsPath = path.resolve('data', 'operations.json');

if (!fs.existsSync(operationsPath)) {
    console.error('operations.json not found at', operationsPath);
    process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(operationsPath, 'utf-8'));
const operations = raw.operations ?? [];

const VECTOR_LENGTH = 512;

function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
}

function hashToken(token) {
    let hash = 0;

    for (let index = 0; index < token.length; index += 1) {
        hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
    }

    return hash % VECTOR_LENGTH;
}

function encodeText(text) {
    const vector = new Float32Array(VECTOR_LENGTH);
    const tokens = tokenize(text);

    for (const token of tokens) {
        const slot = hashToken(token);
        vector[slot] += 1;
    }

    let magnitude = 0;
    for (let index = 0; index < vector.length; index += 1) {
        const value = vector[index];
        magnitude += value * value;
    }

    magnitude = Math.sqrt(magnitude);
    if (magnitude === 0) {
        return vector;
    }

    for (let index = 0; index < vector.length; index += 1) {
        vector[index] /= magnitude;
    }

    return vector;
}

function cosineSimilarity(a, b) {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let index = 0; index < a.length; index += 1) {
        const av = a[index];
        const bv = b[index];
        dot += av * bv;
        normA += av * av;
        normB += bv * bv;
    }

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dot / Math.sqrt(normA * normB);
}

const operationsVectors = operations.map((operation) => {
    const text = `${operation.summary ?? ''} ${operation.description ?? ''} ${operation.operationId ?? ''}`;
    return {
        id: operation.operationId,
        summary: operation.summary ?? '',
        description: operation.description ?? '',
        vector: encodeText(text),
    };
});

function searchTopFive(query) {
    const vector = encodeText(query);
    return operationsVectors
        .map((operation) => ({
            id: operation.id,
            summary: operation.summary,
            score: cosineSimilarity(vector, operation.vector),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}

const queries = [
    // CRUD
    { category: 'CRUD', query: 'create issue' },
    { category: 'CRUD', query: 'update issue' },
    { category: 'CRUD', query: 'delete issue' },
    { category: 'CRUD', query: 'get issue details' },
    { category: 'CRUD', query: 'bulk update issues' },
    { category: 'CRUD', query: 'create project' },
    { category: 'CRUD', query: 'update project settings' },
    { category: 'CRUD', query: 'delete project' },
    { category: 'CRUD', query: 'add comment to issue' },
    { category: 'CRUD', query: 'edit issue comment' },
    // User Management
    { category: 'User Management', query: 'add user to group' },
    { category: 'User Management', query: 'remove user permissions' },
    { category: 'User Management', query: 'search users' },
    { category: 'User Management', query: 'get user details' },
    { category: 'User Management', query: 'assign user to project' },
    { category: 'User Management', query: 'deactivate user account' },
    { category: 'User Management', query: 'invite user to bitbucket' },
    { category: 'User Management', query: 'reactivate user account' },
    // Workflows
    { category: 'Workflows', query: 'transition issue to done' },
    { category: 'Workflows', query: 'get available transitions' },
    { category: 'Workflows', query: 'update workflow status' },
    { category: 'Workflows', query: 'create workflow' },
    { category: 'Workflows', query: 'publish draft workflow' },
    { category: 'Workflows', query: 'get workflow scheme' },
    { category: 'Workflows', query: 'delete workflow' },
    { category: 'Workflows', query: 'copy workflow' },
    // Custom Fields
    { category: 'Custom Fields', query: 'create custom field' },
    { category: 'Custom Fields', query: 'update custom field value' },
    { category: 'Custom Fields', query: 'delete custom field' },
    { category: 'Custom Fields', query: 'get custom field options' },
    { category: 'Custom Fields', query: 'set select list value' },
    { category: 'Custom Fields', query: 'add field to screen' },
    // Boards & Sprints
    { category: 'Boards & Sprints', query: 'create board' },
    { category: 'Boards & Sprints', query: 'get board configuration' },
    { category: 'Boards & Sprints', query: 'create sprint' },
    { category: 'Boards & Sprints', query: 'start sprint' },
    { category: 'Boards & Sprints', query: 'close sprint' },
    { category: 'Boards & Sprints', query: 'move issue to sprint' },
    { category: 'Boards & Sprints', query: 'get sprint issues' },
    { category: 'Boards & Sprints', query: 'update board columns' },
    // Advanced variations
    { category: 'Advanced', query: 'make new issue' },
    { category: 'Advanced', query: 'change assignee on task' },
    { category: 'Advanced', query: 'find bitbucket user' },
    { category: 'Advanced', query: 'move card between columns' },
    { category: 'Advanced', query: 'open new bug report' },
    { category: 'Advanced', query: 'trigger deploy workflow' },
    { category: 'Advanced', query: 'link issue to epic' },
    { category: 'Advanced', query: 'crete issue' },
    { category: 'Advanced', query: 'isue status change' },
    { category: 'Advanced', query: 'assign someone to a task' },
    { category: 'Advanced', query: 'board backlog to sprint' },
    { category: 'Advanced', query: 'export issues to csv' },
    { category: 'Advanced', query: 'refresh project permissions' },
    { category: 'Advanced', query: 'reset workflow step' },
    { category: 'Advanced', query: 'configure automation rule' },
];

const cases = queries.map((entry) => {
    const results = searchTopFive(entry.query);
    return {
        category: entry.category,
        query: entry.query,
        expectedIds: results.map((result) => result.id),
    };
});

console.log(JSON.stringify(cases, null, 2));