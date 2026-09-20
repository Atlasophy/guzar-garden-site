import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootAlias = { '@': fileURLToPath(new URL('.', import.meta.url)) };

export default defineConfig({
  resolve: {
    alias: rootAlias,
  },
  test: {
    projects: [
      {
        resolve: { alias: rootAlias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        resolve: { alias: rootAlias },
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          fileParallelism: false,
          testTimeout: 90_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
