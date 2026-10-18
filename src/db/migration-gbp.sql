-- ─── Module Fiches Google (GBP) ───────────────────────────────────────────────
-- Décision du 2026-10-18 : sur les requêtes locales qui comptent, le pack local
-- décide, au-dessus de l'organique, et nos fiches n'y sont pas (Livraison de
-- Nuit 14 avis contre 245 pour le leader). Le module vit dans le dashboard
-- (`/gbp`), les faits viennent de DataForSEO, la publication reste un geste du
-- user. Lot 1 = demandes d'avis par SMS ; les tables de suivi (fiches, rangs,
-- avis, posts) arrivent au lot 2 dans ce même fichier, toujours idempotent.
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-gbp.sql

-- Demandes d'avis envoyées après une livraison (`/avis` du bot, Twilio SMS).
-- Le numéro du client est une donnée personnelle : il ne sert qu'à ne pas
-- solliciter deux fois la même personne (60 j) et s'efface à 90 j (job hebdo).
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  -- `sms` = envoyé par Twilio ; `manual` = lien donné de vive voix / autre canal.
  channel TEXT NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms', 'manual')),
  -- `sent` → `delivered` / `failed` (statut Twilio relu plus tard) ; `opted_out` = STOP reçu.
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'delivered', 'failed', 'opted_out')),
  twilio_sid TEXT,
  segments INTEGER,
  -- Qui a déclenché : chat Telegram (admin ou groupe du site).
  requested_by TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_requests_site_phone
  ON review_requests(site_key, phone_e164, sent_at DESC);

ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
-- Aucune policy : la clé anon ne lit ni n'écrit, seule la clé service passe.
