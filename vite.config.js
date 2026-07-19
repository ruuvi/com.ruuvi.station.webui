import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    build: {
      outDir: 'build',
      rolldownOptions: {
        output: {
          manualChunks(id) {
            // keep dynamically imported date-fns locales out of the vendor
            // chunk so only the active locale is fetched
            if (id.includes('date-fns/locale')) return undefined;
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
