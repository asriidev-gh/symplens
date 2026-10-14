# Reference: Senior Mobile UI/UX Designer

Load only when needed (token setup, review).

## Design system checklist

**Tokens** (single source of truth, e.g. `theme.ts`):
- Colors (semantic): `primary, onPrimary, secondary, background, surface, surfaceVariant, text, textMuted, border, success, warning, error, info`, plus light/dark values.
- Typography: font family, sizes, weights, line heights per role (display, title, headline, body, label, caption).
- Spacing: 4, 8, 12, 16, 24, 32, 48.
- Radius: sm / md / lg / full (pick one default and stick to it).
- Elevation: 0 / 1 / 2 / 3 (platform-appropriate shadow vs elevation).
- Motion: durations (fast 150, base 250) and easing.

**Components to keep consistent:** Button (primary/secondary/ghost/destructive, loading + disabled), Input (label, helper, error, focus), Card, List item, Tabs, Navigation bar, Chip, Badge, Dialog, Bottom sheet, Toast/Snackbar, Alert/Banner, Skeleton/Spinner, Empty state (illustration/icon + message + action).

Rule: if a value appears in 3+ places, it's a token or component.

## Final UX review

Answer each honestly; fix failures before finishing.

**Clarity & flow**
- [ ] Primary action obvious within 2 seconds?
- [ ] Hierarchy clear (title > key content > secondary)?
- [ ] Navigation intuitive; back/close predictable?
- [ ] Any unnecessary taps, steps, or screens?
- [ ] Copy is plain, specific, action-oriented?

**States**
- [ ] Loading handled (skeleton/progress)?
- [ ] Error handled with a recovery action?
- [ ] Empty handled with guidance/CTA?
- [ ] Success confirmed with a clear next step?
- [ ] Validation inline and specific?
- [ ] Offline / slow network / permission denied handled?

**Layout & device**
- [ ] Works at small width (320-360pt) and large (430+)?
- [ ] Safe areas, status bar, bottom nav/gesture bar respected?
- [ ] Keyboard doesn't cover inputs or primary action?
- [ ] Long text, large font scale, dynamic data don't break layout?
- [ ] Primary actions reachable one-handed?

**Accessibility**
- [ ] Contrast ≥ 4.5:1 (text) / 3:1 (UI)?
- [ ] Touch targets ≥ 44pt iOS / 48dp Android?
- [ ] Labels/roles on icons and custom controls?
- [ ] Not relying on color alone?
- [ ] Logical focus order; reduce-motion respected?

**Consistency & polish**
- [ ] Uses tokens/components; no stray hard-coded values?
- [ ] Spacing, radius, elevation, icon style consistent with the rest of the app?
- [ ] Animations subtle, purposeful, not blocking?
- [ ] Feels production-ready (no placeholder text, no visual jank)?
- [ ] Existing functionality unchanged; no needless duplication or dependencies?

## Review output format (when asked to review, not build)
1. **Verdict** (one line).
2. **Issues** ranked Critical / Major / Minor, each with location, why it hurts users, concrete fix.
3. **What's working** (brief).
4. **Quick wins**.
