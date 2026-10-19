# SympLens – AI Symptoms Analyzer

> See it. Understand it. Know what to do next.

SympLens helps people understand a symptom, a photo of a concern, or a medical report in plain language, with a clear urgency level and next steps. It is **health information, not diagnosis**. It is private by design (history and photos stay encrypted on the phone), safety-first (emergency warning signs are detected on the device, before any network call) and available in 14 languages.

**Status:** pre-release. Feature-complete for a first beta; not yet deployed, published or tested on real phones. See [docs/RELEASES.md](docs/RELEASES.md).

## Read this first
| If you want to know… | Read |
|---|---|
| What the app does, who it is for, the screens, pricing | [docs/PRODUCT.md](docs/PRODUCT.md) |
| What it is built with and why | [docs/TECH_STACK.md](docs/TECH_STACK.md) |
| How it works inside: request flow, safety, privacy, security, paywall | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Every setting and environment variable | [docs/CONFIGURATION.md](docs/CONFIGURATION.md) |
| What changed, how to release, what is left to do | [docs/RELEASES.md](docs/RELEASES.md) |

## The app in 30 seconds
Two parts that talk over HTTPS/JSON:
- **`mobile/`** – the Expo / React Native app (the user interface, local encrypted storage, on-device emergency check).
- **`server/`** – a small stateless Next.js API that holds the Anthropic key, checks safety, calls Claude and validates the answer before returning it.

```
Phone ──► emergency check ──► server ──► limits, validation, subscription check ──► Claude ──► safety check ──► Phone
```

## Run it

```powershell
# 1. Server (the Anthropic key lives ONLY here)
cd server
copy .env.example .env          # set ANTHROPIC_API_KEY (and optionally CORS_ORIGINS for a deployed web build)
npm install
npx next dev -H 0.0.0.0 -p 3000

# 2. App
cd mobile
copy .env.example .env          # EXPO_PUBLIC_API_URL
npm install
npx expo start
```
`EXPO_PUBLIC_API_URL`: `http://localhost:3000` for the web preview, `http://10.0.2.2:3000` for the Android emulator, or `http://<your-PC-LAN-IP>:3000` for a physical phone (same Wi-Fi). Never put the Anthropic key in `mobile/`.
Voice *input* and purchases need a development build (`npx expo run:android|ios` or an EAS build); everything else works in Expo Go. In debug builds without RevenueCat keys the paywall is skipped.

## Checks

| Command | Where | What it does | Cost |
|---|---|---|---|
| `npm test` | server | Unit tests: safety rules, multilingual emergency phrases, translation invariants, CORS, abuse limits, subscription gate, encryption, **server⇄mobile rule parity** | free |
| `npm run eval` | server | **Live** model evals: safety cases, multilingual output, translation, progress/doctor-question behavior | uses API credits |
| `npx tsc --noEmit` | both | Typecheck | free |
| `npx expo lint` · `npx expo-doctor` | mobile | Lint · project health | free |

Run `npm run eval` after any change to prompts, schema or safety code. GitHub Actions (`.github/workflows/ci.yml`) runs the typechecks, lint and free tests on every push and pull request; the paid evals stay manual.

## Building and releasing
`mobile/eas.json` defines `development`, `preview` and `production` profiles (replace the two `REPLACE-WITH-…` API URLs first). The full release procedure, the real-device test checklist and the list of open items are in [docs/RELEASES.md](docs/RELEASES.md).

## Paywall setup
One yearly plan, no free trial, shown when someone taps Analyze (details in [ARCHITECTURE.md](ARCHITECTURE.md) section 9).
1. Create the yearly subscription in App Store Connect and Play Console (about $29.99, no introductory offer).
2. In RevenueCat: add both apps, an entitlement named `pro`, and an offering whose current package is the yearly product.
3. Put the public SDK keys in `mobile/.env` (`EXPO_PUBLIC_RC_IOS_KEY`, `EXPO_PUBLIC_RC_ANDROID_KEY`). Purchases need an EAS development or production build.
4. On the server set `REQUIRE_SUBSCRIPTION=true` and `REVENUECAT_SECRET_KEY`. Tune the monthly fair-use cap with `MONTHLY_ANALYSIS_LIMIT` (default 60) and `MONTHLY_AUX_LIMIT` (default 300); exact counts across instances need Redis.
5. Before release add working Terms and Privacy links (both stores require them) and test with sandbox purchases on a real device.

## Not built yet
Accounts and sync across devices · family profiles · embeddings / similar-case lookup (schema and opt-in endpoint exist) · right-to-left languages.
