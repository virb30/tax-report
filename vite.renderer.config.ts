import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { rendererAlias } from './vite.config';

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  plugins: [react({})],
  resolve: {
    alias: rendererAlias,
  },
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'src/renderer/index.html'),
    },
  },
});
