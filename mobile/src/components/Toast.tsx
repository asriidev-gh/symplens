import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/lib/store";
import { colors, motion, radius, shadow, space, urgencyStyle } from "@/theme";
import { Icon, type IconName } from "./Icon";
import { T } from "./ui";

type Kind = "success" | "info" | "error";
interface ToastOptions {
  message: string;
  kind?: Kind;
  /** ms before auto-dismiss (default 3200; errors stay a little longer) */
  duration?: number;
}
interface ToastApi {
  show: (opts: ToastOptions | string) => void;
}

const Ctx = createContext<ToastApi>({ show: () => {} });
export const useToast = () => useContext(Ctx);

const dotFor = (kind: Kind): { color: string; icon: IconName } =>
  kind === "success"
    ? { color: urgencyStyle.low.fill, icon: "checkmark" }
    : kind === "error"
      ? { color: urgencyStyle.urgent.fill, icon: "alert" }
      : { color: colors.brand, icon: "information" };

/** Dark pill toast that slides in from the top. One at a time; a new toast replaces the current one. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const styles = makeStyles();
  const { settings } = useStore();
  const [osReduce, setOsReduce] = useState(false);
  const reduce = settings.reduceMotion || osReduce;
  const [toast, setToast] = useState<(Required<Pick<ToastOptions, "message" | "kind">> & { id: number }) | null>(null);
  const [y] = useState(() => new Animated.Value(-120));
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setOsReduce).catch(() => {});
  }, []);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    Animated.parallel([
      Animated.timing(y, { toValue: -120, duration: reduce ? 0 : motion.base - 30, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: reduce ? 0 : motion.base - 50, useNativeDriver: true }),
    ]).start(({ finished }) => finished && setToast(null));
  }, [y, opacity, reduce]);

  const show = useCallback(
    (opts: ToastOptions | string) => {
      const o = typeof opts === "string" ? { message: opts } : opts;
      const kind = o.kind ?? "info";
      if (timer.current) clearTimeout(timer.current);
      setToast({ message: o.message, kind, id: ++counter.current });
      y.setValue(reduce ? 0 : -120);
      opacity.setValue(reduce ? 1 : 0);
      if (!reduce) {
        Animated.parallel([
          Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 6, speed: 14 }),
          Animated.timing(opacity, { toValue: 1, duration: motion.fast + 30, useNativeDriver: true }),
        ]).start();
      }
      AccessibilityInfo.announceForAccessibility?.(o.message);
      timer.current = setTimeout(hide, o.duration ?? (kind === "error" ? 4500 : 3200));
    },
    [y, opacity, reduce, hide],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.wrap, { top: insets.top + space.sm, opacity, transform: [{ translateY: y }] }]}
        >
          <Pressable
            onPress={hide}
            accessibilityRole={toast.kind === "error" ? "alert" : "text"}
            accessibilityLabel={toast.message}
            accessibilityHint="Double tap to dismiss"
            accessibilityLiveRegion="polite"
            style={[styles.pill, shadow]}
          >
            <View style={[styles.dot, { backgroundColor: dotFor(toast.kind).color }]}>
              <Icon name={dotFor(toast.kind).icon} size={15} color="#fff" />
            </View>
            <T v="label" color={colors.onToast} style={{ flexShrink: 1 }}>{toast.message}</T>
          </Pressable>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

const makeStyles = () =>
  StyleSheet.create({
  wrap: { position: "absolute", left: space.lg, right: space.lg, alignItems: "center", zIndex: 100 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    maxWidth: 520,
    backgroundColor: colors.toast,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    minHeight: 52,
  },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  });
