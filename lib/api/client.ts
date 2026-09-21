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
  LoginRequest,
  LegalAcceptanceInput,
  LegalStatus,
  OnboardingStatus,
  OnboardingSubmission,
  RegisterRequest,
  TokenPair,
  UserProfile,
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
};
