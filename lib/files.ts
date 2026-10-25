/** Read picked files as base64 on web and native; shrink big photos on web. */

import type { DocumentPickerAsset } from "expo-document-picker";
import { File as LocalFile } from "expo-file-system";
import { Platform } from "react-native";

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.readAsDataURL(blob);
  });
}

/** Base64 (no data: prefix) of a picked file. Native cache copies are removed after reading. */
export async function readBase64(asset: DocumentPickerAsset): Promise<string> {
  if (Platform.OS === "web" && asset.file) return (await dataUrl(asset.file)).split(",")[1];
  const local = new LocalFile(asset.uri);
  try {
    return await local.base64();
  } finally {
    try {
      local.delete();
    } catch {
      // The OS cache cleans up later.
    }
  }
}

export async function readText(asset: DocumentPickerAsset): Promise<string> {
  if (Platform.OS === "web" && asset.file) return asset.file.text();
  const local = new LocalFile(asset.uri);
  try {
    return await local.text();
  } finally {
    try {
      local.delete();
    } catch {
      // The OS cache cleans up later.
    }
  }
}

/**
 * A photo/screenshot as base64 JPEG/PNG. On web, images over ~1.5 MB are redrawn
 * at most 2000 px wide (still sharp enough to read a plan) to stay well inside
 * the upload limit.
 */
export async function readImage(asset: DocumentPickerAsset): Promise<{ data: string; mediaType: string }> {
  const type = asset.mimeType ?? "image/jpeg";
  const size = asset.size ?? asset.file?.size ?? 0;
  if (Platform.OS !== "web" || !asset.file || size < 1_500_000) return { data: await readBase64(asset), mediaType: type };
  const bitmap = await createImageBitmap(asset.file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { data: canvas.toDataURL("image/jpeg", 0.85).split(",")[1], mediaType: "image/jpeg" };
}
