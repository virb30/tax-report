import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import jestPlugin from 'eslint-plugin-jest';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...tsPlugin.configs['recommended-type-checked'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],
    },
  },
  {
    files: ['src/renderer/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/main/**',
                '**/preload/**',
                '**/ipc/contracts/**',
                '**/ipc/main/**',
                '**/ipc/renderer/**',
              ],
              message: 'Renderer must only import from the public IPC boundary (src/ipc/public).',
            },
            {
              group: ['**/shared/types/**'],
              message: 'Renderer must not import from shared types. Use the public IPC boundary instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/main/**/application/**/*',
      'src/main/**/domain/**/*',
      'src/main/**/infra/repositories/**/*',
      'src/main/**/infra/parsers/**/*',
      'src/main/**/infra/handlers/**/*',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ipc/**'],
              message:
                'Application, Domain, and core Infrastructure layers must not import from the IPC module. Transport handlers should map IPC DTOs to application models.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/*.e2e.test.tsx'],
    plugins: {
      jest: jestPlugin,
    },
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      'jest/unbound-method': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    ignores: [
      'scripts/**',
      'out/**',
      '.vite/**',
      'coverage/**',
      'src/main/app/infra/database/migrations/**',
    ],
  },
]);
