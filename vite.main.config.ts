import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: 'src/main/main.ts',
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: [
        'electron',
        'knex',
        'better-sqlite3',
        'pg',
        'sqlite3',
        'tedious',
        'mysql',
        'mysql2',
        'oracledb',
        'pg-query-stream',
      ],
    },
  },
});
