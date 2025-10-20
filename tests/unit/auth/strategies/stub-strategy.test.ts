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

import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthConfig, Credentials } from '../../../../src/auth/auth-strategy.js';
import { StubStrategy } from '../../../../src/auth/strategies/stub-strategy.js';

describe('StubStrategy', () => {
  let stubStrategy: StubStrategy;

  beforeEach(() => {
    stubStrategy = new StubStrategy();
  });

  describe('authenticate', () => {
    it('should return OAuth2 credentials with tokens and expiration', async () => {
      const config: AuthConfig = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
      };

      const credentials = await stubStrategy.authenticate(config);

      expect(credentials.bitbucket_url).toBe(config.bitbucket_url);
      expect(credentials.auth_method).toBe('oauth2');
      expect(credentials.access_token).toBe('stub_oauth2_access_token');
      expect(credentials.refresh_token).toBe('stub_oauth2_refresh_token');
      expect(credentials.expires_at).toBeInstanceOf(Date);
      expect(credentials.expires_at!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return PAT credentials with access token', async () => {
      const config: AuthConfig = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
      };

      const credentials = await stubStrategy.authenticate(config);

      expect(credentials.bitbucket_url).toBe(config.bitbucket_url);
      expect(credentials.auth_method).toBe('pat');
      expect(credentials.access_token).toBe('stub_pat_token');
      expect(credentials.refresh_token).toBeUndefined();
    });

    it('should return OAuth1 credentials with all OAuth1 fields', async () => {
      const config: AuthConfig = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
      };

      const credentials = await stubStrategy.authenticate(config);

      expect(credentials.bitbucket_url).toBe(config.bitbucket_url);
      expect(credentials.auth_method).toBe('oauth1');
      expect(credentials.consumer_key).toBe('stub_consumer_key');
      expect(credentials.consumer_secret).toBe('stub_consumer_secret');
      expect(credentials.oauth_token).toBe('stub_oauth_token');
      expect(credentials.oauth_token_secret).toBe('stub_oauth_token_secret');
    });

    it('should return Basic auth credentials with username and password', async () => {
      const config: AuthConfig = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
      };

      const credentials = await stubStrategy.authenticate(config);

      expect(credentials.bitbucket_url).toBe(config.bitbucket_url);
      expect(credentials.auth_method).toBe('basic');
      expect(credentials.username).toBe('stub_user');
      expect(credentials.password).toBe('stub_password');
    });
  });

  describe('refreshToken', () => {
    it('should refresh OAuth2 credentials with new tokens', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: 'old_access_token',
        refresh_token: 'old_refresh_token',
        expires_at: new Date(Date.now() - 1000), // expired
      };

      const refreshed = await stubStrategy.refreshToken(credentials);

      expect(refreshed.bitbucket_url).toBe(credentials.bitbucket_url);
      expect(refreshed.auth_method).toBe('oauth2');
      expect(refreshed.access_token).toBe('stub_refreshed_access_token');
      expect(refreshed.refresh_token).toBe('stub_refreshed_refresh_token');
      expect(refreshed.expires_at).toBeInstanceOf(Date);
      expect(refreshed.expires_at!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw error when refreshing PAT credentials', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'pat_token',
      };

      await expect(stubStrategy.refreshToken(credentials)).rejects.toThrow(
        'pat does not support token refresh',
      );
    });

    it('should throw error when refreshing Basic credentials', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'user',
        password: 'pass',
      };

      await expect(stubStrategy.refreshToken(credentials)).rejects.toThrow(
        'basic does not support token refresh',
      );
    });

    it('should throw error when refreshing OAuth1 credentials', async () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: 'key',
        consumer_secret: 'secret',
        oauth_token: 'token',
        oauth_token_secret: 'token_secret',
      };

      await expect(stubStrategy.refreshToken(credentials)).rejects.toThrow(
        'oauth1 does not support token refresh',
      );
    });
  });

  describe('validateCredentials', () => {
    it('should validate OAuth2 credentials with access token', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: 'valid_token',
        expires_at: new Date(Date.now() + 3600 * 1000),
      };

      expect(stubStrategy.validateCredentials(credentials)).toBe(true);
    });

    it('should invalidate OAuth2 credentials with expired token', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: 'valid_token',
        expires_at: new Date(Date.now() - 1000), // expired
      };

      expect(stubStrategy.validateCredentials(credentials)).toBe(false);
    });

    it('should invalidate OAuth2 credentials without access token', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth2',
        access_token: '',
      };

      expect(stubStrategy.validateCredentials(credentials)).toBe(false);
    });

    it('should validate PAT credentials with access token', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: 'valid_pat',
      };

      expect(stubStrategy.validateCredentials(credentials)).toBe(true);
    });

    it('should invalidate PAT credentials without access token', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'pat',
        access_token: '',
      };

      expect(stubStrategy.validateCredentials(credentials)).toBe(false);
    });

    it('should validate OAuth1 credentials with all required fields', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: 'key',
        consumer_secret: 'secret',
        oauth_token: 'token',
        oauth_token_secret: 'token_secret',
      };

      expect(stubStrategy.validateCredentials(credentials)).toBe(true);
    });

    it('should invalidate OAuth1 credentials missing consumer_key', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'oauth1',
        consumer_key: '',
        consumer_secret: 'secret',
        oauth_token: 'token',
        oauth_token_secret: 'token_secret',
      };

      expect(stubStrategy.validateCredentials(credentials)).toBe(false);
    });

    it('should validate Basic credentials with username and password', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'user',
        password: 'pass',
      };

      expect(stubStrategy.validateCredentials(credentials)).toBe(true);
    });

    it('should invalidate Basic credentials without username', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: '',
        password: 'pass',
      };

      expect(stubStrategy.validateCredentials(credentials)).toBe(false);
    });

    it('should invalidate Basic credentials without password', () => {
      const credentials: Credentials = {
        bitbucket_url: 'https://bitbucket.example.com',
        auth_method: 'basic',
        username: 'user',
        password: '',
      };

      expect(stubStrategy.validateCredentials(credentials)).toBe(false);
    });
  });
});
