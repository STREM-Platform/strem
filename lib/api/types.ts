/** API shapes currently consumed by the trail Race Mission mobile app. */

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

type OnboardingStatusValue = "not_started" | "in_progress" | "completed";
export type OnboardingScreen = "welcome" | "identity" | "training-background" | "commitment" | "launch";
export type LegacyOnboardingScreen = "nutrition" | "tribe";

export interface OnboardingStatus {
  status: OnboardingStatusValue;
  completed: boolean;
  last_completed_screen?: OnboardingScreen | LegacyOnboardingScreen | null;
  completed_at?: string | null;
}

export type LegalDocumentType = "terms" | "privacy" | "medical";

export interface LegalAcceptanceInput {
  document_type: LegalDocumentType;
  version: string;
}

interface LegalDocumentStatus {
  document_type: LegalDocumentType;
  required_version: string;
  accepted_version?: string | null;
  needs_acceptance: boolean;
}

export interface LegalStatus {
  documents: LegalDocumentStatus[];
  needs_acceptance: boolean;
}

export type AgeBand = "under_20" | "20_29" | "30_39" | "40_49" | "50_59" | "60_plus";
type BiologicalSex = "male" | "female" | "other" | "prefer_not_to_say";
export type EquipmentAccess = "full_gym" | "home_gym" | "minimal" | "bodyweight_only";

interface PersonalRecord {
  exercise: string;
  weight_kg?: number | null;
  reps?: number | null;
  time?: string | null;
  note?: string | null;
}

interface Injury {
  area: string;
  note?: string | null;
}

export interface AthleteProfile {
  height_cm?: number | null;
  weight_kg?: number | null;
  age_band?: AgeBand | null;
  biological_sex?: BiologicalSex | null;
  years_training?: number | null;
  equipment_access?: EquipmentAccess | null;
  personal_records: PersonalRecord[];
  injuries: Injury[];
  dietary_constraints: string[];
  is_started: boolean;
}

export type AthleteProfileUpdate = Partial<Omit<AthleteProfile, "is_started">>;

export type TransformationGoal = "build_strength" | "build_endurance" | "hybrid_athlete" | "lean_and_strong" | "build_discipline" | "general_health";
export type TrainingLevel = "beginner" | "intermediate" | "advanced";
export type Modality = "strength" | "running" | "mobility" | "nutrition";

export interface OnboardingSubmission {
  identity_statement?: string;
  transformation_goal?: TransformationGoal;
  training_level?: TrainingLevel;
  preferred_modalities?: Modality[];
  weekly_target_days?: number;
  display_name?: string;
  timezone?: string;
  screen?: OnboardingScreen;
}

export interface UserProfile {
  user_id: string;
  display_name: string;
  identity_statement?: string | null;
  transformation_goal?: TransformationGoal | null;
  training_level?: TrainingLevel | null;
  weekly_target_days?: number | null;
  onboarding_completed: boolean;
  created_at: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: { field: string; issue: string }[];
}
