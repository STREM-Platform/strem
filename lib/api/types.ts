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

export type OnboardingScreen =
  | "welcome"
  | "identity"
  | "training-background"
  | "commitment"
  | "nutrition"
  | "tribe"
  | "launch";

export interface OnboardingStatus {
  status: OnboardingStatusValue;
  completed: boolean;
  last_completed_screen?: OnboardingScreen | null;
  completed_at?: string | null;
}

export type TransformationGoal =
  | "build_strength"
  | "build_endurance"
  | "hybrid_athlete"
  | "lean_and_strong"
  | "build_discipline"
  | "general_health";

export type TrainingLevel = "beginner" | "intermediate" | "advanced";

export type Modality = "strength" | "running" | "mobility" | "nutrition";

export type NutritionPreference =
  | "general_consistency"
  | "high_protein"
  | "plant_based"
  | "no_focus";

export type TribePreference = "join_now" | "join_later" | "solo_for_now";

/** Partial per-screen onboarding submission (matches the user contract). */
export interface OnboardingSubmission {
  identity_statement?: string;
  transformation_goal?: TransformationGoal;
  training_level?: TrainingLevel;
  preferred_modalities?: Modality[];
  weekly_target_days?: number;
  nutrition_preference?: NutritionPreference;
  tribe_preference?: TribePreference;
  display_name?: string;
  timezone?: string;
  screen?: OnboardingScreen;
}

// --- User profile, XP, and medals (user contract) ---

export type UserRank = "Initiate" | "Builder" | "Forged" | "Hybrid" | "Warrior";

export interface EarnedMedal {
  medal_type: string;
  title: string;
  earned_at: string;
}

export interface UserProfile {
  user_id: string;
  display_name: string;
  identity_statement?: string | null;
  transformation_goal?: TransformationGoal | null;
  training_level?: TrainingLevel | null;
  weekly_target_days?: number | null;
  rank: UserRank;
  total_xp: number;
  active_medals: EarnedMedal[];
  onboarding_completed: boolean;
  created_at: string;
}

export interface XPSummary {
  user_id: string;
  total_xp: number;
  rank: UserRank;
  next_rank: UserRank | null;
  rank_xp_floor: number;
  rank_xp_ceiling: number;
  xp_into_rank: number;
  xp_to_next_rank: number;
}

export interface MedalListResponse {
  items: EarnedMedal[];
}

// --- Training (training contract) ---

export type SessionType = "strength" | "running" | "mobility";

export interface LogTrainingSessionRequest {
  session_type: SessionType;
  duration_minutes: number;
  distance_km?: number;
  notes?: string;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  session_type: SessionType;
  duration_minutes: number;
  distance_km?: number | null;
  notes?: string | null;
  logged_at: string;
  created_at: string;
}

export interface Pagination {
  limit: number;
  offset: number;
  total: number;
}

// --- Nutrition (nutrition contract) ---

export interface LogNutritionDayRequest {
  date: string;
  targets_met: boolean;
  notes?: string;
}

export interface NutritionDay {
  id: string;
  user_id: string;
  date: string;
  targets_met: boolean;
  notes?: string | null;
  logged_at: string;
  created_at: string;
}

export interface NutritionDayPage {
  items: NutritionDay[];
  pagination: Pagination;
}

// --- Community / tribes (community contract) ---

export type MemberRole = "admin" | "member";
export type MembershipStatus = "pending" | "active";
export type CompletedAction =
  | "training"
  | "running"
  | "nutrition"
  | "recovery"
  | "rest_day"
  | "nothing";

export interface Tribe {
  id: string;
  name: string;
  mission_statement?: string | null;
  approval_required: boolean;
  member_count: number;
  max_members: number;
  tribe_power: number;
  my_role: MemberRole;
  created_at: string;
}

export interface Membership {
  tribe_id: string;
  user_id: string;
  role: MemberRole;
  status: MembershipStatus;
  joined_at: string;
}

export interface CreateCheckinRequest {
  completed_action: CompletedAction;
  status_note?: string;
}

export interface CheckIn {
  id: string;
  tribe_id: string;
  user_id: string;
  completed_action: CompletedAction;
  status_note?: string | null;
  checked_in_at: string;
}

export interface CheckInPage {
  items: CheckIn[];
  pagination: Pagination;
}

// --- Tribe collective challenges (community contract) ---

export type ChallengeTargetType = "training_sessions" | "running_distance_km" | "checkins";
export type ChallengeState = "active" | "completed" | "failed" | "abandoned";

export interface Challenge {
  id: string;
  tribe_id: string;
  title: string;
  description?: string | null;
  target_type: ChallengeTargetType;
  target_value: number;
  current_value: number;
  state: ChallengeState;
  starts_at: string;
  ends_at: string;
  completed_at?: string | null;
}

export interface ChallengePage {
  items: Challenge[];
  pagination: Pagination;
}

export interface CreateChallengeRequest {
  title: string;
  description?: string;
  target_type: ChallengeTargetType;
  target_value: number;
  ends_at: string;
}

export interface ContributionRequest {
  amount: number;
}

// --- AI missions + coaching (ai contract) ---

export type MissionType =
  | "performance"
  | "recovery"
  | "tribe"
  | "discipline"
  | "nutrition"
  | "hybrid";
export type MissionDifficulty = "re-entry" | "maintenance" | "growth" | "challenge";
export type MissionState = "active" | "completed" | "expired" | "skipped";

export interface Mission {
  id: string;
  user_id: string;
  title: string;
  description: string;
  duration_days: number;
  xp_reward: number;
  type: MissionType;
  completion_condition: string;
  difficulty: MissionDifficulty;
  state: MissionState;
  generated_at: string;
  expires_at: string;
  completed_at?: string | null;
}

export interface MissionList {
  items: Mission[];
}

export interface MissionGenerationResult {
  missions: Mission[];
  generated_count: number;
  reason?: string | null;
}

export interface WeeklyRecap {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  narrative: string;
  generated_at: string;
}

/** Shape of the shared `Error` response body. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: { field: string; issue: string }[];
}
