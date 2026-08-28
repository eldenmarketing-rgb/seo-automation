# scripts/oneshot — jetable, non maintenu

Analyses par site, tests manuels, migrations déjà jouées, exports ponctuels. Ces fichiers ont
servi une fois ; ils sont gardés pour mémoire (reproduire un chiffre, relire une méthode), pas
pour être relancés.

- **Hors outillage** : exclus de `tsc`, ESLint, Prettier, knip et des hooks. Ils peuvent ne plus
  compiler (imports supprimés, `dotenv` direct, `sharp` retiré des dépendances).
- **Rien ici n'est appelé** par un cron, le dashboard, le bot ou `package.json`. Un script qui
  redevient utile remonte dans `scripts/` et passe par l'outillage (voir `docs/CONTRIBUTING.md`).
- Les scripts maintenus sont dans `scripts/` (racine) : `crawl`, `import-inventaire`,
  `publish-pages`, `serp-analyze`, `backfill-intents`, `seed-backlinks`, `setup-db`,
  `run-migration`, `check-pages`, `run`, `gsc-auth`.
