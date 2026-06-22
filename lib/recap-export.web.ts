/**
 * Web recap export. The native deps (expo-sharing / expo-media-library) have no
 * web support and crash route loading if imported, so this file never touches
 * them. Capture is done with react-native-view-shot's *web* implementation
 * (html2canvas under the hood) which turns the card's DOM node into a PNG
 * data-uri. From there:
 *   - Download → trigger a real browser download of the PNG.
 *   - Share    → Web Share API with the PNG file when available, else download.
 *
 * Failures are reported (never silently swallowed) so a broken export is
 * observable, and a user-cancelled share sheet is treated as a no-op, not an
 * error.
 */

import html2canvas from "html2canvas";
import type { RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { captureError } from "./monitoring";
import type { SaveResult, ShareResult } from "./recap-export";

const FILE_NAME = "strem-recap.png";

/** On web the RN ref resolves to the underlying DOM node. */
function domNode(ref: RefObject<View | null>): HTMLElement | null {
  const current = ref.current as unknown;
  return current instanceof HTMLElement ? current : null;
}

/** Snapshot the recap card to a PNG data-uri, or null on a real failure. */
async function capture(ref: RefObject<View | null>): Promise<string | null> {
  const node = domNode(ref);
  if (!node) {
    captureError(new Error("recap card DOM node unavailable"), { context: "recap-export.web.capture" });
    return null;
  }
  try {
    // result: "data-uri" → "data:image/png;base64,..." we can download/share.
    return await captureRef(node as unknown as View, { format: "png", quality: 1, result: "data-uri" });
  } catch (err) {
    captureError(err, { context: "recap-export.web.capture" });
    return null;
  }
}

/** data:image/png;base64,... → Blob (so we can build a File / object URL). */
function dataUriToBlob(dataUri: string): Blob {
  const [header, base64] = dataUri.split(",");
  const mime = /data:(.*?);base64/.exec(header)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function triggerDownload(blob: Blob, name: string = FILE_NAME): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the click has been handled so the download isn't cut short.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareRecap(ref: RefObject<View | null>): Promise<ShareResult> {
  const dataUri = await capture(ref);
  if (!dataUri) return "error";

  try {
    const blob = dataUriToBlob(dataUri);
    const file = new File([blob], FILE_NAME, { type: blob.type });

    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
      try {
        await nav.share({ files: [file], title: "STREM recap" });
        return "shared";
      } catch (err) {
        // User dismissed the share sheet — not a failure, just nothing shared.
        if (err instanceof DOMException && err.name === "AbortError") return "unavailable";
        throw err;
      }
    }

    // No Web Share for files → fall back to a download so the user still gets the image.
    triggerDownload(blob);
    return "shared";
  } catch (err) {
    captureError(err, { context: "recap-export.web.share" });
    return "error";
  }
}

export async function downloadRecap(ref: RefObject<View | null>): Promise<SaveResult> {
  const dataUri = await capture(ref);
  if (!dataUri) return "error";
  try {
    triggerDownload(dataUriToBlob(dataUri));
    return "saved";
  } catch (err) {
    captureError(err, { context: "recap-export.web.download" });
    return "error";
  }
}

/**
 * Download just the stats on a transparent background (no photo / dark fill), so
 * it drops cleanly onto an Instagram/Story background. Uses html2canvas directly
 * with `backgroundColor: null` for a real alpha channel.
 */
export async function downloadRecapTransparent(ref: RefObject<View | null>): Promise<SaveResult> {
  const node = domNode(ref);
  if (!node) {
    captureError(new Error("recap card DOM node unavailable"), {
      context: "recap-export.web.transparent",
    });
    return "error";
  }
  try {
    const canvas = await html2canvas(node, { backgroundColor: null, scale: 2, logging: false });
    triggerDownload(dataUriToBlob(canvas.toDataURL("image/png")), "strem-recap-transparent.png");
    return "saved";
  } catch (err) {
    captureError(err, { context: "recap-export.web.transparent" });
    return "error";
  }
}
