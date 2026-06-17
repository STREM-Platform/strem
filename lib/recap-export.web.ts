/**
 * Web stub for recap export. The native capture/share/save deps have no web
 * support and crash route loading if imported, so on web these report
 * "unavailable" and the screen shows a clear notice.
 */

import type { RefObject } from "react";
import type { View } from "react-native";

import type { SaveResult, ShareResult } from "./recap-export";

export async function shareRecap(_ref: RefObject<View | null>): Promise<ShareResult> {
  return "unavailable";
}

export async function downloadRecap(_ref: RefObject<View | null>): Promise<SaveResult> {
  return "unavailable";
}
