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

import fs from 'node:fs';
import path from 'node:path';
import type { Logger as PinoLogger } from 'pino';
import { Logger } from '../core/logger.js';
import type { Operation, OperationsRepository } from '../tools/get-id-tool.js';

interface OperationsData {
  _metadata: {
    generated_at: string;
    openapi_version: string;
    bitbucket_version: string;
    total_operations: number;
    total_schemas: number;
  };
  operations: RawOperation[];
}

interface RawOperation {
  operationId: string;
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: unknown[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
  deprecated?: boolean;
}

/**
 * Repository implementation for accessing Bitbucket operation metadata.
 *
 * Reads operation data from operations.json file and provides
 * indexed access by operation ID.
 */
export class JsonOperationsRepository implements OperationsRepository {
  private readonly logger: PinoLogger;
  private operationsMap: Map<string, Operation> | null = null;

  /**
   * Creates a new JsonOperationsRepository instance.
   *
   * @param operationsFilePath - Path to operations.json file
   * @param logger - Optional logger instance
   */
  constructor(
    private readonly operationsFilePath: string,
    logger?: PinoLogger,
  ) {
    this.logger = logger ?? Logger.getInstance();
  }

  /**
   * Retrieves operation details by operation ID.
   *
   * @param operationId - The operation ID to retrieve
   * @returns Operation object or null if not found
   */
  public getOperation(operationId: string): Operation | null {
    if (!this.operationsMap) {
      this.loadOperations();
    }

    return this.operationsMap?.get(operationId) ?? null;
  }

  /**
   * Loads operations from JSON file into memory.
   * Operations are indexed by operation ID for O(1) lookups.
   */
  private loadOperations(): void {
    try {
      const absolutePath = path.resolve(this.operationsFilePath);
      const fileContent = fs.readFileSync(absolutePath, 'utf-8');
      const data = JSON.parse(fileContent) as OperationsData;

      this.operationsMap = new Map();

      for (const rawOp of data.operations) {
        const operation: Operation = {
          operationId: rawOp.operationId,
          path: rawOp.path,
          method: rawOp.method,
          summary: rawOp.summary,
          description: rawOp.description,
          tags: rawOp.tags,
          parameters: rawOp.parameters as never[],
          requestBody: rawOp.requestBody as never,
          responses: rawOp.responses as never,
          deprecated: rawOp.deprecated,
        };

        this.operationsMap.set(operation.operationId, operation);
      }

      this.logger.info(
        {
          event: 'operations_repository.loaded',
          total_operations: this.operationsMap.size,
        },
        'Operations loaded successfully',
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        {
          event: 'operations_repository.load_error',
          error_message: errorMessage,
          file_path: this.operationsFilePath,
        },
        'Failed to load operations file',
      );
      throw new Error(`Failed to load operations: ${errorMessage}`);
    }
  }

  /**
   * Returns the total number of operations available.
   *
   * @returns Total operation count
   */
  public getOperationCount(): number {
    if (!this.operationsMap) {
      this.loadOperations();
    }

    return this.operationsMap?.size ?? 0;
  }
}
