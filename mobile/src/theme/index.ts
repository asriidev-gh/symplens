import type { Urgency } from "@/lib/types";

/**
 * Three switchable themes. `colors`, `urgencyStyle`, `shadow` and `softShadow` are live objects:
 * `applyTheme()` overwrites their values and the store re-renders consumers, so components can keep
 * importing them directly. Anything built with StyleSheet.create must be created at render time.
 */
export type ThemeId = "warm" | "tech" | "dark";
/** What the user picks: a fixed theme, or "auto" to follow the phone's light/dark setting. */
export type ThemePref = ThemeId | "auto";

export interface Palette {
  isDark: boolean;
  bg: string;
  surface: string;
  cream: string;
  ink: string;
  inkSoft: string;
  line: string;
  cardBorder: string;
  /** primary button */
  primary: string;
  primaryGradient?: [string, string];
  onPrimary: string;
  /** secondary button */
  secondary: string;
  onSecondary: string;
  secondaryBorder: string;
  /** accent fill + text that sits on it */
  brand: string;
  onBrand: string;
  /** accent for text/icons on the page background (≥4.5:1) */
  brandText: string;
  brandSoft: string;
  brandBorder: string;
  /** selected tile / active tab pill, and its text */
  selected: string;
  onSelected: string;
  tabBar: string;
  tabBarBorder: string;
  tabInactive: string;
  tabActiveLabel: string;
  toast: string;
  onToast: string;
  teal: string;
  tealSoft: string;
  tealText: string;
  tealBorder: string;
  danger: string;
  placeholder: string;
  scrim: string;
  handle: string;
  track: string;
}

type UrgencyColors = { fg: string; bg: string; border: string; fill: string; level: number };
type UrgencySet = Record<Urgency, UrgencyColors>;
type Shadow = { shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number }; elevation: number };

const lightUrgency: UrgencySet = {
  low: { fg: "#256B4B", bg: "#E4F2EA", border: "#B6DCC7", fill: "#4CAF86", level: 1 },
  needs_attention: { fg: "#7C5700", bg: "#FFF1CC", border: "#F0D88A", fill: "#E8B923", level: 2 },
  prompt_review: { fg: "#9A430D", bg: "#FFE3D0", border: "#F3B890", fill: "#F08A3C", level: 3 },
  urgent: { fg: "#A32018", bg: "#FDE1DE", border: "#F2A39B", fill: "#D8392B", level: 4 },
};
const darkUrgency: UrgencySet = {
  low: { fg: "#6EE7B7", bg: "#0F2B21", border: "#1F5A3F", fill: "#34D399", level: 1 },
  needs_attention: { fg: "#FCD34D", bg: "#2E260C", border: "#6B5614", fill: "#FBBF24", level: 2 },
  prompt_review: { fg: "#FDBA74", bg: "#34200E", border: "#7A4515", fill: "#FB923C", level: 3 },
  urgent: { fg: "#FCA5A5", bg: "#381416", border: "#7F2A2A", fill: "#F87171", level: 4 },
};

const warm: Palette = {
  isDark: false,
  bg: "#F9E4D4",
  surface: "#FFFAF5",
  cream: "#FBF1E6",
  ink: "#2B2118",
  inkSoft: "#65564A",
  line: "#E8D3BF",
  cardBorder: "#F0DCC8",
  primary: "#33463A",
  onPrimary: "#FFF8EE",
  secondary: "#E6D3B6",
  onSecondary: "#2B2118",
  secondaryBorder: "#D9C3A1",
  brand: "#D9805F",
  onBrand: "#2B2118",
  brandText: "#9A4A2C",
  brandSoft: "#F6D3BC",
  brandBorder: "#EBB99B",
  selected: "#B65A3C",
  onSelected: "#FFFFFF",
  tabBar: "rgba(232,214,188,0.86)",
  tabBarBorder: "rgba(255,255,255,0.35)",
  tabInactive: "#65564A",
  tabActiveLabel: "#2B2118",
  toast: "#33463A",
  onToast: "#FFF8EE",
  teal: "#3E7B5A",
  tealSoft: "#E3EBDD",
  tealText: "#2F5F45",
  tealBorder: "#C5D6BF",
  danger: "#B42318",
  placeholder: "#85766A",
  scrim: "rgba(43,33,24,0.5)",
  handle: "#D9C3A1",
  track: "#D9C3A1",
};

const tech: Palette = {
  isDark: false,
  bg: "#EEF3F8",
  surface: "#FFFFFF",
  cream: "#F6F9FC",
  ink: "#0F1B2D",
  inkSoft: "#4F5D6E",
  line: "#DAE3EC",
  cardBorder: "#E3EAF2",
  primary: "#12294D",
  onPrimary: "#FFFFFF",
  secondary: "#FFFFFF",
  onSecondary: "#12294D",
  secondaryBorder: "#B9CBE0",
  brand: "#14B8A6",
  onBrand: "#06201C",
  brandText: "#0A6F66",
  brandSoft: "#D8F2EF",
  brandBorder: "#AEE1DB",
  selected: "#0F766E",
  onSelected: "#FFFFFF",
  tabBar: "rgba(255,255,255,0.82)",
  tabBarBorder: "rgba(185,203,224,0.8)",
  tabInactive: "#5B6B7C",
  tabActiveLabel: "#0F1B2D",
  toast: "#12294D",
  onToast: "#FFFFFF",
  teal: "#0F9D7A",
  tealSoft: "#DDF4EC",
  tealText: "#0B6B56",
  tealBorder: "#B5E3D2",
  danger: "#C0261B",
  placeholder: "#76848F",
  scrim: "rgba(15,27,45,0.5)",
  handle: "#C5D3E1",
  track: "#C5D3E1",
};

const dark: Palette = {
  isDark: true,
  bg: "#0A0F1E",
  surface: "#131A2E",
  cream: "#0F1526",
  ink: "#E8ECF8",
  inkSoft: "#9EABC8",
  line: "#243050",
  cardBorder: "#222C4A",
  primary: "#6D5CF6",
  primaryGradient: ["#3B82F6", "#8B5CF6"],
  onPrimary: "#FFFFFF",
  secondary: "#10172B",
  onSecondary: "#DCE3F7",
  secondaryBorder: "#33417A",
  brand: "#8B7BFF",
  onBrand: "#0A0F1E",
  brandText: "#B5ACFF",
  brandSoft: "#1B2247",
  brandBorder: "#343E7A",
  selected: "#5B4BE0",
  onSelected: "#FFFFFF",
  tabBar: "rgba(16,23,43,0.72)",
  tabBarBorder: "rgba(139,123,255,0.45)",
  tabInactive: "#8A97B8",
  tabActiveLabel: "#E8ECF8",
  toast: "#1E2749",
  onToast: "#E8ECF8",
  teal: "#34D399",
  tealSoft: "#0E2A26",
  tealText: "#6EE7B7",
  tealBorder: "#1D5A4B",
  danger: "#D43A2E",
  placeholder: "#7482A6",
  scrim: "rgba(3,6,16,0.7)",
  handle: "#33417A",
  track: "#2A3558",
};

export const themes: Record<ThemeId, Palette> = { warm, tech, dark };
/** Display order in Settings; "tech" is the default theme. */
export const THEME_IDS: ThemeId[] = ["tech", "warm", "dark"];

const shadows: Record<ThemeId, { shadow: Shadow; soft: Shadow }> = {
  warm: {
    shadow: { shadowColor: "#4A3426", shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
    soft: { shadowColor: "#4A3426", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  },
  tech: {
    shadow: { shadowColor: "#12294D", shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
    soft: { shadowColor: "#12294D", shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  },
  dark: {
    // Soft purple glow instead of drop shadows.
    shadow: { shadowColor: "#7C6CFF", shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
    soft: { shadowColor: "#7C6CFF", shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  },
};

// ---- live token objects (mutated by applyTheme) ----
export const colors: Palette = { ...tech };
export const urgencyStyle: UrgencySet = { ...lightUrgency };
export const shadow: Shadow = { ...shadows.tech.shadow };
export const softShadow: Shadow = { ...shadows.tech.soft };

/** "auto" = Minimalist Tech by day, Dark Futuristic when the phone is in dark mode. */
export function resolveTheme(pref: ThemePref, scheme: string | null | undefined): ThemeId {
  return pref === "auto" ? (scheme === "dark" ? "dark" : "tech") : pref;
}

export function applyTheme(id: ThemeId): void {
  const p = themes[id] ?? tech;
  Object.assign(colors, p);
  if (!p.primaryGradient) delete colors.primaryGradient;
  Object.assign(urgencyStyle, p.isDark ? darkUrgency : lightUrgency);
  Object.assign(shadow, shadows[id]?.shadow ?? shadows.tech.shadow);
  Object.assign(softShadow, shadows[id]?.soft ?? shadows.tech.soft);
}

export const radius = { sm: 12, md: 18, lg: 26, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const MIN_TOUCH = 56;

/** DM Sans, mapped per weight (Android needs one family per weight). */
export const fonts = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  bold: "DMSans_700Bold",
  black: "DMSans_700Bold",
};

/** Motion tokens (ms). Keep animations subtle and fast. */
export const motion = { fast: 150, base: 250, slow: 320 };
