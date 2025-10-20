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
 * Shared domain-specific error types used across the MCP server.
 */

export class ModelLoadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ModelLoadError';
    Error.captureStackTrace?.(this, ModelLoadError);
  }
}

export class DatabaseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DatabaseError';
    Error.captureStackTrace?.(this, DatabaseError);
  }
}

export class ValidationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ValidationError';
    Error.captureStackTrace?.(this, ValidationError);
  }
}

export class CredentialStorageError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CredentialStorageError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, CredentialStorageError);
  }
}

/**
 * Error codes for CredentialStorageError
 */
export const CredentialStorageErrorCodes = {
  KEYCHAIN_UNAVAILABLE: 'KEYCHAIN_UNAVAILABLE',
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  CREDENTIAL_NOT_FOUND: 'CREDENTIAL_NOT_FOUND',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
} as const;

/**
 * Error thrown when a critical or optional component is unavailable.
 * Includes recovery action suggestion for user guidance.
 */
export class ComponentUnavailableError extends Error {
  public readonly code = 'COMPONENT_UNAVAILABLE';
  public readonly statusCode = 503;
  public readonly component: string;
  public readonly recoveryAction?: string;

  constructor(component: string, message: string, recoveryAction?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ComponentUnavailableError';
    this.component = component;
    this.recoveryAction = recoveryAction;
    Error.captureStackTrace?.(this, ComponentUnavailableError);
  }
}

/**
 * Error thrown when the system is operating in degraded mode.
 * Includes list of available features that still function.
 */
export class DegradedModeError extends Error {
  public readonly code = 'DEGRADED_MODE';
  public readonly statusCode = 503;
  public readonly component: string;
  public readonly availableFeatures: string[];

  constructor(
    component: string,
    message: string,
    availableFeatures: string[],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'DegradedModeError';
    this.component = component;
    this.availableFeatures = availableFeatures;
    Error.captureStackTrace?.(this, DegradedModeError);
  }
}
