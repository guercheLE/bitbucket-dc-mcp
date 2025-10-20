# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of our project seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to the project maintainers. You can find the maintainer contact information in the [package.json](package.json) file.

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

### What to Expect

After submitting a vulnerability report, you can expect:

1. **Confirmation**: We will acknowledge receipt of your vulnerability report within 48 hours
2. **Investigation**: We will investigate the issue and determine its severity and impact
3. **Updates**: We will keep you informed of our progress towards a fix and full announcement
4. **Credit**: We will credit you for the discovery (unless you prefer to remain anonymous)

### Security Update Process

1. The security issue is received and assigned to a primary handler
2. The problem is confirmed and a list of affected versions is determined
3. Code is audited to find any similar problems
4. Fixes are prepared for all supported releases
5. Patches are released and the issue is publicly announced

## Security Best Practices

When using this MCP server, we recommend:

### Credential Management

- **Never commit credentials** to version control
- Use environment variables or secure credential storage
- Rotate credentials regularly
- Use least-privilege access principles

### Authentication

- Prefer **OAuth 2.0** over basic authentication when possible
- Use **Personal Access Tokens (PAT)** with appropriate scopes for Bitbucket Data Center
- Implement token rotation for long-lived tokens
- Monitor authentication logs for suspicious activity

### Network Security

- Use **HTTPS** for all Bitbucket connections
- Validate SSL/TLS certificates
- Avoid exposing the MCP server to untrusted networks
- Use firewall rules to restrict access

### Data Protection

- Be mindful of sensitive data in Bitbucket issues and comments
- Implement appropriate logging practices (avoid logging sensitive data)
- Use the sanitization features to prevent data leaks in logs
- Review API responses to ensure no sensitive data is exposed unnecessarily

### Dependency Security

- Keep dependencies up to date
- Regularly run `npm audit` to check for known vulnerabilities
- Subscribe to security advisories for major dependencies
- Use `npm audit fix` to automatically update vulnerable dependencies

### Configuration Security

- Review configuration files for sensitive data exposure
- Use secure defaults
- Validate all input from configuration files
- Implement rate limiting to prevent abuse

## Known Security Considerations

### Credential Storage

This server uses the system's native credential storage:
- **macOS**: Keychain
- **Windows**: Credential Vault
- **Linux**: Secret Service API (libsecret)

Credentials are encrypted at rest using OS-provided mechanisms.

### Rate Limiting

The server implements rate limiting to prevent abuse and protect against DoS attacks. See [docs/api-reference.md](docs/api-reference.md) for details on rate limits.

### Circuit Breaker

The circuit breaker pattern is implemented to prevent cascading failures and protect the Bitbucket server from overload. See [docs/observability.md](docs/observability.md) for configuration details.

### Logging and Monitoring

- All authentication attempts are logged
- Failed authentication attempts trigger alerts after threshold
- API calls are logged with correlation IDs for tracing
- Sensitive data is sanitized from logs

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported versions
4. Release patches as soon as possible

## Comments on This Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue to discuss.

## Attribution

This security policy is adapted from best practices in open source security and follows guidelines from:

- [GitHub Security Guidelines](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository)
- [OpenSSF Best Practices](https://bestpractices.coreinfrastructure.org/)

---

**Last Updated**: October 19, 2025
