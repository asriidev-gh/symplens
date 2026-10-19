# SympLens – Tech stack

## At a glance
| Layer | Technology |
|---|---|
| Mobile app | Expo SDK 57, React Native 0.86, React 19, TypeScript, Expo Router (file-based navigation) |
| UI | Custom components and design tokens (3 runtime-switchable themes), DM Sans, `@expo/vector-icons`, `react-native-svg`, `expo-linear-gradient` |
| Device features | `expo-image-picker` / `expo-image-manipulator` (photos), `expo-document-picker` (PDF), `expo-speech` (read aloud), `expo-speech-recognition` (dictation), `expo-print` + `expo-sharing` (doctor PDF), `expo-localization`, `expo-network` |
| Local data | AsyncStorage and encrypted files; `expo-secure-store` (key); `@noble/ciphers` XChaCha20-Poly1305; `expo-crypto` |
| Payments | RevenueCat (`react-native-purchases`) over App Store / Google Play subscriptions |
| API | Next.js 16 route handlers (Node), stateless, TypeScript |
| Validation | zod 4 (requests, model output, translations) |
| AI | Anthropic Claude (`@anthropic-ai/sdk`), model `claude-sonnet-5-5`, vision and tool use for structured output |
| Abuse protection | Upstash Redis (REST) counters with in-memory fallback |
| Optional DB | PostgreSQL + pgvector (`server/db/schema.sql`) for opt-in anonymous patterns only |
| Tests and checks | vitest (unit, parity, live evals), TypeScript, ESLint (`expo lint`), `expo-doctor` |
| CI / builds | GitHub Actions (`.github/workflows/ci.yml`), EAS Build (`mobile/eas.json`) |

## Repository layout
```
SympLens/
├─ README.md · ARCHITECTURE.md · docs/
├─ .github/workflows/ci.yml
├─ server/                 # Next.js API (the Anthropic key lives only here)
│  ├─ src/app/api/{analyze,followup,translate,contribute,health}/route.ts
│  ├─ src/lib/             # schema, safety, emergency-i18n, prompt, claude, pipeline, http, ratelimit, entitlement, log, db
│  ├─ tests/               # free unit tests (safety, parity, abuse, entitlement, crypto)
│  ├─ evals/               # live model evals (cost API credits)
│  └─ db/schema.sql
└─ mobile/                 # Expo app
   ├─ eas.json · app.json
   ├─ assets/{diseases,logos}/
   └─ src/{app,components,lib,i18n,theme}/
```

## Key design decisions (and why)
| Decision | Why |
|---|---|
| Claude is called **only from the server** | The API key must never ship in the app |
| Emergency rules are **deterministic code**, duplicated on device and server and parity-tested | Safety must not depend on the network or on the AI's judgment |
| Tool output with `response_language` as the **first field** | Makes the model commit to the language, fixing English leaking into Latin-script translations |
| `tool_choice: auto` plus an explicit instruction | Current models reject forced tool choice |
| Cacheable system prompt | About a quarter cheaper per call on repeat requests |
| **Local-first** storage, encrypted | Health data stays on the phone; deleting the key makes leftovers unreadable |
| Stateless server | Nothing to breach, easy to scale, no content logging |
| Install id doubles as the RevenueCat user id | The server can verify a subscription without user accounts |
| Live theme objects (`applyTheme`) with styles built at render | Themes switch instantly everywhere |
| The English dictionary types all others | The compiler forces all 14 languages to have every string |

## Versions to know
Node 22 (CI), Expo ~57.0, React Native 0.86.3, Next ^16.4, TypeScript 7 (server), zod ^4.6, vitest ^5, `@anthropic-ai/sdk` ^0.132. Exact versions are in each `package.json`.

## Cost and speed (measured)
One analysis writes about 1,400 tokens and takes roughly 10 seconds; time is set by output length, not by reasoning effort. Every model call logs token and cache counts only (`model_usage`), never content.
