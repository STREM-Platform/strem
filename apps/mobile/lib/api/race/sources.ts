/** Connected sources (Strava, WHOOP) and race enrichment (places, photos). */

import { request } from "../client";
import type { CoverMedia } from "../race-missions";
import { auth } from "./shared";
import { type RecoverySample } from "./athlete";

export interface PlaceResult {
  name: string;
  label: string;
  latitude: number;
  longitude: number;
  elevation_m?: number | null;
  timezone?: string | null;
  country_code?: string | null;
}

export interface PhotoCandidate extends CoverMedia {
  id: string;
  width?: number | null;
  height?: number | null;
  description?: string | null;
}

export interface IntegrationSource {
  id: string;
  label: string;
  icon: string;
  on: boolean;
  last: string;
  metric: string;
}

export const enrichApi = {
  async places(q: string): Promise<PlaceResult[]> {
    return (await request<{ items: PlaceResult[] }>(`/ai/enrich/places?q=${encodeURIComponent(q)}`, auth)).items;
  },
  async photos(params: { event?: string; location?: string; sport?: string }): Promise<PhotoCandidate[]> {
    const query = Object.entries(params)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&");
    return (await request<{ items: PhotoCandidate[] }>(`/ai/enrich/photos?${query}`, { auth: true, timeoutMs: 30000 })).items;
  },
  /** Paint a cover with the image model (#35); allowlisted accounts only. */
  generateCover(race: CoverRace) {
    return request<{ id: string; path: string; model: string }>("/ai/enrich/covers", { auth: true, timeoutMs: 200000, method: "POST", body: race });
  },
};

export interface CoverRace {
  name: string;
  sport?: string | null;
  location?: string | null;
  race_date?: string | null;
  distance_km?: number | null;
  elevation_gain_m?: number | null;
  description?: string | null;
}

export interface StravaRoute {
  id: string;
  name: string;
  distance_km: number;
  elevation_gain_m: number;
  kind: "run" | "ride" | "other";
  private: boolean;
  updated_at?: string | null;
}

export const sourcesApi = {
  async stravaRoutes(): Promise<StravaRoute[]> {
    return (await request<{ items: StravaRoute[] }>("/integrations/strava/routes", auth)).items;
  },
  async list(): Promise<IntegrationSource[]> {
    return (await request<{ items: IntegrationSource[] }>("/integrations/sources", auth)).items;
  },
  connect(provider: string, code: string, redirectUri = "") {
    return request<IntegrationSource>(`/integrations/${provider}/connect`, { ...auth, method: "POST", body: { code, redirect_uri: redirectUri } });
  },
  disconnect(provider: string) {
    return request<void>(`/integrations/${provider}`, { ...auth, method: "DELETE" });
  },
  sync(provider: string) {
    return request<{ synced_sessions: number; synced_recovery: number }>(`/integrations/${provider}/sync`, { auth: true, method: "POST", timeoutMs: 120000 });
  },
  /** Wearable recovery (HRV, resting HR, sleep), newest first. */
  async recovery(limit = 28): Promise<RecoverySample[]> {
    return (await request<{ items: RecoverySample[] }>(`/integrations/recovery?limit=${limit}`, auth)).items;
  },
};
