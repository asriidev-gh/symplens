# SympLens – What the app does

> See it. Understand it. Know what to do next.

SympLens is a **health-information** app, not a diagnosis tool. A person describes a symptom (and optionally adds a photo, or a medical report/lab PDF) and gets a plain-language explanation, a four-level urgency rating and clear next steps. It is built for all ages, in 14 languages, with privacy and safety as the top priorities.

## Who it is for
Anyone who wants to understand a symptom, a skin/eye/hair/foot/mouth concern, or a lab report before deciding whether to see a doctor: adults, parents checking a child, and carers checking an older relative (the "who is this for" step adapts the safety rules by age group).

## The main journey
1. **First launch:** animated onboarding (brand splash, then 4 steps), pick language and theme.
2. **Home:** animated scan hero with sample analyses, quick entry points, language button.
3. **Analyze:** choose who it is for, add a photo (camera/gallery) or a report (PDF/image) if wanted, describe it by typing or by voice.
4. **Paywall:** shown only here, when someone taps Analyze without a plan (see "Pricing").
5. **Processing:** the on-device emergency check runs first; then the server and Claude analyze.
6. **Result:** urgency card first, then summary, observations, possible explanations (always hedged), red flags, next steps, questions to ask a doctor, limitations.
7. **After the result:** listen aloud, translate into another language, ask follow-up questions in chat, save to history, track changes over time (re-check), share a PDF summary with a doctor, find care nearby.

## Urgency levels
| Level | Meaning |
|---|---|
| Self-care | Likely fine at home; watch for changes |
| Routine | Book a normal appointment |
| Prompt review | See a clinician soon (days) |
| Urgent | Seek care now / emergency |

## Features at a glance
- **Emergency detection** in 14 languages, on the phone *before* any network call and again on the server. The AI can raise urgency but never lower it below the deterministic floor. It is negation-aware ("no chest pain" does not trigger), except Japanese, Korean and Hindi, which err on the side of warning.
- **Photo + text analysis** and **medical-report reading** (lab values with plain explanations).
- **Result translation** into any supported language, with checks that urgency and numbers stay identical.
- **Progress tracking:** re-check a concern later and get a cautious comparison (optional saved photo).
- **Doctor summary:** one-tap PDF with findings and suggested questions.
- **Find care near me:** opens the maps app with a localized search; the app never reads location.
- **Ask SympLens:** follow-up chat about a result.
- **Voice:** dictate a description, listen to a result.
- **Private Mode:** nothing is saved. **Delete all health data** wipes history, photos and the encryption key.
- **Accessibility:** text scaling, reduce-motion, screen-reader labels, urgency badges that never rely on color alone.
- **Themes:** Minimalist Tech (default), Warm, Dark Futuristic, or Automatic (follows the phone's light/dark setting); each has its own logo.

## Languages
English, Filipino, Spanish, Chinese (Simplified), Japanese, Korean, French, German, Portuguese (Brazil), Hindi, Indonesian, Vietnamese, Russian, Italian. Right-to-left languages (Arabic, Hebrew) are not supported yet.

## Screens
| Screen | File (`mobile/src/app/`) |
|---|---|
| Onboarding | `onboarding.tsx` |
| Home, Analyze, History, Safety, Settings (tabs) | `(tabs)/index.tsx`, `analyze.tsx`, `history.tsx`, `safety.tsx`, `settings.tsx` |
| Who is this for, Photo, Describe | `analyze/who.tsx`, `photo.tsx`, `describe.tsx` |
| Processing | `processing.tsx` |
| Result | `result.tsx` |
| Ask SympLens chat | `chat.tsx` |
| Paywall | `paywall.tsx` |
| About / limitations / terms | `about.tsx` |

## Privacy in one paragraph
Photos and history stay on the phone, encrypted at rest (key in the iOS Keychain / Android Keystore). The server is stateless: it never stores photos or logs content, and there is no analytics. A photo leaves the phone only when the user taps Analyze (or starts a re-check). An optional, opt-in "contribute anonymously" feature sends structured patterns only, never photos or free text.

## Pricing (planned)
One plan: **yearly subscription, no free trial** (about $29.99/year; the real price is set in the stores). People can browse the whole app; the paywall appears when they tap Analyze. A monthly fair-use cap applies (60 analyses and 300 chat/translation calls per month by default), so do not market the plan as "unlimited". **Emergency guidance is always free**, with or without a plan. Neither store lets an app remove a user's ability to cancel; cancelling only stops renewal and access continues to the end of the paid year.

## What the app will never do
Diagnose, state accuracy percentages, claim medical credentials, or gate emergency guidance behind an account, paywall or connection.
