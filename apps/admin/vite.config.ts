/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vite';

// Testing Library hat kein exports-Feld; Vitest nähme sonst den CJS-Build,
// dessen require('react-dom') an dedupe vorbei das Root-react-dom lädt.
const testingLibraryEsm = path.join(
  path.dirname(createRequire(import.meta.url).resolve('@testing-library/react')),
  '@testing-library/react.esm.js',
);

// Im Dev-Betrieb leitet Vite /api an das lokale Backend weiter: Web-App und
// API teilen sich so einen Ursprung, und das SameSite=Strict-Sitzungscookie
// funktioniert ohne CORS. Produktiv gilt dasselbe — die gebaute App liegt
// unter derselben Domain wie /api (z. B. hinter einem Reverse Proxy).
// react-dom: Die Expo-App pinnt react-dom per Root-Override auf 19.1.0,
// React selbst ist 19.2.3 — im Browser müssen beide exakt gleich sein. Die
// Admin-App bekommt per Override (Root-package.json, „@sanime/admin“) ein
// eigenes react-dom@19.2.3 in apps/admin/node_modules; dedupe sorgt dafür,
// dass auch Pakete aus dem Root-node_modules (react-router, Testing Library)
// genau diese Kopie bekommen.
export default defineConfig({
  // Ausgeliefert unter /admin/ — im Betrieb vom Backend selbst (main.ts),
  // damit App und /api dieselbe Domain haben (SameSite=Strict-Cookie, kein CORS).
  base: '/admin/',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5174,
    proxy: {
      '/api': process.env.SANIME_API_URL ?? 'http://localhost:3000',
    },
  },
  build: {
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    globals: true,
    // Diese Pakete importieren react-dom selbst — durch Vite laufen lassen,
    // damit dedupe auch für sie greift.
    server: { deps: { inline: ['react-router', '@testing-library/react'] } },
    alias: { '@testing-library/react': testingLibraryEsm },
  },
});
