export default {
  testEnvironment: 'node',
  transform: {},
  setupFiles: ['./tests/env.cjs'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  testTimeout: 30_000,
};
