## [1.5.0](https://github.com/guercheLE/bitbucket-dc-mcp/compare/v1.4.0...v1.5.0) (2025-10-22)

### Features

* adicionar debug logging detalhado para diagnosticar create_comment_2 ([0339eef](https://github.com/guercheLE/bitbucket-dc-mcp/commit/0339eefa84f342865f8f2d805cccb2ec2bc87964)), closes [#create_comment_2](https://github.com/guercheLE/bitbucket-dc-mcp/issues/create_comment_2)
* adicionar debug logging extensivo para diagnosticar create_comment_2 ([ee4f532](https://github.com/guercheLE/bitbucket-dc-mcp/commit/ee4f532bb22a956df3c6ebebc4c0325afed53d66)), closes [#create_comment_2](https://github.com/guercheLE/bitbucket-dc-mcp/issues/create_comment_2)
* adicionar testes HTTP diretos para diagnóstico ([30362f4](https://github.com/guercheLE/bitbucket-dc-mcp/commit/30362f4d3d11dac4694294052bc278ecd68c490f)), closes [#create_comment_2](https://github.com/guercheLE/bitbucket-dc-mcp/issues/create_comment_2)

### Documentation

* adicionar guia rápido de execução ([65db80b](https://github.com/guercheLE/bitbucket-dc-mcp/commit/65db80bb047f221fed49448b4fd81ee5f07287e4))

## [1.4.0](https://github.com/guercheLE/bitbucket-dc-mcp/compare/v1.3.1...v1.4.0) (2025-10-22)

### Features

* **bitbucket-client:** enhance HTTP request handling and body extraction ([2dca5be](https://github.com/guercheLE/bitbucket-dc-mcp/commit/2dca5be7acd3b306fade7d628a61ce39314a963b))

## [1.3.1](https://github.com/guercheLE/bitbucket-dc-mcp/compare/v1.3.0...v1.3.1) (2025-10-22)

### Bug Fixes

* **database:** update embeddings and operations schema ([e2a66a9](https://github.com/guercheLE/bitbucket-dc-mcp/commit/e2a66a9a520690f1e94e10c5c484eec62ba279c2))

## [1.3.0](https://github.com/guercheLE/bitbucket-dc-mcp/compare/v1.2.0...v1.3.0) (2025-10-22)

### Features

* **security:** enhance logging with automatic data sanitization and structured logging ([4028ff4](https://github.com/guercheLE/bitbucket-dc-mcp/commit/4028ff41dfb37ecd3eeae3eac92cb0d51d48e394))

### Documentation

* add Database Regeneration section to README and create detailed guide in EMBEDDINGS_REGENERATION.md ([a1495f5](https://github.com/guercheLE/bitbucket-dc-mcp/commit/a1495f5b6818f2e464309c5686f4c91b1883e9c6))

### Code Refactoring

* **correlation:** replace correlationId with traceId across the codebase ([77bf87c](https://github.com/guercheLE/bitbucket-dc-mcp/commit/77bf87c0aaab26c7eafdc82e3425f046e3c8e70d))
* **correlation:** update tests to replace correlationId with traceId ([ff9eaff](https://github.com/guercheLE/bitbucket-dc-mcp/commit/ff9eaff783a0c77a060228856660a5e650c38eef))

## [1.2.0](https://github.com/guercheLE/bitbucket-dc-mcp/compare/v1.1.0...v1.2.0) (2025-10-22)

### Features

* **http-server:** introduce HTTP mode for Bitbucket DC MCP Server ([87dbf71](https://github.com/guercheLE/bitbucket-dc-mcp/commit/87dbf712707133dace0827ed9cd9caa9029db41e))

## [1.1.0](https://github.com/guercheLE/bitbucket-dc-mcp/compare/v1.0.1...v1.1.0) (2025-10-22)

### Features

* **auth:** add environment variable fallback for credentials loading ([d47c6e9](https://github.com/guercheLE/bitbucket-dc-mcp/commit/d47c6e9800165d4cc8e901ac3da9219607383c15))
* **http-server:** enhance HTTP server mode documentation and add OpenTelemetry support ([851b3b3](https://github.com/guercheLE/bitbucket-dc-mcp/commit/851b3b3e7dd37c1988d17422561f4921b60efc39))
* **logging:** enhance logging configuration with error log support ([dad0fd6](https://github.com/guercheLE/bitbucket-dc-mcp/commit/dad0fd65247179888320d876f43ac87eacb6b8a8))
* **oauth1:** add comprehensive OAuth 1.0a setup guide and enhance CLI support ([ab4e9fc](https://github.com/guercheLE/bitbucket-dc-mcp/commit/ab4e9fc582bb71c13fbd3855060885772a498da0))
* **oauth2:** add comprehensive OAuth 2.0 setup guide for Bitbucket Data Center ([cd5e2f5](https://github.com/guercheLE/bitbucket-dc-mcp/commit/cd5e2f56e80cdff5e4ca55e5df26e0024dbdfc20))
* **observability:** integrate OpenTelemetry for metrics and tracing support ([f3de676](https://github.com/guercheLE/bitbucket-dc-mcp/commit/f3de6768f5afda49e7539b4be04e8ebd93130c12))
* **schema:** implement SchemaResolver for OpenAPI schema reference resolution ([4373183](https://github.com/guercheLE/bitbucket-dc-mcp/commit/43731838bb54d043a22c33f386997238b4f24c48))
* **tools:** implement ToolExecutor for improved tool execution management ([75b512a](https://github.com/guercheLE/bitbucket-dc-mcp/commit/75b512a8bde409781c7a28a5f875bd8af8d71bd8))

### Bug Fixes

* **auth:** update error message for missing credentials ([823955b](https://github.com/guercheLE/bitbucket-dc-mcp/commit/823955be322dd71c700b9539a147edb857246193))
* **tracing:** add explicit return type to ignoreIncomingRequestHook function ([935820c](https://github.com/guercheLE/bitbucket-dc-mcp/commit/935820cda0e6e06e151c402db2eb50010669b7fb))

### Code Refactoring

* **cli:** improve formatting of RSA key generation instructions ([280ffeb](https://github.com/guercheLE/bitbucket-dc-mcp/commit/280ffeb7a62a9887b5d30fd5a108298293509ac0))

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
