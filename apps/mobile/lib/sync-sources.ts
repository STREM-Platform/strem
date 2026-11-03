/**
 * Best-effort refresh of connected sources once per app session, so the plan
 * tracker and the race team see the latest activities. Syncs are idempotent
 * server-side (deduplicated by provider activity id).
 */

import { sourcesApi } from "@/lib/api/race";

let syncedThisSession = false;

export async function syncConnectedSources(): Promise<number> {
  if (syncedThisSession) return 0;
  syncedThisSession = true;
  try {
    const sources = await sourcesApi.list();
    const results = await Promise.all(
      sources.filter((s) => s.on).map((s) => sourcesApi.sync(s.id).catch(() => ({ synced_sessions: 0, synced_recovery: 0 }))),
    );
    return results.reduce((sum, r) => sum + r.synced_sessions, 0);
  } catch {
    // Allow a retry on the next launch if even listing the sources failed.
    syncedThisSession = false;
    return 0;
  }
}
