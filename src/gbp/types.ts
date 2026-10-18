/**
 * Module Fiches Google (GBP) — types partagés entre la collecte (job) et
 * l'écriture. Le verdict et les actions vivent côté dashboard ; ici, des faits.
 */

export interface ListingFacts {
  cid: string | null;
  place_id: string | null;
  name: string;
  primary_category: string | null;
  categories: string[];
  /** Table horaire DataForSEO (`work_time.work_hours.timetable`), telle quelle. */
  hours: unknown;
  website: string | null;
  phone: string | null;
  rating: number | null;
  votes: number | null;
  is_claimed: boolean | null;
  photos: number | null;
  raw: Record<string, unknown>;
}

export interface MapsItem {
  rank: number;
  cid: string | null;
  place_id: string | null;
  name: string;
  category: string | null;
  rating: number | null;
  votes: number | null;
}

export interface ReviewFacts {
  review_id: string;
  author: string | null;
  rating: number | null;
  text: string | null;
  published_at: string | null;
  owner_reply: string | null;
}

export interface GbpListingRow {
  id: string;
  site_key: string;
  cid: string | null;
  place_id: string | null;
  name: string | null;
  status: 'candidate' | 'confirmed' | 'ignored';
  pending_reviews_task: string | null;
  google_location: string | null;
}
