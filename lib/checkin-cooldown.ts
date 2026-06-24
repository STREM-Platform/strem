/**
 * Persistent cooldown for the Home proactive check-in nudge. The 10-second
 * readiness check is a periodic nudge, not a daily chore — once completed it
 * stays hidden for ~3 days (founder ask). The last-completed timestamp persists
 * across app restarts (expo-secure-store on native, localStorage on web), so the
 * nudge doesn't reappear every time the Home screen mounts.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "strem.proactiveCheckin.lastAt";
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // ~3 days

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

/** True when the proactive check-in is still within its ~3-day cooldown. */
export async function checkinInCooldown(): Promise<boolean> {
  try {
    const raw = await readKey(KEY);
    if (!raw) return false;
    const last = Number(raw);
    return Number.isFinite(last) && Date.now() - last < COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** Record that the user just completed the check-in (starts the cooldown). */
export async function markCheckinDone(): Promise<void> {
  try {
    await writeKey(KEY, String(Date.now()));
  } catch {
    // Best-effort; worst case the nudge shows again next session.
  }
}
