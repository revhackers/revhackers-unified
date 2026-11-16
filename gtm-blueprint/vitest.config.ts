import { defineConfig } from 'vitest/config';

// Config própria: sem ela o vitest herda o config do site (jsdom, só src/ do root) e não roda worker/.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
  },
});
