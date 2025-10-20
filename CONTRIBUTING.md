# Contributing to Bitbucket Data Center MCP Server

Thank you for your interest in contributing! We welcome contributions from the community.

**👋 First-time contributors welcome!** Look for issues labeled [`good first issue`](https://github.com/guercheLE/bitbucket-dc-mcp/labels/good%20first%20issue) to get started.

This project adheres to our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
  - [Types of Contributions](#types-of-contributions)
  - [Recognition](#recognition)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Issue Templates](#issue-templates)
- [Questions?](#questions)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How to Contribute

We value all contributions to this project, whether you're fixing a typo, reporting a bug, or implementing a major feature. Here's how you can help:

### Types of Contributions

#### 🐛 Bug Reports
Open a GitHub issue with detailed reproduction steps, environment information, and expected vs. actual behavior. Use our [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) to ensure all necessary information is included.

#### ✨ Feature Requests
Propose new features by opening a GitHub issue describing the use case, benefits, and potential implementation approach. Use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) to structure your proposal.

#### 🔧 Code Contributions
Submit pull requests to fix bugs, add features, or improve performance. All code contributions must:
- Include tests (unit and/or integration)
- Follow our coding standards
- Pass CI checks (tests, linting, build)
- Update relevant documentation

#### 📚 Documentation
Improve our documentation by:
- Fixing typos or unclear explanations
- Adding code examples to guides
- Writing tutorials or cookbook recipes
- Updating API reference documentation
- Translating documentation (if applicable)

#### 💬 Community Support
Help others by:
- Answering questions in GitHub Discussions or Issues
- Reviewing pull requests constructively
- Sharing your experience and use cases
- Participating in community discussions

#### 🧪 Testing & Quality Assurance
Contribute by:
- Adding test cases for edge scenarios
- Improving test coverage
- Running tests in different environments
- Reporting platform-specific issues

### Recognition

We believe in recognizing our contributors:

- **Contributors List**: All contributors are listed in our [README Contributors section](README.md#contributors) and on the [GitHub contributors page](https://github.com/guercheLE/bitbucket-dc-mcp/graphs/contributors)
- **Release Notes**: Significant contributions are highlighted in our [CHANGELOG.md](CHANGELOG.md) and release notes
- **Social Links**: Contributors can optionally add their social profiles (GitHub, Twitter, LinkedIn) in an AUTHORS file (to be created on first request)

Your contributions make this project better for everyone! 🙌

## Development Setup

### Prerequisites

- Node.js 22+ LTS
- npm 9+
- Git
- Bitbucket Data Center instance for testing (optional but recommended)

### Setup Steps

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/bitbucket-datacenter-mcp-server.git
cd bitbucket-dc-mcp

# 3. Add upstream remote
git remote add upstream https://github.com/guercheLE/bitbucket-dc-mcp.git

# 4. Install dependencies
npm install

# 5. Build the project
npm run build

# 6. Run tests to verify setup
npm test

# 7. Run setup wizard (optional - for integration testing)
npm run setup
```

### Pre-commit Hooks (Optional but Recommended)

We recommend setting up pre-commit hooks using [Husky](https://typicode.github.io/husky/) to automatically lint and format your code before committing:

```bash
# Install Husky (if not already installed)
npm install --save-dev husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run format"
```

**Note**: Pre-commit hooks are optional for local development. Our CI pipeline enforces all code standards, so even if you don't use hooks locally, your code will be validated before merge.

### Development Workflow

```bash
# Create a feature branch
git checkout -b feature/my-feature

# Make your changes
# Edit files in src/

# Run tests continuously during development
npm run dev    # Watch mode compilation in one terminal
npm test       # Run tests in another terminal

# Format and lint your code
npm run format
npm run lint

# Commit your changes
git add .
git commit -m "feat: add my feature"

# Keep your branch up to date
git fetch upstream
git rebase upstream/main

# Push to your fork
git push origin feature/my-feature

# Open a Pull Request on GitHub
```

## Project Structure

Understanding the project structure helps you navigate the codebase and place your changes correctly. See the [Unified Project Structure](docs/internal/architecture/unified-project-structure.md) for complete details.

```
bitbucket-dc-mcp/
├── .github/                    # GitHub templates and workflows
│   ├── workflows/              # CI/CD pipelines (GitHub Actions)
│   └── ISSUE_TEMPLATE/         # Issue templates for bugs, features, questions
├── src/                        # Source code (TypeScript)
│   ├── tools/                  # MCP Tools Layer (search_ids, call, etc.)
│   ├── services/               # Service Layer (Business Logic)
│   │   ├── semantic-search.ts  # Semantic search service
│   │   ├── bitbucket-client.ts      # Bitbucket API client
│   │   └── embedding.ts        # Embedding generation
│   ├── core/                   # Core Layer (Utilities, Config, Logger)
│   ├── auth/                   # Authentication strategies
│   │   └── strategies/         # PAT, OAuth 2.0, etc.
│   ├── validation/             # Input validation with Zod
│   ├── data/                   # Data Access Layer (SQLite)
│   └── cli/                    # CLI Tools (setup, search)
├── tests/                      # Test suites
│   ├── unit/                   # Unit tests (70% of tests)
│   ├── integration/            # Integration tests (25% of tests)
│   ├── e2e/                    # E2E tests (5% of tests)
│   └── benchmarks/             # Semantic search quality benchmarks
├── docs/                       # Documentation
│   ├── architecture/           # Architecture documentation
│   ├── prd/                    # Product requirements
│   └── stories/                # User stories
├── scripts/                    # Build and utility scripts
├── data/                       # Generated data (embeddings, schemas)
├── CONTRIBUTING.md             # This file
├── CODE_OF_CONDUCT.md          # Community guidelines
├── README.md                   # Project overview
└── package.json                # Dependencies and scripts
```

**Key Architectural Principles:**
- **Layered Architecture**: Tools → Services → Core → Data (dependencies flow downward)
- **No Circular Dependencies**: Each layer can only depend on layers below it
- **Backend/CLI Only**: No frontend code
- **Tests Mirror Source**: Test organization matches `src/` structure

When making changes, place your code in the appropriate layer:
- **Adding a new MCP tool?** → `src/tools/`
- **Adding business logic?** → `src/services/`
- **Adding utilities?** → `src/core/`
- **Adding authentication?** → `src/auth/strategies/`
- **Adding tests?** → `tests/unit/`, `tests/integration/`, or `tests/e2e/`

## Coding Standards

We follow strict coding standards to maintain code quality. See [Coding Standards Guide](docs/internal/architecture/coding-standards.md) for full details. ESLint and Prettier are enforced in CI. Use `npm run lint` and `npm run lint:fix` to auto-fix issues when possible.

### Key Rules

#### TypeScript

- **Strict mode enabled** - No `any` types without justification
- **Prefer `unknown` over `any`** - Use type guards to narrow
- **No implicit any** - All function parameters and return types must be typed
- **Immutability** - Use `const` over `let`, never mutate arrays/objects directly

#### Error Handling

- **Always use try/catch** in async functions
- **Never swallow errors** - Log or rethrow
- **Custom error classes** for domain errors
- **Fail fast** with descriptive error messages

#### Logging

- **No console.log** - Use Logger (pino) for all logging
- **Structured logs** - Include context (correlation ID, operation)
- **Redact sensitive data** - Credentials, tokens, passwords

#### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `SemanticSearchService` |
| Interfaces | PascalCase | `AuthStrategy` |
| Functions | camelCase | `executeOperation()` |
| Variables | camelCase | `operationId` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Files | kebab-case | `semantic-search.ts` |

#### Documentation

- **TSDoc comments** for public APIs (classes, methods)
- Explain **why**, not **what** (code explains what)
- Include `@param`, `@returns`, `@throws` tags
- Add usage examples for complex functions

## Testing Requirements

See the full [Testing Strategy](docs/internal/architecture/testing-strategy.md) for details.

### Test Coverage

- **Minimum 80% coverage** - CI fails below this threshold
- **All new features require tests** - Unit + integration
- **Bug fixes require regression tests** - Prevent reoccurrence

### Testing Pyramid

- Unit tests: ~70% of total tests (fast, isolated)
- Integration tests: ~25% (critical paths)
- E2E tests: ~5% (smoke tests)

### Test Types

#### Unit Tests (`tests/unit/`)

Test individual functions and classes in isolation.

```typescript
import { describe, it, expect } from 'vitest';
import { SemanticSearchService } from '../src/services/semantic-search';

describe('SemanticSearchService', () => {
  it('should return top 5 results by default', async () => {
    const service = new SemanticSearchService(/* ... */);
    const results = await service.search('create issue');
    expect(results).toHaveLength(5);
  });
});
```

#### Integration Tests (`tests/integration/`)

Test service interactions and database operations.

```typescript
describe('SearchIdsTool integration', () => {
  it('should search embeddings database and return results', async () => {
    // Test with real database
    const tool = new SearchIdsTool(/* ... */);
    const result = await tool.execute({ query: 'create issue', limit: 3 });
    expect(result.operations).toHaveLength(3);
  });
});
```

#### E2E Tests (`tests/e2e/`)

Test MCP protocol flows end-to-end.

```typescript
describe('MCP Server E2E', () => {
  it('should handle search_ids tool call', async () => {
    // Test full MCP request/response cycle
    const response = await mcpClient.callTool('search_ids', {
      query: 'create issue',
      limit: 5
    });
    expect(response.content[0].text).toContain('operations');
  });
});
```

#### Benchmark Tests (`tests/benchmarks/`)

Validate semantic search quality.

```typescript
// Search precision must be >85%
expect(precision).toBeGreaterThanOrEqual(0.85);
```

### Running Tests

```bash
npm test                  # All tests
npm run test:coverage     # With coverage report
npm run test:benchmark    # Search quality gate
npm run test:e2e          # E2E tests only
```

### Vitest Tips

- Use `vi.fn()` to mock simple functions and `vi.mock()` to stub modules
- Prefer `beforeEach` for per-test setup and `afterEach` for cleanup
- Follow existing patterns in the repository for mocking network calls and keychain access

### CI Expectations

All pull requests must satisfy the CI pipeline:

- Tests pass across the matrix (Linux, macOS, Windows)
- Coverage ≥ 80%
- Lint and format checks pass
- TypeScript build succeeds

## Pull Request Process

### Before Submitting

- [ ] All tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Formatting applied: `npm run format`
- [ ] Coverage ≥80%: `npm run test:coverage`
- [ ] Documentation updated (if adding features)
- [ ] Commit messages follow conventional commits

### Branch Naming

Use descriptive branch names:

- `feature/<description>` for new features
- `fix/<description>` for bug fixes
- `docs/<description>` for documentation-only changes
- `refactor/<description>` for refactoring without behavior change

### PR Guidelines

1. **One feature per PR** - Keep changes focused and reviewable
2. **Clear description** - Explain what, why, and how
3. **Link issues** - Reference issue numbers (e.g., "Fixes #123")
4. **Screenshots** - Add before/after screenshots for UI changes
5. **Tests included** - Demonstrate the feature works
6. **Breaking changes** - Clearly document in PR description

### PR Template

```markdown
## Description
Brief description of the change and motivation.

## Related Issue
Fixes #123

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] All tests pass locally

## Checklist
- [ ] Code follows coding standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

### Review Process

1. **Automated checks** - GitHub Actions must pass (tests, lint, build)
2. **Code review** - At least one maintainer approval required
3. **Feedback** - Address review comments promptly
4. **Merge** - Squash and merge by maintainer

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring (no functional changes)
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, tooling

### Examples

```bash
feat(search): add threshold parameter to search_ids tool

Allow users to filter results by minimum similarity score.

Closes #42

---

fix(auth): resolve OAuth 2.0 token refresh race condition

Multiple concurrent requests could trigger redundant token refreshes.
Added mutex lock to ensure single refresh at a time.

Fixes #87

---

docs(readme): update quick start installation steps

Clarify npm global install vs local source build.
```

### Scope

Optional scope indicates the affected area:
- `auth` - Authentication
- `search` - Semantic search
- `tools` - MCP tools
- `config` - Configuration
- `logging` - Logging/observability
- `ci` - CI/CD pipeline

## Issue Templates

When opening issues, please use our templates so we can help you faster:

- [Bug report](.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature request](.github/ISSUE_TEMPLATE/feature_request.md)
- [Question](.github/ISSUE_TEMPLATE/question.md)

You’ll be prompted to pick a template when creating a new issue. See `.github/ISSUE_TEMPLATE/config.yml` for helpful links (documentation, troubleshooting guide, discussions).

## Questions?

- **General questions**: Open a [Discussion](https://github.com/guercheLE/bitbucket-dc-mcp/discussions)
- **Bug reports**: Open an [Issue](https://github.com/guercheLE/bitbucket-dc-mcp/issues)
- **Security issues**: See [SECURITY.md](SECURITY.md)
- **Troubleshooting**: Read the [Troubleshooting Guide](docs/troubleshooting.md)

Thank you for contributing! 🎉
