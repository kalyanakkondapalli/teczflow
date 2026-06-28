import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@mytecz/teczflow-core': resolve(__dirname, 'packages/core/src/index.ts')
    },
    extensionAlias: {
      '.js': ['.ts', '.js']
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/__tests__/**/*.test.ts', 'packages/**/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['packages/**/src/**/*.ts'],
      exclude: ['**/__tests__/**', '**/*.test.ts', '**/dist/**']
    }
  }
});
