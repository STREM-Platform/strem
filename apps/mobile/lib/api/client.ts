/**
 * Typed API client for STREM.
 *
 * Wraps `fetch` with a configurable base URL, attaches the bearer access token,
 * and transparently refreshes it on a `401` (retrying the request once). If the
 * refresh token is refused, stored tokens are cleared and `SessionExpiredError` is thrown so
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

// Session restore and status checks fail fast instead of leaving a spinner.
const SESSION_CHECK_MS = 15000;

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
  headers?: Record<string, string>;
  timeoutMs?: number;
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

// Refresh tokens rotate: each refresh revokes the token it presents, so two
// refreshes with the same token would sign the athlete out. Concurrent 401s share
// one refresh, and a pair another tab already rotated is used instead of refreshing.
let pendingRefresh: Promise<string> | null = null;

function refreshAccessToken(staleAccessToken: string | undefined, signal: AbortSignal): Promise<string> {
  if (!pendingRefresh) {
    pendingRefresh = rotateTokens(staleAccessToken, signal).finally(() => {
      pendingRefresh = null;
    });
  }
  return pendingRefresh;
}

async function rotateTokens(staleAccessToken: string | undefined, signal: AbortSignal): Promise<string> {
  const tokens = await getStoredTokens();
  if (!tokens) {
    throw new SessionExpiredError();
  }
  if (staleAccessToken && tokens.accessToken !== staleAccessToken) {
    return tokens.accessToken;
  }
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: tokens.refreshToken }),
    signal,
  });
  if (response.status === 401 || response.status === 403) {
    const latest = await getStoredTokens();
    if (latest && latest.refreshToken !== tokens.refreshToken) {
      return latest.accessToken; // another tab rotated the pair first
    }
    await clearTokens();
    throw new SessionExpiredError();
  }
  if (!response.ok) {
    // 5xx, 429 or a gateway that is down: the session may still be valid, keep it.
    throw await parseError(response);
  }
  const pair = (await response.json()) as TokenPair;
  await storeTokens(pair);
  return pair.access_token;
}

async function send(path: string, options: RequestOptions, signal: AbortSignal, accessToken?: string): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...options.headers };
  if (options.auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal,
  });
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  // One deadline covers headers, token refresh, retry AND response-body reading.
  // A timeout cannot establish whether a write committed; callers retain their
  // idempotency key or reload before editing against a newer version.
  const controller = new AbortController();
  const timer = options.timeoutMs
    ? setTimeout(() => controller.abort(), options.timeoutMs)
    : undefined;
  try {
    let accessToken: string | undefined;
    if (options.auth) {
      accessToken = (await getStoredTokens())?.accessToken;
    }

    let response = await send(path, options, controller.signal, accessToken);

    if (response.status === 401 && options.auth) {
      const refreshed = await refreshAccessToken(accessToken, controller.signal);
      response = await send(path, options, controller.signal, refreshed);
    }

    if (!response.ok) {
      throw await parseError(response);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
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
    return request<AuthIdentity>("/auth/me", { auth: true, timeoutMs: SESSION_CHECK_MS });
  },
  getOnboardingStatus(): Promise<OnboardingStatus> {
    return request<OnboardingStatus>("/users/onboarding/status", { auth: true, timeoutMs: SESSION_CHECK_MS });
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
    return request<LegalStatus>("/users/me/legal", { auth: true, timeoutMs: SESSION_CHECK_MS });
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
