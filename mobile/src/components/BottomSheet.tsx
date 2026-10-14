import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/lib/store";
import { colors, motion, radius, space } from "@/theme";
import { Button, T } from "./ui";

const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 0.9;

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  /** Set false for critical choices that must not close by tapping outside or dragging. */
  dismissible?: boolean;
}

/**
 * Modal bottom sheet built from theme tokens. Slides up, dims the page, drags down to dismiss,
 * closes on backdrop tap / Android back, and skips animation when reduce-motion is on.
 */
export function BottomSheet({ visible, onClose, title, children, dismissible = true }: SheetProps) {
  const insets = useSafeAreaInsets();
  const styles = makeStyles();
  const { settings, t } = useStore();
  const [osReduce, setOsReduce] = useState(false);
  const reduce = settings.reduceMotion || osReduce;
  // Stay mounted while the closing animation plays. State follows the prop via the render-phase pattern
  // React recommends, so no setState is needed inside an effect.
  const [prevVisible, setPrevVisible] = useState(visible);
  const [closing, setClosing] = useState(false);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    setClosing(!visible);
  }
  const mounted = visible || closing;
  const height = Dimensions.get("window").height;
  const [translateY] = useState(() => new Animated.Value(height));
  const [backdrop] = useState(() => new Animated.Value(0));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setOsReduce).catch(() => {});
  }, []);

  const animate = useCallback(
    (open: boolean, done?: () => void) => {
      const duration = reduce ? 0 : open ? motion.slow : motion.base - 30;
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: open ? 0 : height,
          duration,
          easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, { toValue: open ? 1 : 0, duration, useNativeDriver: true }),
      ]).start(done);
    },
    [reduce, height, translateY, backdrop],
  );

  useEffect(() => {
    if (visible) {
      translateY.setValue(height);
      requestAnimationFrame(() => animate(true));
    } else if (closing) {
      animate(false, () => setClosing(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Latest callbacks, updated after each render (never during render).
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  // eslint-disable-next-line react-hooks/refs -- the refs are read by gesture handlers on touch, never during render
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => dismissibleRef.current && g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) onCloseRef.current();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    }),
  );

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => dismissible && onClose()} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissible ? onClose : undefined}
            accessibilityLabel={t("closeLabel")}
            accessibilityRole="button"
          />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) + space.sm, transform: [{ translateY }] }]}
        >
          <View {...pan.panHandlers} style={styles.handleZone}>
            <View style={styles.handle} />
          </View>
          {title ? (
            <T v="h2" accessibilityRole="header" style={{ marginBottom: space.sm }}>
              {title}
            </T>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

interface ConfirmProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Friendly replacement for system alert dialogs. Cancel is always the easy, safe action. */
export function ConfirmSheet({ visible, title, message, confirmLabel, cancelLabel, destructive, onConfirm, onCancel }: ConfirmProps) {
  return (
    <BottomSheet visible={visible} onClose={onCancel} title={title}>
      {message ? <T color={colors.inkSoft}>{message}</T> : null}
      <View style={{ gap: space.sm, marginTop: space.lg }}>
        <Button
          kind={destructive ? "danger" : "primary"}
          label={confirmLabel}
          onPress={() => {
            onConfirm();
          }}
        />
        <Button kind="secondary" label={cancelLabel} onPress={onCancel} />
      </View>
    </BottomSheet>
  );
}

const makeStyles = () =>
  StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.cream,
    borderTopLeftRadius: radius.lg + 6,
    borderTopRightRadius: radius.lg + 6,
    paddingHorizontal: space.xl,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  handleZone: { alignItems: "center", paddingTop: space.md, paddingBottom: space.lg },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.handle },
  });
