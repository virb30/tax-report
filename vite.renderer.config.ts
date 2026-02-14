import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { rendererAlias } from './vite.config.mjs';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: rendererAlias,
  },
});
