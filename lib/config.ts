/**
 * Runtime configuration for the STREM mobile app.
 *
 * The API base URL is configurable so the same build can point at local
 * development, staging, or production. It targets the STREM API gateway, which
 * routes to the auth, user, and domain services under a single `/v1` base
 * (see `strem-docs/architecture/service-map.md`). Set `EXPO_PUBLIC_API_URL` to
 * override; the default is the local gateway port.
 */

const DEFAULT_API_URL = "http://localhost:8000/v1";

export const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

/**
 * Strava connect (A3). The client id and redirect URI are **public** OAuth
 * parameters (never the client secret — that stays server-side in
 * strem-training-service). Set `EXPO_PUBLIC_STRAVA_CLIENT_ID` to your Strava app
 * id; the redirect URI must sit on the "Authorization Callback Domain" configured
 * in that app (use `localhost` for local web testing).
 */
export const STRAVA_CLIENT_ID: string = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ?? "";

/**
 * Where Strava sends the user back with `?code=`. On web we use the app's *own*
 * origin + `/integrations`, so it (a) matches whatever port Expo actually serves
 * on — important when 8081 is taken (e.g. by Jenkins) and Expo bumps to 8082 —
 * and (b) lands back on the Connected-sources screen, which auto-reads the code.
 * Strava only validates the callback *domain* (`localhost`), so the port is free.
 * On native, an env deep link is used.
 */
export function stravaRedirectUri(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/integrations`;
  }
  return process.env.EXPO_PUBLIC_STRAVA_REDIRECT_URI ?? "strem://integrations";
}

/** Build the Strava authorization URL the user approves to grant read access. */
export function stravaAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: stravaRedirectUri(),
    response_type: "code",
    approval_prompt: "auto",
    // Routes (training#19) need read_all; activities need activity:read_all.
    scope: "read_all,activity:read_all",
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/** Pull the `code` out of a pasted redirect URL, or pass through a raw code. */
export function extractOAuthCode(pasted: string): string {
  const trimmed = pasted.trim();
  const match = trimmed.match(/[?&]code=([^&\s]+)/);
  return match ? decodeURIComponent(match[1]) : trimmed;
}
