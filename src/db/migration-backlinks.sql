-- Migration : module Backlinks / Autorité
-- Catalogue de sources de liens + tracker par site.
-- Les tables directories / directory_submissions (orphelines) sont conservées ;
-- leurs lignes sont importées dans backlink_targets par scripts/seed-backlinks.ts.

CREATE TABLE IF NOT EXISTS backlink_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL DEFAULT '',
  signup_url TEXT,
  type TEXT NOT NULL DEFAULT 'annuaire'
    CHECK (type IN ('annuaire','web2','forum','institutionnel','presse','fournisseur','temoignage','gbp','autre')),
  niche TEXT,                      -- NULL = générique tous sites, sinon site_key concerné
  dr INTEGER,
  dofollow BOOLEAN,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical','high','medium','low')),
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, base_url)
);

CREATE TABLE IF NOT EXISTS backlink_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  target_id UUID REFERENCES backlink_targets(id) ON DELETE SET NULL,
  target_name TEXT NOT NULL,       -- dénormalisé : permet des cibles libres sans target_id
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo','submitted','live','indexed','rejected','skipped')),
  published_url TEXT,
  anchor_text TEXT,
  target_page TEXT,                -- page du site qui reçoit le lien
  dofollow BOOLEAN,
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_backlink_tasks_site_target
  ON backlink_tasks(site_key, target_id) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_backlink_tasks_site_status
  ON backlink_tasks(site_key, status);
