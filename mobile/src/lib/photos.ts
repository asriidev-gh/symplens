import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

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
  const to = `${DIR}${id}.jpg`;
  await FileSystem.copyAsync({ from: fromUri, to });
  return to;
}

export function deletePhoto(uri?: string): void {
  if (uri) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}

export function deleteAllPhotos(): void {
  if (canSavePhotos) FileSystem.deleteAsync(DIR, { idempotent: true }).catch(() => {});
}

export async function readPhotoBase64(uri: string): Promise<string | null> {
  try {
    return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  } catch {
    return null;
  }
}
