/**
 * Module Concurrents — types partagés entre la collecte (job) et l'écriture.
 * Le verdict et les actions vivent côté dashboard ; ici, uniquement des faits.
 */
import type { DomainCategory } from './classify.js';

export type SerpItemType = 'organic' | 'local_pack';

export interface SerpItem {
  position: number;
  type: SerpItemType;
  domain: string;
  url: string;
  title: string;
  /** Pack local : note et nombre d'avis de la fiche. */
  rating: number | null;
  votes: number | null;
}

export type QuerySource = 'gsc' | 'cluster' | 'service';

export interface QueryCandidate {
  query: string;
  source: QuerySource;
  /** Impressions GSC sur 28 j (0 pour une requête qui ne vient pas de GSC). */
  impressions: number;
}

export interface PageFactsLite {
  status: number;
  words: number;
  h1: string;
  h2_count: number;
  faq_count: number;
  schema_types: string[];
}

export interface ReferringDomain {
  domain: string;
  rank: number;
  backlinks: number;
  first_seen: string | null;
  category: DomainCategory;
}

export interface DomainSummary {
  rank: number;
  backlinks: number;
  referring_domains: number;
  first_seen: string | null;
}

export type CompetitorKind = 'direct' | 'annuaire' | 'reseau';
export type CompetitorStatus = 'suggested' | 'active' | 'ignored';

export interface CompetitorRow {
  id: string;
  site_key: string;
  domain: string;
  label: string | null;
  kind: CompetitorKind;
  status: CompetitorStatus;
  origin: 'manual' | 'serp';
  serp_hits: number;
}

export interface SerpRowInsert {
  run_id: string;
  site_key: string;
  query: string;
  query_source: QuerySource;
  impressions: number;
  position: number;
  type: SerpItemType;
  domain: string;
  url: string;
  title: string;
  rating: number | null;
  votes: number | null;
  is_ours: boolean;
  fetched_at: string;
}

export interface SnapshotInsert {
  run_id: string;
  site_key: string;
  domain: string;
  is_self: boolean;
  sitemap_reached: boolean;
  sitemap_urls: string[];
  new_urls: string[];
  referring_domains: number | null;
  referring_domains_clean: number | null;
  backlink_rank: number | null;
  domain_first_seen: string | null;
  referring: ReferringDomain[];
  page_facts: Record<string, PageFactsLite>;
  serp_top10: number;
  serp_avg_pos: number | null;
  pack_hits: number;
  rating: number | null;
  votes: number | null;
  fetched_at: string;
}
