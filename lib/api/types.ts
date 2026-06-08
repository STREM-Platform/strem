/**
 * Types mirroring the STREM auth contract
 * (`strem-shared-contracts/contracts/auth/openapi.yml`) and the onboarding
 * status from the user contract. Kept narrow to what the mobile app consumes.
 */

export interface AuthIdentity {
  user_id: string;
  email: string;
  display_name?: string | null;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
}

export interface AuthSession {
  user: AuthIdentity;
  tokens: TokenPair;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export type OnboardingStatusValue = "not_started" | "in_progress" | "completed";

export interface OnboardingStatus {
  status: OnboardingStatusValue;
  completed: boolean;
  last_completed_screen?: string | null;
  completed_at?: string | null;
}

/** Shape of the shared `Error` response body. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: { field: string; issue: string }[];
}
