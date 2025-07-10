import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        '**/*.ts',
      ],
      exclude: ['**/dist/**', '**/build/**', '**/migrations/**'],
    },
    typecheck: {
      tsconfig: './tsconfig.json',
    },
  },
})
