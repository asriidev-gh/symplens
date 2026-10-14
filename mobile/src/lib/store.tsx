import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { useColorScheme } from "react-native";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { translate, type TKey } from "@/i18n";
import { applyTheme, resolveTheme, type ThemeId, type ThemePref } from "@/theme";
import { deleteAllPhotos, deletePhoto } from "./photos";
import { StorageLockedError, destroyKey, readSecure, writeSecure } from "./secureStorage";
import { LOCALES, type HistoryEntry, type Locale } from "./types";

/**
 * Local-first storage. Everything here lives only on the device (AsyncStorage inside the app sandbox).
 * Photos are never written here. History is encrypted at rest (see secureStorage.ts); settings are not health data.
 */
export interface Settings {
  locale: Locale;
  theme: ThemePref;
  textScale: number;
  privateMode: boolean;
  historyEnabled: boolean;
  reduceMotion: boolean;
  voicePlayback: boolean;
  onboarded: boolean;
  installId: string;
}

const SETTINGS_KEY = "symplens.settings.v1";
const HISTORY_KEY = "symplens.history.v1";
const MAX_HISTORY = 200;

function randomId(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function defaultSettings(): Settings {
  const tag = getLocales()[0]?.languageCode ?? "en";
  const mapped = tag === "tl" ? "fil" : tag;
  return {
    locale: (LOCALES as readonly string[]).includes(mapped) ? (mapped as Locale) : "en",
    theme: "tech",
    textScale: 1,
    privateMode: false,
    historyEnabled: true,
    reduceMotion: false,
    voicePlayback: true,
    onboarded: false,
    installId: randomId(),
  };
}

interface Store {
  ready: boolean;
  settings: Settings;
  /** the theme actually in use (resolves "auto" from the phone's light/dark setting) */
  activeTheme: ThemeId;
  history: HistoryEntry[];
  /** history is actually written only when enabled and not in Private Mode */
  savesHistory: boolean;
  t: (key: TKey) => string;
  /** scale a base font size by the user's text-size setting */
  fs: (size: number) => number;
  update: (patch: Partial<Settings>) => void;
  addHistory: (entry: HistoryEntry) => void;
  removeHistory: (id: string) => void;
  updateHistory: (id: string, patch: Partial<HistoryEntry>) => void;
  clearHistory: () => void;
  deleteAllData: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Writes are queued so an older write can never land after a newer one.
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const historyLockedRef = useRef(false);
  const persistHistory = useCallback((next: HistoryEntry[]) => {
    if (historyLockedRef.current) return;
    const json = JSON.stringify(next);
    writeQueue.current = writeQueue.current.then(() => writeSecure(HISTORY_KEY, json)).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem(SETTINGS_KEY);
        if (s) setSettings((cur) => ({ ...cur, ...JSON.parse(s) }));
      } catch {
        /* corrupted or unavailable settings: use defaults */
      }
      try {
        const { text, needsMigration } = await readSecure(HISTORY_KEY);
        if (text) {
          const loaded = JSON.parse(text) as HistoryEntry[];
          setHistory(loaded);
          if (needsMigration) persistHistory(loaded); // older plain-text history: re-save it encrypted
        }
      } catch (e) {
        // Encrypted but the key is temporarily unavailable: show nothing and do NOT overwrite what is stored.
        if (e instanceof StorageLockedError) historyLockedRef.current = true;
      }
      setReady(true);
    })();
  }, [persistHistory]);


  const update = useCallback((patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    setSettings(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  // Apply before children render so every consumer reads the new palette in the same pass.
  const scheme = useColorScheme();
  const activeTheme = resolveTheme(settings.theme, scheme);
  applyTheme(activeTheme);

  const savesHistory = settings.historyEnabled && !settings.privateMode;

  const addHistory = useCallback(
    (entry: HistoryEntry) => {
      setHistory((cur) => {
        const next = [entry, ...cur.filter((e) => e.id !== entry.id)].slice(0, MAX_HISTORY);
        persistHistory(next);
        return next;
      });
    },
    [persistHistory],
  );

  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const updateHistory = useCallback(
    (id: string, patch: Partial<HistoryEntry>) => {
      setHistory((cur) => {
        const next = cur.map((e) => (e.id === id ? { ...e, ...patch } : e));
        persistHistory(next);
        return next;
      });
    },
    [persistHistory],
  );

  const removeHistory = useCallback(
    (id: string) => {
      deletePhoto(historyRef.current.find((e) => e.id === id)?.photoUri);
      setHistory((cur) => {
        const next = cur.filter((e) => e.id !== id);
        persistHistory(next);
        return next;
      });
    },
    [persistHistory],
  );

  const clearHistory = useCallback(() => {
    deleteAllPhotos();
    setHistory([]);
    AsyncStorage.removeItem(HISTORY_KEY).catch(() => {});
  }, []);

  const deleteAllData = useCallback(async () => {
    deleteAllPhotos();
    setHistory([]);
    await writeQueue.current.catch(() => {}); // let any in-flight write finish first, so it cannot recreate the data
    await destroyKey();
    historyLockedRef.current = false;
    const fresh = { ...defaultSettings(), onboarded: true, locale: settingsRef.current.locale, theme: settingsRef.current.theme };
    setSettings(fresh);
    try {
      await AsyncStorage.multiRemove([HISTORY_KEY, SETTINGS_KEY]);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(fresh));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      settings,
      activeTheme,
      history,
      savesHistory,
      t: (key) => translate(settings.locale, key),
      fs: (size) => Math.round(size * settings.textScale),
      update,
      addHistory,
      removeHistory,
      updateHistory,
      clearHistory,
      deleteAllData,
    }),
    [ready, settings, activeTheme, history, savesHistory, update, addHistory, removeHistory, updateHistory, clearHistory, deleteAllData],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("StoreProvider missing");
  return v;
}
