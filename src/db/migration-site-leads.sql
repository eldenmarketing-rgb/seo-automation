-- ─── Demandes de contact des sites (formulaires) ───────────────────────────
-- Décision du 2026-10-01. Le site formation reprogrammation moteur est lancé
-- SANS numéro de téléphone : tout son parcours de conversion passe par un
-- formulaire « Recevoir le programme ». Une demande ne doit pas dépendre d'une
-- boîte mail (celle du domaine n'existe pas encore) : elle est écrite ici par
-- la route `/api/lead` du site, puis poussée sur Telegram.
--
-- Table commune à tous les sites (`site_key`) : le prochain site qui pose un
-- formulaire écrit dans la même. Volontairement pas de FK vers site_profiles —
-- une demande ne doit jamais être refusée pour une raison de registre.
--
-- La clé anon est publique (bundle des sites) : elle peut INSÉRER, rien d'autre.
-- Aucune politique SELECT / UPDATE / DELETE → un visiteur ne relit jamais les
-- demandes des autres. La lecture passe par la service key (dashboard, scripts).
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-site-leads.sql

CREATE TABLE IF NOT EXISTS site_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL CHECK (char_length(site_key) BETWEEN 1 AND 40),
  first_name TEXT NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 80),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 5 AND 200),
  -- Facultatif : laissé par ceux qui veulent être rappelés.
  phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 30),
  -- Le profil coché dans le formulaire (libellé du site, pas une énumération :
  -- chaque site pose ses propres choix).
  profile TEXT CHECK (profile IS NULL OR char_length(profile) <= 80),
  message TEXT CHECK (message IS NULL OR char_length(message) <= 2000),
  -- D'où vient la demande : page du formulaire, referrer, paramètres UTM.
  source_path TEXT CHECK (source_path IS NULL OR char_length(source_path) <= 300),
  referrer TEXT CHECK (referrer IS NULL OR char_length(referrer) <= 500),
  utm JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- `new` → `contacted` → `won` / `lost` ; `spam` pour ce qui a passé le filtre.
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'won', 'lost', 'spam')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_leads_site ON site_leads(site_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_leads_status ON site_leads(status);

COMMENT ON TABLE site_leads IS
  'Demandes laissées dans les formulaires des sites (route /api/lead). Clé anon : insertion seule.';

ALTER TABLE site_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_leads_anon_insert ON site_leads;
CREATE POLICY site_leads_anon_insert ON site_leads
  FOR INSERT TO anon
  WITH CHECK (status = 'new');

GRANT INSERT ON site_leads TO anon;
