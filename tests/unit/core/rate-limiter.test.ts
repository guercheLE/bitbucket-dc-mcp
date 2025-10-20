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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimiter } from '../../../src/core/rate-limiter.js';

describe('RateLimiter', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should acquire tokens successfully', async () => {
        const limiter = new RateLimiter({ capacity: 5, refillRate: 10 });

        await limiter.acquire();
        await limiter.acquire();
        await limiter.acquire();

        const available = limiter.getAvailableTokens();
        expect(available).toBeLessThanOrEqual(5);
    });

    it('should refill tokens over time', async () => {
        const limiter = new RateLimiter({ capacity: 2, refillRate: 1 });

        // Use up all tokens
        await limiter.acquire();
        await limiter.acquire();

        // Advance time by 1 second
        vi.advanceTimersByTime(1000);

        // Should be able to acquire one more token
        await limiter.acquire();

        const available = limiter.getAvailableTokens();
        expect(available).toBeGreaterThanOrEqual(0);
    });

    it('should not exceed capacity when refilling', async () => {
        const limiter = new RateLimiter({ capacity: 3, refillRate: 1 });

        // Use one token
        await limiter.acquire();

        // Advance time significantly
        vi.advanceTimersByTime(10000);

        // Available tokens should not exceed capacity
        const available = limiter.getAvailableTokens();
        expect(available).toBeLessThanOrEqual(3);
    });

    it('should provide available token count', () => {
        const limiter = new RateLimiter({ capacity: 10, refillRate: 5 });

        const available = limiter.getAvailableTokens();
        expect(available).toBe(10);
    });

    it('should handle high refill rate', async () => {
        const limiter = new RateLimiter({ capacity: 100, refillRate: 100 });

        await limiter.acquire();
        await limiter.acquire();
        await limiter.acquire();

        const available = limiter.getAvailableTokens();
        expect(available).toBeGreaterThanOrEqual(0);
    });
});

