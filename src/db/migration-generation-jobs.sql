-- Journal de progression des briefs et des générations de page (dashboard).
-- Additive : ne touche aucune table existante. Une ligne par tâche lancée,
-- ses étapes dans `steps`, mises à jour par la route pendant qu'elle travaille ;
-- le navigateur la lit en polling. `automation_logs` garde la trace finale.

create table if not exists generation_jobs (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('brief', 'page')),
  site_key    text,
  page_id     uuid,
  cluster_id  uuid,
  status      text not null default 'running' check (status in ('running', 'success', 'error')),
  steps       jsonb not null default '[]'::jsonb,  -- [{ key, label, status, started_at, ended_at, note }]
  result      jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_generation_jobs_created on generation_jobs (created_at desc);
create index if not exists idx_generation_jobs_page    on generation_jobs (page_id);
create index if not exists idx_generation_jobs_cluster on generation_jobs (cluster_id);

comment on table generation_jobs is
  'Progression d''un brief ou d''une génération de page : étapes horodatées écrites par la route, lues par le dashboard en polling.';
