import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { useStore } from "./store";

/**
 * The yearly subscription (RevenueCat). The install id is the RevenueCat app-user id, so the server can verify the
 * entitlement for the same id (server/src/lib/entitlement.ts). The app shows the paywall when someone taps Analyze;
 * the server is the real gate. Emergency guidance never depends on any of this.
 *
 * Needs a development/production build (native module); in Expo Go or on web there is no store, so debug builds
 * treat the user as subscribed (matching a server with REQUIRE_SUBSCRIPTION off) and release builds show "unavailable".
 */
const ENTITLEMENT = "pro";
const API_KEY = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_RC_IOS_KEY : Platform.OS === "android" ? process.env.EXPO_PUBLIC_RC_ANDROID_KEY : undefined;
export const FALLBACK_PRICE = "$29.99";

type Status = "loading" | "active" | "inactive" | "unavailable";
export type PurchaseResult = "ok" | "cancelled" | "error";

interface Sub {
  status: Status;
  subscribed: boolean;
  /** localized store price of the yearly plan, e.g. "$29.99" */
  price: string;
  purchase: () => Promise<PurchaseResult>;
  restore: () => Promise<boolean>;
}

const Ctx = createContext<Sub | null>(null);

type RC = typeof import("react-native-purchases").default;
type Pkg = Awaited<ReturnType<RC["getOfferings"]>>["current"] extends infer O ? (O extends { availablePackages: (infer P)[] } ? P : never) : never;

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { settings, ready } = useStore();
  const installId = settings.installId;
  const devOpen = __DEV__ && !API_KEY;
  const [status, setStatus] = useState<Status>(devOpen ? "active" : API_KEY && Platform.OS !== "web" ? "loading" : "unavailable");
  const [price, setPrice] = useState(FALLBACK_PRICE);
  const rc = useRef<RC | null>(null);
  const pkg = useRef<Pkg | null>(null);

  useEffect(() => {
    if (!ready || devOpen || !API_KEY || Platform.OS === "web") return;
    let live = true;
    let off: (() => void) | undefined;
    (async () => {
      try {
        const Purchases = (await import("react-native-purchases")).default;
        Purchases.configure({ apiKey: API_KEY, appUserID: installId });
        rc.current = Purchases;
        const apply = (info: { entitlements: { active: Record<string, unknown> } }) => {
          if (live) setStatus(info.entitlements.active[ENTITLEMENT] ? "active" : "inactive");
        };
        const listener = (info: Parameters<typeof apply>[0]) => apply(info);
        Purchases.addCustomerInfoUpdateListener(listener);
        off = () => Purchases.removeCustomerInfoUpdateListener(listener);
        apply(await Purchases.getCustomerInfo());
        const offering = (await Purchases.getOfferings()).current;
        const p = offering?.annual ?? offering?.availablePackages[0];
        if (p && live) {
          pkg.current = p as Pkg;
          setPrice(p.product.priceString);
        }
      } catch {
        if (live) setStatus((s) => (s === "loading" ? "unavailable" : s));
      }
    })();
    return () => {
      live = false;
      off?.();
    };
  }, [ready, devOpen, installId]);

  const purchase = useCallback(async (): Promise<PurchaseResult> => {
    if (!rc.current || !pkg.current) return "error";
    try {
      const { customerInfo } = await rc.current.purchasePackage(pkg.current as never);
      const ok = !!customerInfo.entitlements.active[ENTITLEMENT];
      if (ok) setStatus("active");
      return ok ? "ok" : "error";
    } catch (e) {
      return (e as { userCancelled?: boolean })?.userCancelled ? "cancelled" : "error";
    }
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    if (!rc.current) return false;
    try {
      const info = await rc.current.restorePurchases();
      const ok = !!info.entitlements.active[ENTITLEMENT];
      setStatus(ok ? "active" : "inactive");
      return ok;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<Sub>(
    () => ({ status, subscribed: status === "active", price, purchase, restore }),
    [status, price, purchase, restore],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSubscription(): Sub {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSubscription outside SubscriptionProvider");
  return v;
}
