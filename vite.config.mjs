import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite's HTML fallback needs the explicit index for a URL without a trailing
// slash. Static hosts serve the built delete-account/index.html directory entry.
function serveAccountDeletion(server) {
  server.middlewares.use((request, _response, next) => {
    request.url = request.url.replace(/^\/delete-account(?=\?|$)/, '/delete-account/index.html');
    next();
  });
}

export default defineConfig(() => {
  return {
    build: {
      outDir: 'build',
      // A separate entry keeps email-link deletion outside the signed-in app.
      // Emit a real directory index so static hosting can serve the link directly.
      rolldownOptions: {
        input: {
          station: 'index.html',
          deleteAccount: 'delete-account/index.html',
        },
      },
      // Let Vite split dependencies: the old node_modules path splitter grouped
      // pnpm packages into one .pnpm chunk, pulling lazy PDF dependencies into boot.
    },
    plugins: [react(), {
      name: 'account-deletion-entry',
      configureServer: serveAccountDeletion,
      configurePreviewServer: serveAccountDeletion,
    }],
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
