import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    build: {
      outDir: 'build',
      // Let Vite split dependencies: the old node_modules path splitter grouped
      // pnpm packages into one .pnpm chunk, pulling lazy PDF dependencies into boot.
    },
    plugins: [react()],
    server: {
      mimeTypes: {
        'application/javascript': ['js']
      }
    },
    optimizeDeps: {
      force: true,
      rolldownOptions: {
        moduleTypes: {
          '.js': 'jsx',
        },
      },
    },
  };
});
