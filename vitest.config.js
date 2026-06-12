import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Node's built-in experimental localStorage shadows jsdom's; turn it off
    execArgv: ['--no-experimental-webstorage'],
  },
});
