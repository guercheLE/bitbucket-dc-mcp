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
 * List of sensitive field names that should be sanitized in logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'credentials',
  'apiKey',
  'api_key',
  'secret',
  'client_secret',
  'privateKey',
  'private_key',
  'sessionToken',
  'session_token',
];

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(fieldName: string): boolean {
  const lowerFieldName = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some((sensitive) => lowerFieldName.includes(sensitive.toLowerCase()));
}

/**
 * Recursively sanitize an object, removing sensitive fields
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      sanitized[key] = '***';
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize parameters by removing or masking sensitive data
 * Returns a new object without mutating the original
 *
 * @param params - The parameters to sanitize
 * @returns A sanitized copy of the parameters
 */
export function sanitizeParams(params: unknown): unknown {
  if (params === null || params === undefined) {
    return params;
  }

  // Create a deep copy to avoid mutating the original
  const copy = JSON.parse(JSON.stringify(params));

  return sanitizeObject(copy);
}

/**
 * Sanitize a log context object
 * Useful for sanitizing error contexts, request contexts, etc.
 *
 * @param context - The context object to sanitize
 * @returns A sanitized copy of the context
 */
export function sanitizeLogContext(context: Record<string, unknown>): Record<string, unknown> {
  return sanitizeParams(context) as Record<string, unknown>;
}

/**
 * Sanitize an error object for logging
 * Preserves error message and stack but sanitizes any additional properties
 *
 * @param error - The error to sanitize
 * @returns A sanitized error object
 */
export function sanitizeError(error: Error & Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  // Sanitize any additional properties on the error
  for (const [key, value] of Object.entries(error)) {
    if (key !== 'name' && key !== 'message' && key !== 'stack') {
      if (isSensitiveField(key)) {
        sanitized[key] = '***';
      } else if (value !== null && typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Check if a value contains sensitive data
 * Useful for validation before logging
 *
 * @param value - The value to check
 * @returns true if the value appears to contain sensitive data
 */
export function containsSensitiveData(value: unknown): boolean {
  if (typeof value === 'string') {
    // Check if the string looks like a token/key (long alphanumeric string)
    if (/^[a-zA-Z0-9_\-.]{20,}$/.test(value)) {
      return true;
    }
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (isSensitiveField(key)) {
        return true;
      }
      if (containsSensitiveData(obj[key])) {
        return true;
      }
    }
  }

  return false;
}
