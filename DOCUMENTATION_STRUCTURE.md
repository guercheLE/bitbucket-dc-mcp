# Documentation Structure

This document explains the reorganized documentation structure of the Bitbucket Data Center MCP Server project.

## Overview

The documentation has been reorganized to separate **user-facing documentation** from **internal project planning documentation** (BMAD methodology files).

## Directory Structure

```
.
├── README.md                     # Project overview and quick start
├── CONTRIBUTING.md               # Contribution guidelines
├── CODE_OF_CONDUCT.md            # Community guidelines
├── CHANGELOG.md                  # Version history
├── LICENSE                       # MIT license
│
└── docs/                         # Documentation root
    ├── README.md                 # Documentation index and navigation guide
    │
    ├── 📖 User Guides (User-Facing)
    ├── api-reference.md          # MCP tools API reference
    ├── authentication.md         # Authentication setup guide
    ├── cookbook.md               # Practical code examples
    ├── docker.md                 # Docker deployment guide
    ├── observability.md          # Logging and monitoring
    ├── troubleshooting.md        # Troubleshooting and FAQ
    ├── beta-testing-guide.md     # Beta testing program guide
    │
    ├── 📁 Supporting Directories (User-Facing)
    ├── beta-testing/             # Beta testing resources
    ├── images/                   # Screenshots and diagrams
    ├── manual-tests/             # Manual testing scenarios
    │
    └── 🔒 internal/               # Internal project documentation (BMAD)
        ├── README.md             # Internal docs index
        ├── architecture.md       # High-level architecture
        ├── prd.md                # Product Requirements Document
        ├── brief.md              # Project brief
        ├── brainstorming-session-results.md
        ├── competitor-analysis.md
        ├── market-research.md
        ├── architecture/         # Detailed architecture docs
        ├── prd/                  # PRD breakdown by epic
        └── stories/              # User stories and tasks
```

## Rationale

### Before (Issues)

- ❌ User guides mixed with planning docs in `docs/`
- ❌ Hard to find relevant documentation for users
- ❌ Not following standard open-source patterns

### After (Benefits)

- ✅ Clear separation of concerns
- ✅ User docs in `docs/` (standard pattern)
- ✅ Internal docs in `docs/internal/` (hidden from casual users)
- ✅ Easy navigation with README files in each directory

## Documentation Categories

### Root Directory (Project Metadata)

Files that should always be in the project root:

- `README.md` - Project overview, badges, quick start
- `CONTRIBUTING.md` - How to contribute
- `CODE_OF_CONDUCT.md` - Community standards
- `CHANGELOG.md` - Version history
- `LICENSE` - License terms

### User-Facing Documentation (`docs/`)

Documentation for users who want to **use** the MCP server:

- Installation and setup guides
- Authentication configuration
- API reference and examples
- Deployment instructions
- Troubleshooting and FAQ
- Cookbook recipes

**Audience:** End users, DevOps engineers, integrators

### Internal Documentation (`docs/internal/`)

Documentation for maintainers and contributors who want to **understand the project's design**:

- Product Requirements Documents (PRD)
- Architecture Decision Records (ADR)
- User stories and development tasks
- Market research and competitor analysis
- Design rationale and planning artifacts

**Audience:** Project maintainers, core contributors

## Migration Summary

Files moved from `docs/` to `docs/internal/`:

- `architecture/` → `internal/architecture/`
- `architecture.md` → `internal/architecture.md`
- `prd/` → `internal/prd/`
- `prd.md` → `internal/prd.md`
- `stories/` → `internal/stories/`
- `brainstorming-session-results.md` → `internal/brainstorming-session-results.md`
- `brief.md` → `internal/brief.md`
- `competitor-analysis.md` → `internal/competitor-analysis.md`
- `market-research.md` → `internal/market-research.md`

Files remaining in `docs/` (user-facing):

- `api-reference.md`
- `authentication.md`
- `cookbook.md`
- `docker.md`
- `observability.md`
- `troubleshooting.md`
- `beta-testing-guide.md`
- `beta-testing/`, `images/`, `manual-tests/`

## References Updated

All references to moved files were updated in:

- `README.md` - Links to architecture, coding standards, testing strategy
- `CONTRIBUTING.md` - Links to architecture and coding standards
- `tests/e2e/README.md` - Links to architecture and testing docs

## Best Practices

This structure follows common open-source patterns:

1. **GitHub Standard:** Root-level README, CONTRIBUTING, CODE_OF_CONDUCT, CHANGELOG
2. **User-First:** Most visible docs are user-facing
3. **Internal Isolation:** Planning docs don't clutter user experience
4. **Discoverability:** README files in each directory guide navigation

## For New Contributors

- **Want to use the MCP server?** → Start with [docs/](docs/)
- **Want to understand the design?** → See [docs/internal/](docs/internal/)
- **Want to contribute?** → Read [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Reorganization Date:** October 19, 2025  
**Rationale:** Separate user-facing documentation from BMAD planning artifacts
