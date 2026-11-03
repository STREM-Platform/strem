/**
 * Session restore (#2): check stored tokens against the services on launch.
 *
 * Only a refused session (`SessionExpiredError`, or 401/403) clears the tokens and
 * signs out. A network failure, timeout or server error keeps them and reports
 * `unavailable`, so the app shows a retry screen instead of the login form and
 * still grants no access until identity, onboarding and legal status are known.
 */

import { api, ApiError, SessionExpiredError } from "@/lib/api/client";
import type { AuthIdentity } from "@/lib/api/types";
import { clearTokens, getStoredTokens } from "@/lib/session/tokens";

/** Whether a restore failure means the stored session itself was refused. */
export function isRefusedSession(error: unknown): boolean {
  return (
    error instanceof SessionExpiredError ||
    (error instanceof ApiError && (error.status === 401 || error.status === 403))
  );
}

export type Restored =
  | { phase: "signedOut" | "unavailable" }
  | { phase: "signedIn"; user: AuthIdentity; onboardingCompleted: boolean; legalAccepted: boolean };

/** Check the stored session against the services; clears it only when refused. */
export async function checkStoredSession(): Promise<Restored> {
  if (!(await getStoredTokens())) {
    return { phase: "signedOut" };
  }
  try {
    const user = await api.getMe();
    const [onboarding, legal] = await Promise.all([api.getOnboardingStatus(), api.getLegalStatus()]);
    return {
      phase: "signedIn",
      user,
      onboardingCompleted: onboarding.completed,
      legalAccepted: !legal.needs_acceptance,
    };
  } catch (error) {
    if (isRefusedSession(error)) {
      await clearTokens();
      return { phase: "signedOut" };
    }
    return { phase: "unavailable" }; // keep the tokens; the athlete can retry
  }
}
