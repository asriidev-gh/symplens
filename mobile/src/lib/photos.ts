import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { seal, unseal } from "./secureStorage";

/**
 * Optional on-device photo storage for progress tracking. Photos are saved ONLY when the user taps
 * "Save photo on this device", and every deletion path (one analysis, all history, all data) removes them.
 * Nothing here is ever uploaded except when the user starts a re-check, which sends the earlier photo
 * to the analysis server for that one comparison (same transmission rules as any analysis).
 */
const DIR = (FileSystem.documentDirectory ?? "") + "symplens-photos/";

export const canSavePhotos = Platform.OS !== "web" && !!FileSystem.documentDirectory;

export async function savePhoto(id: string, fromUri: string): Promise<string> {
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
  const to = `${DIR}${id}.enc`;
  const b64 = await FileSystem.readAsStringAsync(fromUri, { encoding: FileSystem.EncodingType.Base64 });
  await FileSystem.writeAsStringAsync(to, await seal(b64));
  return to;
}

export function deletePhoto(uri?: string): void {
  if (uri) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}

export function deleteAllPhotos(): void {
  if (canSavePhotos) FileSystem.deleteAsync(DIR, { idempotent: true }).catch(() => {});
}

/** Photo bytes as base64. New photos are encrypted files (.enc); older plain .jpg files are still read. */
export async function readPhotoBase64(uri: string): Promise<string | null> {
  try {
    if (!uri.endsWith(".enc")) return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return await unseal(await FileSystem.readAsStringAsync(uri));
  } catch {
    return null;
  }
}

/** A displayable data URI for a saved photo (decrypted in memory only), or null while loading / unreadable. */
export function usePhotoUri(uri?: string): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!uri) return;
    readPhotoBase64(uri).then((b64) => {
      if (live) setSrc(b64 ? `data:image/jpeg;base64,${b64}` : null);
    });
    return () => {
      live = false;
    };
  }, [uri]);
  return uri ? src : null;
}
