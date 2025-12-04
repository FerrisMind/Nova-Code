const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const svelte = require('eslint-plugin-svelte');
const svelteParser = require('svelte-eslint-parser');
const prettier = require('eslint-plugin-prettier');
const eslintConfigPrettier = require('eslint-config-prettier');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: [
      'node_modules',
      'build',
      'dist',
      '.svelte-kit',
      'coverage',
      'src-tauri/target',
      'eslint.config.cjs',
      'samples',
      'scripts',
      'svelte.config.js',
      'vite.config.js',
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        queueMicrotask: 'readonly',
        HTMLElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLSpanElement: 'readonly',
        FileList: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        FocusEvent: 'readonly',
        FocusEventInit: 'readonly',
        ResizeObserver: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        PointerEvent: 'readonly',
        DOMParser: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        HTMLImageElement: 'readonly',
        Event: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        DragEvent: 'readonly',
        WheelEvent: 'readonly',
        HTMLButtonElement: 'readonly',
      },
    },
  },
  js.configs.recommended,
  // Базовые правила для TS без type-check (не требует project)
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: null,
      },
    },
    plugins: { prettier },
    rules: {
      'prettier/prettier': 'error',
    },
  },
  // Svelte с передачей project в TS-парсер и отключением type-checked правил
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        project: null,
        extraFileExtensions: ['.svelte'],
        parser: {
          ts: tseslint.parser,
        },
      },
      globals: {
        $$Generic: 'readonly',
      },
    },
    plugins: { prettier },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-array-delete': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-floating-promises': 'off'
    },
  },
  eslintConfigPrettier,
];
