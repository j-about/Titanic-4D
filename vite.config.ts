import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { staticPagesPlugin } from './tools/vite-static-pages.ts';

const root = import.meta.dirname;

export default defineConfig({
  root,
  publicDir: 'public',
  plugins: [staticPagesPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    reportCompressedSize: false,
    rolldownOptions: {
      input: {
        index: resolve(root, 'index.html'),
        about: resolve(root, 'about/index.html'),
        legalNotice: resolve(root, 'legal-notice/index.html'),
        narrative: resolve(root, 'narrative/index.html'),
      },
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
