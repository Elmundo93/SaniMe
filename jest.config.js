module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts'],
  // apps/admin testet mit Vitest (eigene Konfiguration), apps/backend mit eigenem Jest.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/apps/'],
};
