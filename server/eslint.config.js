import js from '@eslint/js';

const nodeGlobals = {
  Buffer: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  process: 'readonly',
  setTimeout: 'readonly',
};

export default [
  { ignores: ['node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...nodeGlobals,
        afterAll: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        expect: 'readonly',
        test: 'readonly',
      },
    },
  },
  {
    files: ['tests/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: nodeGlobals },
  },
];
