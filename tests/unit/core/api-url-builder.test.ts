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

import { describe, expect, it } from 'vitest';
import {
  buildApiUrl,
  buildFullUrl,
  convertApiPath,
  extractApiVersion,
  needsApiVersion,
} from '../../../src/core/api-url-builder.js';

describe('buildApiUrl', () => {
  it('should build API v1.0 URL correctly', () => {
    const url = buildApiUrl('https://bitbucket.example.com', '1.0', 'projects');
    expect(url).toBe('https://bitbucket.example.com/rest/api/1.0/projects');
  });

  it('should build API latest URL correctly', () => {
    const url = buildApiUrl('https://bitbucket.example.com', 'latest', 'projects/PROJECT-123');
    expect(url).toBe('https://bitbucket.example.com/rest/api/latest/projects/PROJECT-123');
  });

  it('should handle base URL with trailing slashes', () => {
    const url = buildApiUrl('https://bitbucket.example.com//', '1.0', 'projects');
    expect(url).toBe('https://bitbucket.example.com/rest/api/1.0/projects');
  });

  it('should handle endpoint with leading slashes', () => {
    const url = buildApiUrl('https://bitbucket.example.com', '1.0', '/projects');
    expect(url).toBe('https://bitbucket.example.com/rest/api/1.0/projects');
  });

  it('should handle both base URL and endpoint with slashes', () => {
    const url = buildApiUrl('https://bitbucket.example.com/', 'latest', '/projects/TEST-1');
    expect(url).toBe('https://bitbucket.example.com/rest/api/latest/projects/TEST-1');
  });
});

describe('convertApiPath', () => {
  it('should convert API latest path to 1.0', () => {
    const path = convertApiPath('/rest/api/latest/projects/PROJECT-123', '1.0');
    expect(path).toBe('/rest/api/1.0/projects/PROJECT-123');
  });

  it('should convert API 1.0 path to latest', () => {
    const path = convertApiPath('/rest/api/1.0/projects', 'latest');
    expect(path).toBe('/rest/api/latest/projects');
  });

  it('should not convert Agile API paths', () => {
    const path = convertApiPath('/agile/1.0/board', '1.0');
    expect(path).toBe('/agile/1.0/board');
  });

  it('should not convert Service Desk API paths', () => {
    const path = convertApiPath('/rest/servicedesk/1/customer', '1.0');
    expect(path).toBe('/rest/servicedesk/1/customer');
  });

  it('should convert Data Center API paths', () => {
    const path = convertApiPath('/rest/api/1.0/admin/cluster/nodes', 'latest');
    expect(path).toBe('/rest/api/latest/admin/cluster/nodes');
  });

  it('should not convert non-API paths', () => {
    const path = convertApiPath('/some/other/path', '1.0');
    expect(path).toBe('/some/other/path');
  });
});

describe('extractApiVersion', () => {
  it('should extract API 1.0 from path', () => {
    const version = extractApiVersion('/rest/api/1.0/projects');
    expect(version).toBe('1.0');
  });

  it('should extract API latest from path', () => {
    const version = extractApiVersion('/rest/api/latest/projects/PROJECT-123');
    expect(version).toBe('latest');
  });

  it('should extract API version from full URL', () => {
    const version = extractApiVersion('https://bitbucket.example.com/rest/api/1.0/projects');
    expect(version).toBe('1.0');
  });

  it('should return null for paths without API version', () => {
    const version = extractApiVersion('/agile/1.0/board');
    expect(version).toBeNull();
  });

  it('should return null for non-API paths', () => {
    const version = extractApiVersion('/some/other/path');
    expect(version).toBeNull();
  });
});

describe('needsApiVersion', () => {
  it('should return true for /rest/api/1.0/ paths', () => {
    expect(needsApiVersion('/rest/api/1.0/projects')).toBe(true);
  });

  it('should return true for /rest/api/latest/ paths', () => {
    expect(needsApiVersion('/rest/api/latest/projects')).toBe(true);
  });

  it('should return false for Agile API paths', () => {
    expect(needsApiVersion('/agile/1.0/board')).toBe(false);
  });

  it('should return false for Service Desk API paths', () => {
    expect(needsApiVersion('/rest/servicedesk/1')).toBe(false);
  });

  it('should return false for non-API paths', () => {
    expect(needsApiVersion('/some/other/path')).toBe(false);
  });
});

describe('buildFullUrl', () => {
  const baseUrl = 'https://bitbucket.example.com';

  it('should build URL for standard REST API path with default version', () => {
    const url = buildFullUrl(baseUrl, 'projects/PROJECT-123', '1.0');
    expect(url).toBe('https://bitbucket.example.com/rest/api/1.0/projects/PROJECT-123');
  });

  it('should preserve explicit API version in path', () => {
    const url = buildFullUrl(baseUrl, '/rest/api/latest/projects', '1.0');
    expect(url).toBe('https://bitbucket.example.com/rest/api/latest/projects');
  });

  it('should handle Agile API paths correctly', () => {
    const url = buildFullUrl(baseUrl, '/agile/1.0/board', 'latest');
    expect(url).toBe('https://bitbucket.example.com/agile/1.0/board');
  });

  it('should handle Service Desk API paths correctly', () => {
    const url = buildFullUrl(baseUrl, '/rest/servicedesk/1/customer', 'latest');
    expect(url).toBe('https://bitbucket.example.com/rest/servicedesk/1/customer');
  });

  it('should handle paths starting with /rest/ but not /rest/api/', () => {
    const url = buildFullUrl(baseUrl, '/rest/custom/endpoint', '1.0');
    expect(url).toBe('https://bitbucket.example.com/rest/custom/endpoint');
  });

  it('should handle base URL with trailing slashes', () => {
    const url = buildFullUrl('https://bitbucket.example.com/', 'projects', '1.0');
    expect(url).toBe('https://bitbucket.example.com/rest/api/1.0/projects');
  });

  it('should handle paths with leading slashes', () => {
    const url = buildFullUrl(baseUrl, '/projects', 'latest');
    expect(url).toBe('https://bitbucket.example.com/rest/api/latest/projects');
  });

  it('should use API latest when specified', () => {
    const url = buildFullUrl(baseUrl, 'projects/TEST-1', 'latest');
    expect(url).toBe('https://bitbucket.example.com/rest/api/latest/projects/TEST-1');
  });

  it('should use default API version for agile path without leading slash', () => {
    // Without leading slash, agile path is treated as a regular endpoint
    const url = buildFullUrl(baseUrl, 'agile/1.0/board', '1.0');
    expect(url).toBe('https://bitbucket.example.com/rest/api/1.0/agile/1.0/board');
  });
});
