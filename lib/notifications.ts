/**
 * Accountability notifications — consent, preferences, and the prompts.
 *
 * STREM's retention depends on reaching the user at the right moment (roadmap
 * "Accountability and Notifications"). This module owns the opt-in consent model
 * and per-type preferences, and derives the accountability prompts (e.g.
 * milestone proximity) from data the app already holds — honestly, with no
 * manufactured urgency.
 *
 * OS push delivery (the weekly Sunday recap, milestone, and tribe-inactivity
 * notifications) is the activation step: `registerForPush` is the integration
 * point for `expo-notifications` + an Expo Push send on the backend. It is kept a
 * no-op here so the web build stays dependency-free and the consent model can
 * ship first.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { XPSummary } from "@/lib/api/types";

const PREFS_KEY = "strem.notification_prefs";
// game-systems.md: ~50 XP per training session — used to phrase milestone nudges.
const XP_PER_SESSION = 50;
// Only nudge when a rank-up is genuinely within reach.
const MILESTONE_SESSION_THRESHOLD = 6;

export interface NotificationPrefs {
  /** Master opt-in. Off until the user explicitly turns reminders on. */
  enabled: boolean;
  weeklyRecap: boolean;
  milestones: boolean;
  tribeNudges: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  weeklyRecap: true,
  milestones: true,
  tribeNudges: true,
};

interface WebStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function webStorage(): WebStorage | null {
  return (globalThis as typeof globalThis & { localStorage?: WebStorage }).localStorage ?? null;
}

async function readKey(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return webStorage()?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function writeKey(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    webStorage()?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await readKey(PREFS_KEY);
    if (!raw) {
      return DEFAULT_PREFS;
    }
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotificationPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  try {
    await writeKey(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Best-effort persistence; preferences are non-critical state.
  }
}

/** The honest "you're close to your next rank" nudge, or null when not close. */
export function milestonePrompt(xp: XPSummary): string | null {
  if (xp.next_rank === null || xp.xp_to_next_rank <= 0) {
    return null;
  }
  const sessions = Math.ceil(xp.xp_to_next_rank / XP_PER_SESSION);
  if (sessions > MILESTONE_SESSION_THRESHOLD) {
    return null;
  }
  const unit = sessions === 1 ? "session" : "sessions";
  return `You're about ${sessions} ${unit} from ${xp.next_rank}. Keep going.`;
}

export async function registerForPush(): Promise<string | null> {
  // Activation point (MVP-18): on native, request permission via
  // expo-notifications, get the Expo push token, and register it with the
  // backend token registry that sends the recap / milestone / tribe nudges.
  return null;
}
