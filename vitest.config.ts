import { defineConfig } from 'vitest/config';

// Les tests vivent à côté du code (`foo.test.ts` près de `foo.ts`) et ne
// touchent ni Supabase ni le réseau : ils couvrent le code pur (crawler, slug,
// classification d'intention, découpage de dates…).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'config/**/*.test.ts', 'scripts/*.test.ts'],
    environment: 'node',
    // Un test qui se met à parler au réseau est un test cassé : il doit échouer vite.
    testTimeout: 5000,
  },
});
