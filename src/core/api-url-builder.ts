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
 * API URL Builder Utility
 *
 * Provides utilities for building Bitbucket Data Center REST API URLs with the correct API version.
 *
 * Bitbucket Data Center uses:
 * - /rest/api/latest/* - Modern instances (recommended)
 * - /rest/api/1.0/* - Legacy instances
 *
 * The api_version config controls which version is used for /rest/api/* endpoints.
 */

/**
 * Build a complete Bitbucket Data Center REST API URL with the correct API version.
 *
 * @param baseUrl - The base Bitbucket URL (e.g., 'https://bitbucket.example.com')
 * @param apiVersion - The API version to use ('1.0' or 'latest')
 * @param endpoint - The API endpoint path (e.g., 'projects', 'projects/{projectKey}/repos')
 * @returns Complete API URL
 *
 * @example
 * ```typescript
 * buildApiUrl('https://bitbucket.example.com', 'latest', 'projects')
 * // Returns: 'https://bitbucket.example.com/rest/api/latest/projects'
 *
 * buildApiUrl('https://bitbucket.example.com', '1.0', 'projects/PROJECT/repos')
 * // Returns: 'https://bitbucket.example.com/rest/api/1.0/projects/PROJECT/repos'
 * ```
 */
export function buildApiUrl(baseUrl: string, apiVersion: '1.0' | 'latest', endpoint: string): string {
  // Remove trailing slashes from base URL
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');

  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.replace(/^\/+/, '');

  return `${cleanBaseUrl}/rest/api/${apiVersion}/${cleanEndpoint}`;
}

/**
 * Convert an API path to the specified API version.
 *
 * @param path - The API path (e.g., '/rest/api/latest/projects')
 * @param targetVersion - The target API version ('1.0' or 'latest')
 * @returns Path with the correct API version
 *
 * @example
 * ```typescript
 * convertApiPath('/rest/api/latest/projects', '1.0')
 * // Returns: '/rest/api/1.0/projects'
 *
 * convertApiPath('/rest/api/1.0/projects', 'latest')
 * // Returns: '/rest/api/latest/projects'
 * ```
 */
export function convertApiPath(path: string, targetVersion: '1.0' | 'latest'): string {
  // Only convert paths that start with /rest/api/
  if (path.match(/\/rest\/api\/(1\.0|latest)\//)) {
    return path.replace(/\/rest\/api\/(1\.0|latest)\//, `/rest/api/${targetVersion}/`);
  }
  return path;
}

/**
 * Extract the API version from a URL or path.
 *
 * @param urlOrPath - URL or path containing an API version
 * @returns The detected API version ('1.0' or 'latest'), or null if not found
 *
 * @example
 * ```typescript
 * extractApiVersion('/rest/api/latest/projects')
 * // Returns: 'latest'
 *
 * extractApiVersion('https://bitbucket.example.com/rest/api/1.0/projects')
 * // Returns: '1.0'
 * ```
 */
export function extractApiVersion(urlOrPath: string): '1.0' | 'latest' | null {
  const match = urlOrPath.match(/\/rest\/api\/(1\.0|latest)\//);
  return match ? (match[1] as '1.0' | 'latest') : null;
}

/**
 * Check if a path needs API version conversion.
 * Returns true only for /rest/api/X paths that should respect the api_version config.
 *
 * @param path - The API path to check
 * @returns True if path should be affected by api_version config
 *
 * @example
 * ```typescript
 * needsApiVersion('/rest/api/latest/projects')    // true
 * needsApiVersion('/rest/api/1.0/projects')       // true
 * needsApiVersion('/plugins/servlet/applinks')    // false
 * ```
 */
export function needsApiVersion(path: string): boolean {
  // Only /rest/api/(1.0|latest)/ paths are affected by api_version config
  return path.match(/\/rest\/api\/(1\.0|latest)\//) !== null;
}

/**
 * Build a full URL from a base URL and an API path.
 *
 * @param baseUrl - The base Bitbucket URL
 * @param path - The API path (can be relative or full path including /rest/...)
 * @param defaultApiVersion - API version to use for /rest/api/* paths
 * @returns Complete URL
 *
 * @example
 * ```typescript
 * // Standard REST API - uses api_version
 * buildFullUrl('https://bitbucket.example.com', '/rest/api/latest/projects', 'latest')
 * // Returns: 'https://bitbucket.example.com/rest/api/latest/projects'
 *
 * buildFullUrl('https://bitbucket.example.com', 'projects', 'latest')
 * // Returns: 'https://bitbucket.example.com/rest/api/latest/projects'
 *
 * // Path with version already specified
 * buildFullUrl('https://bitbucket.example.com', '/rest/api/1.0/projects', 'latest')
 * // Returns: 'https://bitbucket.example.com/rest/api/1.0/projects'
 * ```
 */
export function buildFullUrl(baseUrl: string, path: string, defaultApiVersion: '1.0' | 'latest'): string {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');

  // If path already contains /rest/api/(1.0|latest), use it as-is
  if (path.match(/\/rest\/api\/(1\.0|latest)\//)) {
    return `${cleanBaseUrl}${path}`;
  }

  // If path contains other /rest/ paths, use as-is
  if (path.startsWith('/rest/')) {
    return `${cleanBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  // Otherwise, build URL with default API version for /rest/api/*
  const cleanPath = path.replace(/^\/+/, '');
  return buildApiUrl(cleanBaseUrl, defaultApiVersion, cleanPath);
}
