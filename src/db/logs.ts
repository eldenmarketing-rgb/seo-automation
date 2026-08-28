import { getSupabase } from './client.js';

export type LogStatus = 'success' | 'error' | 'warning' | 'info';

/**
 * Trace d'exécution dans `automation_logs` (le dashboard y lit la dernière
 * synchro GSC, le dernier crawl…). Ne lève jamais : un log qui échoue ne doit
 * pas faire tomber le job qu'il décrit.
 */
export async function log(
  jobName: string,
  action: string,
  status: LogStatus,
  siteKey?: string,
  details?: Record<string, unknown>,
  durationMs?: number,
) {
  const { error } = await getSupabase()
    .from('automation_logs')
    .insert({
      job_name: jobName,
      site_key: siteKey,
      action,
      status,
      details: details || {},
      duration_ms: durationMs,
    });
  if (error) console.error(`automation_logs: ${error.message}`);
}
