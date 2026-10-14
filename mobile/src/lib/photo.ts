import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import type { Attachment } from "./types";

const MAX_EDGE = 1280;
const MAX_PDF_BYTES = 4_000_000;

export type PickResult =
  | { ok: true; attachment: Attachment }
  | { ok: false; reason: "cancelled" | "permission" | "failed" | "too_large" };

/**
 * Re-encodes to a downsized JPEG: this strips EXIF/GPS metadata and keeps uploads small.
 * Quality is a rough heuristic from bytes-per-pixel (blurry/dark/flat images compress far smaller);
 * it is a hint only and never blocks the user.
 */
async function prepareImage(uri: string, width: number, height: number): Promise<Attachment> {
  const resize = width >= height ? { width: Math.min(MAX_EDGE, width) } : { height: Math.min(MAX_EDGE, height) };
  const out = await ImageManipulator.manipulateAsync(uri, [{ resize }], {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  const bytes = (out.base64?.length ?? 0) * 0.75;
  const bpp = bytes / Math.max(1, out.width * out.height);
  let quality: Attachment["quality"] = "ok";
  if (Math.min(out.width, out.height) < 320) quality = "low_resolution";
  else if (bpp < 0.035) quality = "blurry_or_dark";
  return {
    mediaType: "image/jpeg",
    data: out.base64 ?? "",
    previewUri: out.uri,
    quality,
    tempUris: [out.uri, ...(uri.startsWith("file:") ? [uri] : [])],
  };
}

async function fromAsset(asset: ImagePicker.ImagePickerAsset): Promise<PickResult> {
  try {
    return { ok: true, attachment: await prepareImage(asset.uri, asset.width, asset.height) };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function takePhoto(): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { ok: false, reason: "permission" };
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1, exif: false });
  if (r.canceled || !r.assets[0]) return { ok: false, reason: "cancelled" };
  return fromAsset(r.assets[0]);
}

export async function choosePhoto(): Promise<PickResult> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, exif: false });
  if (r.canceled || !r.assets[0]) return { ok: false, reason: "cancelled" };
  return fromAsset(r.assets[0]);
}

export async function choosePdf(): Promise<PickResult> {
  const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
  if (r.canceled || !r.assets[0]) return { ok: false, reason: "cancelled" };
  const asset = r.assets[0];
  try {
    if ((asset.size ?? 0) > MAX_PDF_BYTES) return { ok: false, reason: "too_large" };
    const data = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
    return { ok: true, attachment: { mediaType: "application/pdf", data, tempUris: [asset.uri] } };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
