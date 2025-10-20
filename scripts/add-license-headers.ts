#!/usr/bin/env node

/**
 * Script to add license headers to source files
 * Handles files with and without shebangs
 * Usage: tsx scripts/add-license-headers.ts [--check] [--fix]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// SPDX-License-Identifier: LGPL-3.0-or-later
const LICENSE_HEADER = `/**
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
 */`;

const DIRECTORIES_TO_SCAN = ['src', 'scripts', 'tests'];
const FILE_EXTENSIONS = ['.ts', '.js', '.mjs'];
const IGNORE_PATTERNS = [
    'node_modules',
    'dist',
    'coverage',
    '.git',
    'generated-schemas.ts', // Auto-generated file
];

interface FileResult {
    path: string;
    status: 'ok' | 'missing' | 'added' | 'error';
    error?: string;
}

/**
 * Check if file path should be ignored
 */
function shouldIgnoreFile(filePath: string): boolean {
    return IGNORE_PATTERNS.some((pattern) => filePath.includes(pattern));
}

/**
 * Check if file has a shebang line
 */
function hasShebang(content: string): boolean {
    return content.startsWith('#!');
}

/**
 * Extract shebang from content if present
 */
function extractShebang(content: string): { shebang: string; rest: string } | null {
    if (!hasShebang(content)) {
        return null;
    }

    const lines = content.split('\n');
    const shebang = lines[0];
    const rest = lines.slice(1).join('\n');

    return { shebang, rest };
}

/**
 * Check if content already has license header
 */
function hasLicenseHeader(content: string): boolean {
    // Check for key phrases from the license
    return (
        content.includes('GNU Lesser General Public License') ||
        content.includes('LGPL-3.0') ||
        content.includes('Copyright (c) 2025 Bitbucket Data Center MCP Server Contributors')
    );
}

/**
 * Add license header to file content
 */
function addLicenseHeader(content: string): string {
    const shebangData = extractShebang(content);

    if (shebangData) {
        // File has shebang: preserve it at the top
        const { shebang, rest } = shebangData;
        return `${shebang}\n\n${LICENSE_HEADER}\n\n${rest.trimStart()}`;
    } else {
        // No shebang: just prepend license
        return `${LICENSE_HEADER}\n\n${content.trimStart()}`;
    }
}

/**
 * Process a single file
 */
async function processFile(filePath: string, fix: boolean): Promise<FileResult> {
    try {
        const content = readFileSync(filePath, 'utf-8');

        if (hasLicenseHeader(content)) {
            return { path: filePath, status: 'ok' };
        }

        if (fix) {
            const newContent = addLicenseHeader(content);
            writeFileSync(filePath, newContent, 'utf-8');
            return { path: filePath, status: 'added' };
        } else {
            return { path: filePath, status: 'missing' };
        }
    } catch (error) {
        return {
            path: filePath,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Recursively scan directory for source files
 */
async function scanDirectory(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
        const entries = await readdir(dir);

        for (const entry of entries) {
            const fullPath = path.join(dir, entry);

            if (shouldIgnoreFile(fullPath)) {
                continue;
            }

            const stats = await stat(fullPath);

            if (stats.isDirectory()) {
                const subFiles = await scanDirectory(fullPath);
                files.push(...subFiles);
            } else if (stats.isFile()) {
                const ext = path.extname(fullPath);
                if (FILE_EXTENSIONS.includes(ext)) {
                    files.push(fullPath);
                }
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error);
    }

    return files;
}

/**
 * Main function
 */
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const checkMode = args.includes('--check');
    const fixMode = args.includes('--fix');

    if (!checkMode && !fixMode) {
        console.error('Usage: tsx scripts/add-license-headers.ts [--check] [--fix]');
        console.error('  --check  Check files for missing headers (exit 1 if any missing)');
        console.error('  --fix    Add missing headers to files');
        process.exit(1);
    }

    console.log('🔍 Scanning for source files...\n');

    // Collect all files to process
    const allFiles: string[] = [];
    for (const dir of DIRECTORIES_TO_SCAN) {
        const dirPath = path.join(ROOT_DIR, dir);
        const files = await scanDirectory(dirPath);
        allFiles.push(...files);
    }

    console.log(`Found ${allFiles.length} files to process\n`);

    // Process each file
    const results: FileResult[] = [];
    for (const file of allFiles) {
        const result = await processFile(file, fixMode);
        results.push(result);
    }

    // Print summary
    const byStatus = {
        ok: results.filter((r) => r.status === 'ok'),
        missing: results.filter((r) => r.status === 'missing'),
        added: results.filter((r) => r.status === 'added'),
        error: results.filter((r) => r.status === 'error'),
    };

    console.log('📊 Summary:');
    console.log(`  ✅ Files with headers: ${byStatus.ok.length}`);
    console.log(`  ❌ Files missing headers: ${byStatus.missing.length}`);
    if (fixMode) {
        console.log(`  ➕ Headers added: ${byStatus.added.length}`);
    }
    if (byStatus.error.length > 0) {
        console.log(`  ⚠️  Errors: ${byStatus.error.length}`);
    }
    console.log('');

    // Print details for missing/added/error files
    if (byStatus.missing.length > 0) {
        console.log('Files missing license headers:');
        for (const result of byStatus.missing) {
            const relativePath = path.relative(ROOT_DIR, result.path);
            console.log(`  - ${relativePath}`);
        }
        console.log('');
    }

    if (byStatus.added.length > 0) {
        console.log('✨ License headers added to:');
        for (const result of byStatus.added) {
            const relativePath = path.relative(ROOT_DIR, result.path);
            console.log(`  - ${relativePath}`);
        }
        console.log('');
    }

    if (byStatus.error.length > 0) {
        console.log('⚠️  Errors encountered:');
        for (const result of byStatus.error) {
            const relativePath = path.relative(ROOT_DIR, result.path);
            console.log(`  - ${relativePath}: ${result.error}`);
        }
        console.log('');
    }

    // Exit with appropriate code
    if (checkMode && byStatus.missing.length > 0) {
        console.error('❌ Some files are missing license headers');
        process.exit(1);
    }

    if (byStatus.error.length > 0) {
        console.error('❌ Some files had errors');
        process.exit(1);
    }

    console.log('✅ All done!');
}

// Run if executed directly
const isMainModule = (() => {
    try {
        const executedPath = process.argv[1];
        if (!executedPath) {
            return false;
        }
        return fileURLToPath(import.meta.url) === path.resolve(executedPath);
    } catch {
        return false;
    }
})();

if (isMainModule) {
    void main();
}
