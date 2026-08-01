import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Vite 8 / Rolldown: replace deprecated rollupOptions.output.manualChunks.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // Claim shared vendors first; Rolldown recursively captures group
            // dependencies, so later groups would otherwise swallow React.
            {
              name: 'react-vendor',
              test: /node_modules[/\\](react-dom|react[/\\]|scheduler)/,
            },
            {
              name: 'monaco',
              test: /node_modules[/\\](monaco-editor|@patternfly[/\\]react-code-editor)/,
            },
            {
              name: 'patternfly',
              test: /node_modules[/\\]@patternfly/,
            },
          ],
        },
      },
    },
  },
});
