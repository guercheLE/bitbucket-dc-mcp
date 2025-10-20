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
  ComponentUnavailableError,
  CredentialStorageError,
  CredentialStorageErrorCodes,
  DatabaseError,
  DegradedModeError,
  ModelLoadError,
  ValidationError,
} from '../../../src/core/errors.js';

describe('Custom Error Classes', () => {
  describe('ModelLoadError', () => {
    it('should create error with message', () => {
      const error = new ModelLoadError('Failed to load model');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ModelLoadError);
      expect(error.message).toBe('Failed to load model');
      expect(error.name).toBe('ModelLoadError');
    });

    it('should support error cause', () => {
      const cause = new Error('Original error');
      const error = new ModelLoadError('Failed to load model', { cause });

      expect(error.cause).toBe(cause);
    });
  });

  describe('DatabaseError', () => {
    it('should create error with message', () => {
      const error = new DatabaseError('Database connection failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.message).toBe('Database connection failed');
      expect(error.name).toBe('DatabaseError');
    });
  });

  describe('ValidationError', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('CredentialStorageError', () => {
    it('should create error with code and message', () => {
      const error = new CredentialStorageError(
        CredentialStorageErrorCodes.KEYCHAIN_UNAVAILABLE,
        'Keychain not available',
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CredentialStorageError);
      expect(error.name).toBe('CredentialStorageError');
      expect(error.code).toBe('KEYCHAIN_UNAVAILABLE');
      expect(error.message).toBe('Keychain not available');
    });

    it('should include details if provided', () => {
      const details = { platform: 'linux', reason: 'keytar unavailable' };
      const error = new CredentialStorageError(
        CredentialStorageErrorCodes.ENCRYPTION_FAILED,
        'Encryption failed',
        details,
      );

      expect(error.details).toEqual(details);
    });

    it('should work with all error codes', () => {
      Object.values(CredentialStorageErrorCodes).forEach((code) => {
        const error = new CredentialStorageError(code, 'Test message');
        expect(error.code).toBe(code);
      });
    });
  });

  describe('ComponentUnavailableError', () => {
    it('should create error with component and message', () => {
      const error = new ComponentUnavailableError(
        'embeddings-db',
        'Embeddings database unavailable',
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ComponentUnavailableError);
      expect(error.name).toBe('ComponentUnavailableError');
      expect(error.component).toBe('embeddings-db');
      expect(error.message).toBe('Embeddings database unavailable');
      expect(error.code).toBe('COMPONENT_UNAVAILABLE');
      expect(error.statusCode).toBe(503);
    });

    it('should include recovery action if provided', () => {
      const error = new ComponentUnavailableError(
        'embeddings-db',
        'Database unavailable',
        'Run npm run populate-db to initialize',
      );

      expect(error.recoveryAction).toBe('Run npm run populate-db to initialize');
    });
  });

  describe('DegradedModeError', () => {
    it('should create error with component, message, and available features', () => {
      const features = ['get-id', 'call-id'];
      const error = new DegradedModeError('semantic-search', 'Search unavailable', features);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DegradedModeError);
      expect(error.name).toBe('DegradedModeError');
      expect(error.component).toBe('semantic-search');
      expect(error.message).toBe('Search unavailable');
      expect(error.availableFeatures).toEqual(features);
      expect(error.code).toBe('DEGRADED_MODE');
      expect(error.statusCode).toBe(503);
    });

    it('should work with empty available features list', () => {
      const error = new DegradedModeError('all', 'System down', []);

      expect(error.availableFeatures).toEqual([]);
    });
  });
});
