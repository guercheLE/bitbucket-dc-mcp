import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        hookTimeout: 60000, // 60s for setup hooks (e2e tests need time to start servers)
        testTimeout: 30000, // 30s for individual tests
        // By default, only run unit tests
        // Integration and E2E tests are opt-in via environment variables
        include: process.env.RUN_INTEGRATION_TESTS || process.env.RUN_E2E_TESTS
            ? ['tests/**/*.test.ts']
            : ['tests/unit/**/*.test.ts', 'tests/benchmarks/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'dist/', 'tests/'],
        },
    },
});
