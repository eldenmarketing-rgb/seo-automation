-- ─── Chantiers : le carnet de bord du réseau ───────────────────────────────
-- Décision du 2026-09-06. Le backlog (`opportunities`) répond à « qu'est-ce que
-- les données détectent » : il est purgé et reconstruit à chaque scan, ses 15
-- types sont tous SEO, et une action y naît d'une preuve GSC ou d'un crawl.
--
-- Il ne peut donc pas porter ce que l'admin décide lui-même : « refaire le hero
-- de Noïa », « relancer le client pour le SIRET », « demander l'accès GSC ». Ces
-- notes vivaient jusqu'ici hors de l'outil (carnet, messages, mémoire de session)
-- et se perdaient. Une note forcée en `TECHNICAL_SEO` pollue le backlog et
-- disparaît au scan suivant : d'où une table à part, jamais touchée par un job.
--
-- Deux listes, deux vérités, un pont : `opportunity_id` garde le lien quand une
-- note s'avère être une vraie action SEO et part au backlog.
--
-- `site_key` NULL = chantier transverse (l'outil lui-même, prospection, admin).
-- Volontairement pas de FK vers site_profiles : une note peut concerner un site
-- qui n'est pas encore au registre (c'est même souvent le cas).
--
-- Exécution :
--   env -u SUPABASE_ACCESS_TOKEN npx tsx scripts/run-migration.ts src/db/migration-site-tasks.sql

CREATE TABLE IF NOT EXISTS site_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT,
  -- Ce qu'on tape à la volée : une ligne, rien d'obligatoire d'autre.
  title TEXT NOT NULL,
  -- Le détail, ajouté plus tard au tri (contexte, lien, décision prise).
  body TEXT,
  -- `inbox` = capturé, pas encore trié. C'est l'état par défaut : classer au
  -- moment de la note est exactement ce qui faisait abandonner le carnet.
  status TEXT NOT NULL DEFAULT 'inbox'
    CHECK (status IN ('inbox', 'todo', 'doing', 'blocked', 'idea', 'done', 'dropped')),
  -- Qui bloque, quand `status = 'blocked'` : « client », « moi », « google »,
  -- « vercel »… Champ libre — la moitié des chantiers en attente le sont sur
  -- quelqu'un d'autre, et ne pas savoir qui est ce qui les fait pourrir.
  blocked_by TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  due DATE,
  -- `dashboard` | `telegram` | `cli` | `seed:*` — d'où vient la note.
  source TEXT NOT NULL DEFAULT 'dashboard',
  -- Posé quand la note a été promue en action de backlog : elle reste ici en
  -- trace, le pilotage passe là-bas.
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  done_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_site_tasks_site ON site_tasks(site_key);
CREATE INDEX IF NOT EXISTS idx_site_tasks_status ON site_tasks(status);
-- Le tri de l'écran : épinglé d'abord, puis le plus récent.
CREATE INDEX IF NOT EXISTS idx_site_tasks_ordre ON site_tasks(pinned DESC, created_at DESC);

COMMENT ON TABLE site_tasks IS
  'Chantiers — ce que l''admin décide de faire, par site. Distinct du backlog (opportunities), que les scans purgent.';

-- Même fermeture que le reste du pilotage : la clé anon est publique (bundle JS
-- des sites CMS), elle n''a rien à faire ici. Service key = contourne la RLS.
ALTER TABLE site_tasks ENABLE ROW LEVEL SECURITY;
