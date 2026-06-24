/**
 * Best-effort refresh of connected sources (A3) so Forge sees recent activity.
 *
 * Without a background sync worker in the local stack, newly-recorded Strava /
 * Whoop activity only lands when a sync is triggered. We do that once per app
 * session (on Home load) so the AI's context — and the chat answers grounded in
 * it — reflect what the athlete actually did, not a stale snapshot. Syncs are
 * idempotent server-side (deduped by external id), so this never duplicates data.
 */

import { agentApi } from "@/lib/api/agent";

let syncedThisSession = false;

export async function syncConnectedSources(): Promise<void> {
  if (syncedThisSession) return;
  syncedThisSession = true;
  try {
    const { items } = await agentApi.listSources();
    await Promise.all(
      items.filter((s) => s.on).map((s) => agentApi.syncSource(s.id).catch(() => undefined)),
    );
  } catch {
    // Allow a retry on the next mount if even listing the sources failed.
    syncedThisSession = false;
  }
}
