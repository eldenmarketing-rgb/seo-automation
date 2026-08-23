-- Cache DataForSEO — évite de repayer une requête déjà achetée (W0.3)
-- Additive : ne touche aucune table existante.

create table if not exists dataforseo_cache (
  cache_key   text primary key,             -- sha256(endpoint + body normalisé)
  endpoint    text not null,
  request     jsonb not null,
  response    jsonb not null,
  cost        numeric(10,5) not null default 0,
  hits        integer not null default 0,   -- nb de fois servi depuis le cache
  saved_cost  numeric(10,5) not null default 0, -- $ économisés cumulés
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index if not exists idx_dfs_cache_expires  on dataforseo_cache (expires_at);
create index if not exists idx_dfs_cache_endpoint on dataforseo_cache (endpoint, created_at desc);

comment on table dataforseo_cache is
  'Cache des réponses DataForSEO. TTL par famille d''endpoint. hits/saved_cost servent de compteur de dépenses évitées.';
