# License Headers

This document explains how to manage license headers in the codebase.

## Overview

All source files (`.ts`, `.js`, `.mjs`) in the `src/`, `scripts/`, and `tests/` directories must include the LGPL-3.0-or-later license header at the top.

## License Header Format

The license header follows this format:

```typescript
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
```

## Shebang Handling

For files with shebangs (e.g., `#!/usr/bin/env node`), the header is placed **after** the shebang:

```typescript
#!/usr/bin/env node

/**
 * Copyright (c) 2025 Bitbucket Data Center MCP Server Contributors
 * ...
 */
```

## Usage

### Check for missing headers

To check which files are missing license headers:

```bash
npm run license:check
```

This will:
- Scan all `.ts`, `.js`, and `.mjs` files in `src/`, `scripts/`, and `tests/`
- Report which files are missing headers
- Exit with code 1 if any files are missing headers (useful for CI)

### Add missing headers

To automatically add license headers to all files:

```bash
npm run license:fix
```

This will:
- Add headers to all files that don't have them
- Preserve shebangs at the top of files
- Skip auto-generated files (e.g., `generated-schemas.ts`)

## CI Integration

The `license:check` command can be added to your CI pipeline to ensure all new files include proper headers:

```yaml
- name: Check license headers
  run: npm run license:check
```

## Exceptions

The following are automatically excluded:
- `node_modules/`
- `dist/`
- `coverage/`
- `.git/`
- `generated-schemas.ts` (auto-generated)

## Manual Header Addition

When creating new files, you can:

1. **Let the script add it**: Create the file without a header, then run `npm run license:fix`
2. **Add manually**: Copy the header from another file, ensuring proper placement after shebang if present
3. **Use IDE snippets**: Configure your IDE to include the header in new file templates

## Script Location

The header management script is located at:
```
scripts/add-license-headers.ts
```

## Troubleshooting

### "File already has header" but script says it's missing

The script checks for key phrases:
- `GNU Lesser General Public License`
- `LGPL-3.0`
- `Copyright (c) 2025 Bitbucket Data Center MCP Server Contributors`

Ensure at least one of these appears in your header comment.

### Script not detecting shebang

Shebangs must be on the **first line** of the file and start with `#!`.

### Want to exclude additional files?

Edit `scripts/add-license-headers.ts` and add patterns to the `IGNORE_PATTERNS` array.
