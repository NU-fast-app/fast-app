// Lint rules for `npm run lint`, which CI runs on every pull request (.github/workflows/ci.yml).
// ESLint's recommended rules catch mistakes like unused variables and undefined names, and the React
// hooks rules catch hooks called conditionally (an error) and effects with missing dependencies (a warning).
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // The classic hooks rules. The plugin's newer React Compiler rules are left off, since the app
      // doesn't use the compiler and they flag patterns it relies on, like resetting state in an effect.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // `const { a, ...rest } = object` is how the code copies an object without one field.
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Node: the seed and deploy scripts, the tests and the tool configs.
  {
    files: ['scripts/**', 'tests/**', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  // The speech-to-text worker runs in a Web Worker, where `self` is the worker.
  {
    files: ['src/**/*.worker.js'],
    languageOptions: { globals: globals.worker },
  },
]);
