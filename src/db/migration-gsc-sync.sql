-- Migration : sync GSC persistante
-- Contrainte unique nécessaire à l'upsert de storeGscData (src/gsc/client.ts).
-- gsc_positions = historique des snapshots GSC, jamais écrasé.

CREATE UNIQUE INDEX IF NOT EXISTS uq_gsc_positions_snapshot
  ON gsc_positions(site_key, date, page_url, query);
