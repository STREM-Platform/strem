/**
 * Typed API client for STREM.
 *
 * Wraps `fetch` with a configurable base URL, attaches the bearer access token,
 * and transparently refreshes it on a `401` (retrying the request once). If the
 * refresh fails, stored tokens are cleared and `SessionExpiredError` is thrown so
 * the session layer can sign the user out.
 */

import { API_BASE_URL } from "@/lib/config";
import { clearTokens, getStoredTokens, storeTokens } from "@/lib/session/tokens";

import type {
  ApiErrorBody,
  AthleteProfile,
  AthleteProfileUpdate,
  AuthIdentity,
  AuthSession,
  Biomarker,
  BiomarkerCreate,
  BiomarkerList,
  Challenge,
  ChallengePage,
  CheckIn,
  CheckInPage,
  CreateChallengeRequest,
  CreateCheckinRequest,
  LoginRequest,
  LegalAcceptanceInput,
  LegalStatus,
  LogNutritionDayRequest,
  LogTrainingSessionRequest,
  MatchPage,
  MedalListResponse,
  Membership,
  Mission,
  MissionGenerationResult,
  MissionList,
  MissionPage,
  NutritionDay,
  NutritionDayPage,
  OnboardingStatus,
  OnboardingSubmission,
  RegisterRequest,
  Supplement,
  SupplementCreate,
  TokenPair,
  TrainingSession,
  TrainingSessionPage,
  Tribe,
  TribeMatch,
  UserProfile,
  WeeklyRecap,
  XPSummary,
} from "./types";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: { field: string; issue: string }[];

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired. Please sign in again.");
    this.name = "SessionExpiredError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody = { code: "error", message: response.statusText };
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    // Non-JSON error body — keep the status-text fallback.
  }
  return new ApiError(response.status, body);
}

async function refreshAccessToken(): Promise<string> {
  const tokens = await getStoredTokens();
  if (!tokens) {
    throw new SessionExpiredError();
  }
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: tokens.refreshToken }),
  });
  if (!response.ok) {
    await clearTokens();
    throw new SessionExpiredError();
  }
  const pair = (await response.json()) as TokenPair;
  await storeTokens(pair);
  return pair.access_token;
}

async function send(path: string, options: RequestOptions, accessToken?: string): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let accessToken: string | undefined;
  if (options.auth) {
    accessToken = (await getStoredTokens())?.accessToken;
  }

  let response = await send(path, options, accessToken);

  if (response.status === 401 && options.auth) {
    const refreshed = await refreshAccessToken();
    response = await send(path, options, refreshed);
  }

  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  register(payload: RegisterRequest): Promise<AuthSession> {
    return request<AuthSession>("/auth/register", { method: "POST", body: payload });
  },
  login(payload: LoginRequest): Promise<AuthSession> {
    return request<AuthSession>("/auth/login", { method: "POST", body: payload });
  },
  logout(refreshToken: string): Promise<void> {
    return request<void>("/auth/logout", {
      method: "POST",
      body: { refresh_token: refreshToken },
      auth: true,
    });
  },
  getMe(): Promise<AuthIdentity> {
    return request<AuthIdentity>("/auth/me", { auth: true });
  },
  getOnboardingStatus(): Promise<OnboardingStatus> {
    return request<OnboardingStatus>("/users/onboarding/status", { auth: true });
  },
  submitOnboarding(payload: OnboardingSubmission): Promise<OnboardingStatus> {
    return request<OnboardingStatus>("/users/onboarding", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },
  getUserProfile(): Promise<UserProfile> {
    return request<UserProfile>("/users/me", { auth: true });
  },
  getLegalStatus(): Promise<LegalStatus> {
    return request<LegalStatus>("/users/me/legal", { auth: true });
  },
  acceptLegal(acceptances: LegalAcceptanceInput[]): Promise<LegalStatus> {
    return request<LegalStatus>("/users/me/legal/accept", {
      method: "POST",
      body: { acceptances },
      auth: true,
    });
  },
  getAthleteProfile(): Promise<AthleteProfile> {
    return request<AthleteProfile>("/users/me/athlete-profile", { auth: true });
  },
  updateAthleteProfile(body: AthleteProfileUpdate): Promise<AthleteProfile> {
    return request<AthleteProfile>("/users/me/athlete-profile", {
      method: "PUT",
      body,
      auth: true,
    });
  },
  getXpSummary(): Promise<XPSummary> {
    return request<XPSummary>("/users/me/xp", { auth: true });
  },
  getMedals(): Promise<MedalListResponse> {
    return request<MedalListResponse>("/users/me/medals", { auth: true });
  },
  logTrainingSession(payload: LogTrainingSessionRequest): Promise<TrainingSession> {
    return request<TrainingSession>("/training/sessions", {
      method: "POST",
      body: payload,
      auth: true,
    });
  },
  listTrainingSessions(limit = 50): Promise<TrainingSessionPage> {
    return request<TrainingSessionPage>(`/training/sessions?limit=${limit}`, { auth: true });
  },
  logNutritionDay(payload: LogNutritionDayRequest): Promise<NutritionDay> {
    return request<NutritionDay>("/nutrition/days", { method: "POST", body: payload, auth: true });
  },
  listNutritionDays(limit = 14): Promise<NutritionDayPage> {
    return request<NutritionDayPage>(`/nutrition/days?limit=${limit}`, { auth: true });
  },
  listSupplements(): Promise<{ items: Supplement[] }> {
    return request<{ items: Supplement[] }>("/nutrition/supplements", { auth: true });
  },
  createSupplement(body: SupplementCreate): Promise<Supplement> {
    return request<Supplement>("/nutrition/supplements", { method: "POST", body, auth: true });
  },
  deleteSupplement(id: string): Promise<void> {
    return request<void>(`/nutrition/supplements/${id}`, { method: "DELETE", auth: true });
  },
  getMyTribe(): Promise<Tribe> {
    return request<Tribe>("/tribes/me", { auth: true });
  },
  joinTribe(inviteCode: string): Promise<Membership> {
    return request<Membership>("/tribes/join", {
      method: "POST",
      body: { invite_code: inviteCode },
      auth: true,
    });
  },
  createCheckin(tribeId: string, payload: CreateCheckinRequest): Promise<CheckIn> {
    return request<CheckIn>(`/tribes/${tribeId}/checkins`, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },
  listCheckins(tribeId: string, limit = 20): Promise<CheckInPage> {
    return request<CheckInPage>(`/tribes/${tribeId}/checkins?limit=${limit}`, { auth: true });
  },
  listTribeMembers(tribeId: string): Promise<{ items: Membership[] }> {
    return request<{ items: Membership[] }>(`/tribes/${tribeId}/members`, { auth: true });
  },
  listChallenges(tribeId: string, limit = 20): Promise<ChallengePage> {
    return request<ChallengePage>(`/tribes/${tribeId}/challenges?limit=${limit}`, { auth: true });
  },
  createChallenge(tribeId: string, payload: CreateChallengeRequest): Promise<Challenge> {
    return request<Challenge>(`/tribes/${tribeId}/challenges`, {
      method: "POST",
      body: payload,
      auth: true,
    });
  },
  contributeToChallenge(tribeId: string, challengeId: string, amount: number): Promise<Challenge> {
    return request<Challenge>(`/tribes/${tribeId}/challenges/${challengeId}/contributions`, {
      method: "POST",
      body: { amount },
      auth: true,
    });
  },
  completeChallenge(tribeId: string, challengeId: string): Promise<Challenge> {
    return request<Challenge>(`/tribes/${tribeId}/challenges/${challengeId}/complete`, {
      method: "POST",
      auth: true,
    });
  },
  listMatches(limit = 20): Promise<MatchPage> {
    return request<MatchPage>(`/matches?limit=${limit}`, { auth: true });
  },
  listBiomarkers(): Promise<BiomarkerList> {
    return request<BiomarkerList>("/users/me/biomarkers", { auth: true });
  },
  createBiomarker(payload: BiomarkerCreate): Promise<Biomarker> {
    return request<Biomarker>("/users/me/biomarkers", { method: "POST", body: payload, auth: true });
  },
  deleteBiomarker(id: string): Promise<void> {
    return request<void>(`/users/me/biomarkers/${id}`, { method: "DELETE", auth: true });
  },
  setAgentConsent(sourceId: string, enabled: boolean): Promise<unknown> {
    return request<unknown>("/users/me/agent-consent", {
      method: "PUT",
      body: { source_id: sourceId, enabled },
      auth: true,
    });
  },
  acceptMatch(matchId: string): Promise<TribeMatch> {
    return request<TribeMatch>(`/matches/${matchId}/accept`, { method: "POST", auth: true });
  },
  declineMatch(matchId: string): Promise<TribeMatch> {
    return request<TribeMatch>(`/matches/${matchId}/decline`, { method: "POST", auth: true });
  },
  getActiveMissions(): Promise<MissionList> {
    return request<MissionList>("/ai/missions/active", { auth: true });
  },
  listMissionHistory(limit = 10): Promise<MissionPage> {
    return request<MissionPage>(`/ai/missions/history?limit=${limit}`, { auth: true });
  },
  generateMissions(): Promise<MissionGenerationResult> {
    return request<MissionGenerationResult>("/ai/missions/generate", {
      method: "POST",
      auth: true,
    });
  },
  completeMission(missionId: string): Promise<Mission> {
    return request<Mission>(`/ai/missions/${missionId}/complete`, { method: "POST", auth: true });
  },
  skipMission(missionId: string): Promise<Mission> {
    return request<Mission>(`/ai/missions/${missionId}/skip`, { method: "POST", auth: true });
  },
  getLatestRecap(): Promise<WeeklyRecap> {
    return request<WeeklyRecap>("/ai/coach/recap", { auth: true });
  },
  generateRecap(): Promise<WeeklyRecap> {
    return request<WeeklyRecap>("/ai/coach/recap/generate", { method: "POST", auth: true });
  },
};
