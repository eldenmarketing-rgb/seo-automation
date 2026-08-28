// ESLint 9 — configuration « flat ».
// Objectif : attraper ce que tsc ne voit pas (variables mortes, promesses oubliées,
// `any` implicites) sans ralentir : pas de règles « type-aware » ici, le typage
// complet est fait par `npm run typecheck`.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', 'scripts/oneshot/**', 'reports/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // Une variable morte est un bug en devenir ; `_x` dit explicitement « ignoré ».
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // `any` existe encore dans le code hérité : on le signale, on ne bloque pas.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Une promesse non attendue est une erreur silencieuse en prod (jobs cron).
      'no-async-promise-executor': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'smart'],
      // Toute lecture d'environnement passe par src/config/env.ts (inventaire, défauts, erreurs claires).
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.object.name='process'][object.property.name='env']",
          message: "Lire l'environnement via `env` / `requireEnv` / `readEnvByName` (src/config/env.ts).",
        },
      ],
    },
  },
  {
    files: ['src/config/env.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Les scripts `.mjs` restent en JS libre : pas de règles TypeScript.
    files: ['**/*.mjs', '**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
);
