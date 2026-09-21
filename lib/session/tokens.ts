/**
 * Access/refresh token storage.
 *
 * Native apps use expo-secure-store (device keychain/keystore). Expo web does
 * not provide those async SecureStore methods, so web uses browser storage to
 * keep the same auth flow functional in local/web builds.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { TokenPair } from "@/lib/api/types";

const ACCESS_KEY = "strem.access_token";
const REFRESH_KEY = "strem.refresh_token";

interface WebStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

function getWebStorage(): WebStorage | null {
  const candidate = (globalThis as typeof globalThis & { localStorage?: WebStorage }).localStorage;
  return candidate ?? null;
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return getWebStorage()?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    getItem(ACCESS_KEY),
    getItem(REFRESH_KEY),
  ]);
  if (!accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken };
}

export async function storeTokens(tokens: TokenPair): Promise<void> {
  await Promise.all([
    setItem(ACCESS_KEY, tokens.access_token),
    setItem(REFRESH_KEY, tokens.refresh_token),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([deleteItem(ACCESS_KEY), deleteItem(REFRESH_KEY)]);
}
