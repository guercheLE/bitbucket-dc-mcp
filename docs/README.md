# Documentation

Welcome to the **Bitbucket Data Center MCP Server** documentation! This directory contains comprehensive guides to help you set up, configure, and use the MCP server.

## Quick Navigation

### 🚀 Getting Started

- **[README.md](../README.md)** - Project overview, quick start, and installation
- **[authentication.md](authentication.md)** - Complete authentication setup guide (OAuth 2.0, PAT, OAuth 1.0a, Basic Auth)

### 📖 User Guides

- **[api-reference.md](api-reference.md)** - MCP tools reference (`search_ids`, `get_id`, `call_id`)
- **[http-server.md](http-server.md)** - HTTP server mode guide (alternative to stdio)
- **[api-version-detection.md](api-version-detection.md)** - API version detection and configuration guide
- **[api-version-faq.md](api-version-faq.md)** - API version configuration FAQ
- **[cookbook.md](cookbook.md)** - Practical code examples and common workflows
- **[docker.md](docker.md)** - Docker deployment guide with docker-compose examples

### 🔧 Operations & Maintenance

- **[observability.md](observability.md)** - Structured logging, OpenTelemetry tracing, Prometheus metrics
- **[opentelemetry-metrics.md](opentelemetry-metrics.md)** - OpenTelemetry metrics and tracing (HTTP mode)
- **[performance-metrics.md](performance-metrics.md)** - Performance benchmarks and targets
- **[troubleshooting.md](troubleshooting.md)** - Comprehensive troubleshooting guide and FAQ

### 🧪 Testing & Beta Program

- **[beta-testing-guide.md](beta-testing-guide.md)** - Beta testing program guide
- **[beta-testing/](beta-testing/)** - Beta testing resources and feedback tracking
- **[manual-tests/](manual-tests/)** - Manual testing scenarios and procedures

### 🖼️ Assets

- **[images/](images/)** - Screenshots, diagrams, and visual documentation

## Documentation Structure

```
docs/
├── README.md                    # This file - documentation index
├── authentication.md            # Authentication setup guide
├── api-reference.md             # MCP tools API reference
├── http-server.md               # HTTP server mode guide
├── cookbook.md                  # Practical code examples
├── docker.md                    # Docker deployment guide
├── observability.md             # Logging, tracing, and monitoring
├── opentelemetry-metrics.md     # OpenTelemetry metrics (HTTP mode)
├── performance-metrics.md       # Performance benchmarks
├── troubleshooting.md           # Troubleshooting and FAQ
├── beta-testing-guide.md        # Beta testing program
├── beta-testing/                # Beta testing resources
├── images/                      # Visual assets
├── manual-tests/                # Manual test scenarios
└── internal/                    # Internal project documentation (see below)
```

## Internal Project Documentation

The **[internal/](internal/)** directory contains project planning and architecture documentation used during development (BMAD methodology). These documents are primarily for maintainers and contributors interested in understanding the project's design decisions.

**Users should focus on the guides above.** For internal documentation details, see [internal/README.md](internal/README.md).

## Need Help?

- **Issues & Bugs:** [GitHub Issues](https://github.com/guercheLE/bitbucket-dc-mcp/issues)
- **Questions & Discussions:** [GitHub Discussions](https://github.com/guercheLE/bitbucket-dc-mcp/discussions)
- **Contributing:** [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Code of Conduct:** [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)

## Documentation Contributions

Found a typo or want to improve the docs? Contributions are welcome! See our [Contributing Guide](../CONTRIBUTING.md) for guidelines on improving documentation.

---

**Last Updated:** October 19, 2025  
**Project:** [bitbucket-datacenter-mcp-server](https://github.com/guercheLE/bitbucket-dc-mcp)
