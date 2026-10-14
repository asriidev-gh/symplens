import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { KEY_BYTES, decryptString, encryptString, fromBase64, isEncrypted, toBase64 } from "./crypto";

/**
 * Encrypted-at-rest storage for health data (analysis history).
 *
 * A random 256-bit key is created on first use and kept in the device's secure store (iOS Keychain /
 * Android Keystore-backed), device-only and excluded from backups. The data in AsyncStorage is ciphertext, so
 * copying the app's files off a phone, or restoring them elsewhere, yields nothing readable.
 *
 * Deleting the key ("crypto-shredding") makes any leftover ciphertext permanently unreadable.
 * On web there is no secure store: data stays plain (that build is for development only).
 */
const KEY_NAME = "symplens.dek.v1";

/** Thrown when stored data is encrypted but the key cannot be read right now. Callers must not overwrite it. */
export class StorageLockedError extends Error {}

let cached: Uint8Array | null = null;

async function getKey(create: boolean): Promise<Uint8Array | null> {
  if (cached) return cached;
  if (Platform.OS === "web") return null;
  try {
    const stored = await SecureStore.getItemAsync(KEY_NAME);
    if (stored) {
      const key = fromBase64(stored);
      if (key.length === KEY_BYTES) return (cached = key);
    }
    if (!create) return null;
    const fresh = Crypto.getRandomBytes(KEY_BYTES);
    await SecureStore.setItemAsync(KEY_NAME, toBase64(fresh), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    return (cached = fresh);
  } catch {
    return null;
  }
}

export interface ReadResult {
  text: string | null;
  /** true if the data was stored in plain text by an older version and should be re-saved encrypted */
  needsMigration: boolean;
}

export async function readSecure(name: string): Promise<ReadResult> {
  const raw = await AsyncStorage.getItem(name);
  if (raw === null) return { text: null, needsMigration: false };
  if (!isEncrypted(raw)) return { text: raw, needsMigration: Platform.OS !== "web" };
  const key = await getKey(false);
  if (!key) throw new StorageLockedError();
  try {
    return { text: decryptString(raw, key), needsMigration: false };
  } catch {
    // Corrupted or written with a key we no longer have: unreadable for good, so start fresh.
    return { text: null, needsMigration: false };
  }
}

export async function writeSecure(name: string, text: string): Promise<void> {
  const key = await getKey(true);
  await AsyncStorage.setItem(name, key ? encryptString(text, key, Crypto.getRandomBytes) : text);
}

/** Encrypts arbitrary text (e.g. a base64 photo) for storage in a file; plain on web. */
export async function seal(text: string): Promise<string> {
  const key = await getKey(true);
  return key ? encryptString(text, key, Crypto.getRandomBytes) : text;
}

/** Reverse of seal(); plain (legacy) text passes through. */
export async function unseal(payload: string): Promise<string> {
  if (!isEncrypted(payload)) return payload;
  const key = await getKey(false);
  if (!key) throw new StorageLockedError();
  return decryptString(payload, key);
}

/** Destroys the key, making every encrypted copy unreadable. Used by "Delete all health data". */
export async function destroyKey(): Promise<void> {
  cached = null;
  if (Platform.OS === "web") return;
  try {
    await SecureStore.deleteItemAsync(KEY_NAME);
  } catch {
    /* ignore */
  }
}
