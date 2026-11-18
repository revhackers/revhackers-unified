import { defineConfig } from 'vitest/config';
import path from 'path';
import blogIndexPlugin from './build/blogIndexPlugin.ts';

export default defineConfig({
  plugins: [blogIndexPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.test.{js,mjs,ts,tsx}',
    ],
    setupFiles: [],
    coverage: {
      reporter: ['text', 'json-summary'],
      include: [
        'src/services/**',
        'src/lib/**',
        'src/utils/**',
        'src/types/**',
      ],
    },
  },
});
