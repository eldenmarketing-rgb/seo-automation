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

-- ─── Lot 2 : registre des fiches et suivi hebdomadaire ────────────────────────

-- Une fiche Google par site. Proposée par le job (`candidate`) ou saisie à la
-- main (CID), puis CONFIRMÉE par le user : rien n'est dépensé chaque semaine
-- pour une fiche non confirmée (même opt-in que `competitors`).
CREATE TABLE IF NOT EXISTS gbp_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  cid TEXT,
  place_id TEXT,
  kgmid TEXT,
  name TEXT,
  primary_category TEXT,
  categories TEXT[] NOT NULL DEFAULT '{}',
  hours JSONB,
  -- Horaires affichés par le site, saisis dans le dashboard, pour l'écart avec la fiche.
  hours_expected TEXT,
  website TEXT,
  phone TEXT,
  rating NUMERIC,
  votes INTEGER,
  is_claimed BOOLEAN,
  photos INTEGER,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'confirmed', 'ignored')),
  -- `scan` = proposée par le job ; `manual` = CID saisi.
  origin TEXT NOT NULL DEFAULT 'scan',
  maps_url TEXT,
  review_url TEXT,
  -- Tâche DataForSEO « reviews » posée et pas encore relue.
  pending_reviews_task TEXT,
  last_info_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_gbp_listings_site_cid ON gbp_listings(site_key, cid);
CREATE INDEX IF NOT EXISTS idx_gbp_listings_site ON gbp_listings(site_key, status);

-- Un passage hebdo par fiche : ce que Google affiche ce jour-là.
CREATE TABLE IF NOT EXISTS gbp_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  site_key TEXT NOT NULL,
  listing_id UUID NOT NULL REFERENCES gbp_listings(id) ON DELETE CASCADE,
  name TEXT,
  primary_category TEXT,
  categories TEXT[] NOT NULL DEFAULT '{}',
  hours JSONB,
  website TEXT,
  phone TEXT,
  rating NUMERIC,
  votes INTEGER,
  is_claimed BOOLEAN,
  photos INTEGER,
  raw JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gbp_snapshots_listing ON gbp_snapshots(listing_id, fetched_at DESC);

-- Résultats Maps (pack local) sur les requêtes du site : notre rang et les
-- fiches devant nous. Une ligne par fiche et par requête et par passage.
CREATE TABLE IF NOT EXISTS gbp_rank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  site_key TEXT NOT NULL,
  query TEXT NOT NULL,
  query_source TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL,
  cid TEXT,
  place_id TEXT,
  name TEXT,
  category TEXT,
  rating NUMERIC,
  votes INTEGER,
  is_ours BOOLEAN NOT NULL DEFAULT false,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gbp_rank_site_run ON gbp_rank(site_key, run_id);

-- Avis lus sur la fiche ; la réponse proposée arrive au lot 3.
CREATE TABLE IF NOT EXISTS gbp_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES gbp_listings(id) ON DELETE CASCADE,
  site_key TEXT NOT NULL,
  review_id TEXT NOT NULL,
  author TEXT,
  rating NUMERIC,
  text TEXT,
  published_at TIMESTAMPTZ,
  owner_reply TEXT,
  reply_draft TEXT,
  reply_status TEXT NOT NULL DEFAULT 'none' CHECK (reply_status IN ('none', 'drafted', 'posted')),
  first_seen_run UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, review_id)
);

-- Posts préparés par l'outil (lot 3), à coller dans la fiche puis marqués publiés.
CREATE TABLE IF NOT EXISTS gbp_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES gbp_listings(id) ON DELETE CASCADE,
  site_key TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'update' CHECK (kind IN ('update', 'offer', 'event')),
  title TEXT,
  body TEXT NOT NULL,
  cta_url TEXT,
  image_path TEXT,
  scheduled_for DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'posted', 'dropped')),
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dernier passage du site (même convention que v_crawl_latest / v_competitor_*).
CREATE OR REPLACE VIEW v_gbp_snapshots_latest AS
  SELECT s.* FROM gbp_snapshots s
  JOIN (SELECT site_key, max(fetched_at) AS last FROM gbp_snapshots GROUP BY site_key) l
    ON l.site_key = s.site_key AND s.fetched_at >= l.last - interval '10 minutes';
CREATE OR REPLACE VIEW v_gbp_rank_latest AS
  SELECT r.* FROM gbp_rank r
  JOIN (SELECT site_key, run_id, max(fetched_at) AS last FROM gbp_rank GROUP BY site_key, run_id) l
    ON l.site_key = r.site_key AND l.run_id = r.run_id
  WHERE l.last = (SELECT max(fetched_at) FROM gbp_rank r2 WHERE r2.site_key = r.site_key);

ALTER TABLE gbp_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_rank ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_posts ENABLE ROW LEVEL SECURITY;

-- Le détecteur du backlog écrit `sources = ['gbp']` : la contrainte doit le
-- connaître AVANT le premier scan (piège du 2026-08-30 : une valeur refusée
-- vide le backlog au lieu d'ajouter des lignes).
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_sources_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_sources_check
  CHECK (sources <@ ARRAY['gsc','crawl','dataforseo','serp','cluster','backlinks','manual','keywords','competitors','gbp']::text[]);

-- ─── Lot 4 : rattachement à l'API Google Business Profile ─────────────────────
-- Le jeton OAuth vit dans un fichier du dashboard (jamais en base) ; la base ne
-- garde que les identifiants d'emplacement Google de chaque fiche confirmée.
ALTER TABLE gbp_listings ADD COLUMN IF NOT EXISTS google_account TEXT;   -- « accounts/123 »
ALTER TABLE gbp_listings ADD COLUMN IF NOT EXISTS google_location TEXT;  -- « locations/456 »
ALTER TABLE gbp_listings ADD COLUMN IF NOT EXISTS google_synced_at TIMESTAMPTZ;
-- Un avis lu par l'API porte son nom Google (`accounts/…/reviews/…`) : c'est lui qu'on répond.
ALTER TABLE gbp_reviews ADD COLUMN IF NOT EXISTS google_name TEXT;
ALTER TABLE gbp_posts ADD COLUMN IF NOT EXISTS google_name TEXT;
ALTER TABLE gbp_posts ADD COLUMN IF NOT EXISTS error TEXT;

-- ─── Lot 3 : textes de la fiche préparés par l'outil (à coller) ───────────────
ALTER TABLE gbp_listings ADD COLUMN IF NOT EXISTS description_draft TEXT;
ALTER TABLE gbp_listings ADD COLUMN IF NOT EXISTS qa_draft JSONB;

-- ─── Lot 5 : score, leaders du pack, points de vue, risques ───────────────────
-- Le rang Maps dépend d'où l'on cherche : 3 points de vue par ville (centre + 2 bords de zone).
ALTER TABLE gbp_rank ADD COLUMN IF NOT EXISTS vantage TEXT NOT NULL DEFAULT 'centre';
-- Les fiches qui dominent le pack du site, relues chaque semaine pour la comparaison critère par critère.
CREATE TABLE IF NOT EXISTS gbp_leader_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  site_key TEXT NOT NULL,
  cid TEXT NOT NULL,
  place_id TEXT,
  name TEXT,
  primary_category TEXT,
  categories TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC,
  votes INTEGER,
  photos INTEGER,
  description_len INTEGER,
  attributes_count INTEGER,
  has_website BOOLEAN,
  has_services BOOLEAN,
  qa_count INTEGER,
  pack_hits INTEGER NOT NULL DEFAULT 0,
  raw JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gbp_leaders_site ON gbp_leader_snapshots(site_key, fetched_at DESC);
CREATE OR REPLACE VIEW v_gbp_leaders_latest AS
  SELECT l.* FROM gbp_leader_snapshots l
  JOIN (SELECT site_key, max(fetched_at) AS last FROM gbp_leader_snapshots GROUP BY site_key) m
    ON m.site_key = l.site_key AND l.fetched_at >= m.last - interval '10 minutes';
ALTER TABLE gbp_leader_snapshots ENABLE ROW LEVEL SECURITY;
-- Doublons possibles de la fiche (même téléphone ou même domaine, autre CID) vus dans Maps.
ALTER TABLE gbp_listings ADD COLUMN IF NOT EXISTS duplicates JSONB;
