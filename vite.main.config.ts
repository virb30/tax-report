import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: 'src/main/main.ts',
      formats: ['es'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: ['electron'],
    },
  },
});
