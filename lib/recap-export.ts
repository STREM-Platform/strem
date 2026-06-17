/**
 * Native recap export (capture → share / save). Isolated here so the native-only
 * deps (react-native-view-shot, expo-sharing, expo-media-library) are never
 * imported on web — see `recap-export.web.ts`. Importing them at module level on
 * web crashes route loading ("Class extends undefined").
 */

import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";

export type ShareResult = "shared" | "unavailable" | "error";
export type SaveResult = "saved" | "denied" | "unavailable" | "error";

async function capture(ref: RefObject<View | null>): Promise<string | null> {
  try {
    return await captureRef(ref, { format: "png", quality: 1 });
  } catch {
    return null;
  }
}

export async function shareRecap(ref: RefObject<View | null>): Promise<ShareResult> {
  const uri = await capture(ref);
  if (!uri) return "error";
  try {
    if (!(await Sharing.isAvailableAsync())) return "unavailable";
    await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your recap" });
    return "shared";
  } catch {
    return "error";
  }
}

export async function downloadRecap(ref: RefObject<View | null>): Promise<SaveResult> {
  const uri = await capture(ref);
  if (!uri) return "error";
  try {
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (!perm.granted) return "denied";
    await MediaLibrary.saveToLibraryAsync(uri);
    return "saved";
  } catch {
    return "error";
  }
}
