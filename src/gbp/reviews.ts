import { callApi, callApiGet } from '../keywords/dataforseo.js';
import * as logger from '../utils/logger.js';
import type { ReviewFacts } from './types.js';

/**
 * `business_data/google/reviews` — asynchrone chez DataForSEO : on pose une
 * tâche (`task_post`), on relit (`task_get`) quand elle est prête. 0,00075 $
 * par 10 avis. Le job attend un peu ; une tâche pas prête est gardée dans
 * `gbp_listings.pending_reviews_task` et relue au passage suivant.
 *
 * `task_post` n'est volontairement PAS mis en cache (poser deux fois la même
 * tâche n'a pas de sens, et la relecture a son propre identifiant).
 */

interface PostEnvelope {
  cost?: number;
  tasks?: Array<{ id?: string; status_code?: number; status_message?: string }>;
}

interface RawReview {
  review_id?: string;
  rating?: { value?: number } | null;
  review_text?: string | null;
  timestamp?: string | null;
  profile_name?: string | null;
  owner_answer?: string | null;
}

interface GetEnvelope {
  cost?: number;
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    result?: Array<{ items?: RawReview[]; reviews_count?: number }> | null;
  }>;
}

export async function postReviewsTask(cid: string, location: string, depth = 20): Promise<string> {
  const body = [{ cid, location_name: location, language_code: 'fr', depth, sort_by: 'newest' }];
  // Sans cache : un identifiant de tâche de la semaine passée serait périmé.
  const data = await callApi<PostEnvelope>('/business_data/google/reviews/task_post', body, 2, {
    ttlDays: 0,
  });
  const task = data.tasks?.[0];
  if (!task?.id || (task.status_code && task.status_code >= 40000)) {
    throw new Error(`reviews task_post : ${task?.status_code} ${task?.status_message ?? ''}`);
  }
  return task.id;
}

/** `null` = pas encore prête. */
export async function getReviewsTask(
  taskId: string,
): Promise<{ reviews: ReviewFacts[]; total: number | null; cost: number } | null> {
  const data = await callApiGet<GetEnvelope>(`/business_data/google/reviews/task_get/${taskId}`);
  const task = data.tasks?.[0];
  if (!task) return null;
  // 40602 = « Task In Queue », 40601 = « Task Handed » : on repasse plus tard.
  if (task.status_code === 40602 || task.status_code === 40601) return null;
  if (task.status_code && task.status_code !== 20000) {
    throw new Error(`reviews task_get : ${task.status_code} ${task.status_message ?? ''}`);
  }
  const res = task.result?.[0];
  const reviews: ReviewFacts[] = (res?.items ?? [])
    .filter((r) => r.review_id)
    .map((r) => ({
      review_id: String(r.review_id),
      author: r.profile_name ?? null,
      rating: r.rating?.value ?? null,
      text: r.review_text ?? null,
      published_at: r.timestamp ?? null,
      owner_reply: r.owner_answer ?? null,
    }));
  return { reviews, total: res?.reviews_count ?? null, cost: data.cost ?? 0 };
}

/** Pose la tâche puis attend jusqu'à `maxWaitMs` ; rend aussi l'id pour une relecture différée. */
export async function fetchReviews(
  cid: string,
  location: string,
  maxWaitMs = 120_000,
): Promise<{ taskId: string; result: Awaited<ReturnType<typeof getReviewsTask>> }> {
  const taskId = await postReviewsTask(cid, location);
  const started = Date.now();
  let delay = 8_000;
  while (Date.now() - started < maxWaitMs) {
    await new Promise((r) => setTimeout(r, delay));
    const result = await getReviewsTask(taskId);
    if (result) return { taskId, result };
    delay = Math.min(delay * 1.5, 30_000);
  }
  logger.warn(
    `Avis ${cid} : tâche ${taskId} pas prête après ${Math.round(maxWaitMs / 1000)} s, relue au prochain passage`,
  );
  return { taskId, result: null };
}
