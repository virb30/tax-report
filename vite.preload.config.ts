import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: 'src/preload.ts',
      formats: ['es'],
      fileName: () => 'preload.js',
    },
    rollupOptions: {
      external: ['electron'],
    },
  },
});
