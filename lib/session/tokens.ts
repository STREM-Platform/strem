/**
 * Secure access/refresh token storage backed by expo-secure-store.
 *
 * Tokens are stored in the device keychain/keystore, never in plain async
 * storage. The access token authorizes requests; the refresh token mints a new
 * pair when the access token expires.
 */

import * as SecureStore from "expo-secure-store";

import type { TokenPair } from "@/lib/api/types";

const ACCESS_KEY = "strem.access_token";
const REFRESH_KEY = "strem.refresh_token";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  if (!accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken };
}

export async function storeTokens(tokens: TokenPair): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.access_token),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh_token),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
