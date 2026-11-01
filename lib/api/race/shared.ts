/** Shared request options and types for the Race OS API modules. */

import { ApiError } from "../client";

export const auth = { auth: true, timeoutMs: 20000 };

export const slow = { auth: true, timeoutMs: 180000 };

export type Origin = "engine" | "ai" | "athlete";

export async function optional<T>(promise: Promise<T>, missingCodes: string[]): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && missingCodes.includes(error.code)) return null;
    throw error;
  }
}
