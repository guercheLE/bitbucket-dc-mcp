## [1.0.1](https://github.com/guercheLE/bitbucket-dc-mcp/compare/v1.0.0...v1.0.1) (2025-10-21)

### Bug Fixes

* format version-command test file with prettier ([43cbb86](https://github.com/guercheLE/bitbucket-dc-mcp/commit/43cbb86dd660157a703f55f6092d462f60962752))
* make version-command test dynamically read package.json version ([3e79cf0](https://github.com/guercheLE/bitbucket-dc-mcp/commit/3e79cf019956bd028dbffdd3e5eda115d8a82f72))
* update version-command test to match v1.0.0 ([f9a2800](https://github.com/guercheLE/bitbucket-dc-mcp/commit/f9a2800591e079416754a17dc96bd12c47ff3fc8))
* update version-command test to use correct version mock ([6a9f6c4](https://github.com/guercheLE/bitbucket-dc-mcp/commit/6a9f6c49e671b10b442804177de35c8afae910d6))

## 1.0.0 (2025-10-20)

### Features

* add comprehensive test suite and project configuration ([eecb067](https://github.com/guercheLE/bitbucket-dc-mcp/commit/eecb06700a307fd1316bcaf421f95a17abfda721))

### Bug Fixes

* set default auth_method to 'pat' in DEFAULT_CONFIG ([501ed12](https://github.com/guercheLE/bitbucket-dc-mcp/commit/501ed120545bc84e417b9dcd9291c1dcd505d56f))
* update API version handling and improve URL construction in tests ([302b85e](https://github.com/guercheLE/bitbucket-dc-mcp/commit/302b85ea385ca913ec79b742561bf26b44c98f56))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-10-19

### Added
- Initial release of Bitbucket DataCenter MCP Server
- Model Context Protocol (MCP) server implementation for Bitbucket DataCenter
- Semantic search capabilities using vector embeddings
- Support for multiple authentication strategies:
  - OAuth 1.0
  - OAuth 2.0
  - Personal Access Token (PAT)
  - HTTP Basic Authentication
- Operation execution with parameter validation
- Comprehensive CLI with interactive setup wizard
- Health check and monitoring capabilities
- Circuit breaker pattern for resilience
- Rate limiting for API protection
- Credential storage with secure keychain integration
- Docker support with multi-architecture builds
- Extensive test suite (unit, integration, e2e, benchmarks)
- Comprehensive documentation and examples

[Unreleased]: https://github.com/guercheLE/bitbucket-dc-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/guercheLE/bitbucket-dc-mcp/releases/tag/v0.1.0
