import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    build: {
      outDir: 'build',
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return id.toString().split('node_modules/')[1].split('/')[0].toString();
            }
          },
        },
      },
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
