import { defineConfig } from 'vitest/config';

/** Firestore security rules tests. Run with `npm run test:rules` (starts the emulator). */
export default defineConfig({
  test: {
    include: ['firestore-tests/**/*.spec.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 15000,
  },
});
