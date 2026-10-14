# SympLens – AI Symptoms Analyzer

> See it. Understand it. Know what to do next.

Design, privacy, security and medical-safety details: [ARCHITECTURE.md](ARCHITECTURE.md).

## Run it

```powershell
# 1. Server (the Anthropic key lives ONLY here)
cd server
copy .env.example .env          # set ANTHROPIC_API_KEY (and optionally CORS_ORIGINS for a deployed web build)
npx next dev -H 0.0.0.0 -p 3000

# 2. App
cd mobile
copy .env.example .env          # EXPO_PUBLIC_API_URL
npx expo start
```
`EXPO_PUBLIC_API_URL`: `http://localhost:3000` for the web preview, `http://10.0.2.2:3000` for the Android emulator, or `http://<your-PC-LAN-IP>:3000` for a physical phone (same Wi-Fi). Never put the Anthropic key in `mobile/`.
Voice *input* needs a development build (`npx expo run:android|ios`); everything else works in Expo Go.

## Checks

| Command | Where | What it does | Cost |
|---|---|---|---|
| `npm test` | server | Unit tests: safety rules, multilingual emergency phrases, translation invariants, CORS, **server⇄mobile rule parity** | free |
| `npm run eval` | server | **Live** model evals: 16 safety cases, multilingual output, translation, progress/doctor-question behavior | uses API credits |
| `npx tsc --noEmit` | both | Typecheck | free |
| `npx expo lint` · `npx expo-doctor` | mobile | Lint · project health | free |

Run `npm run eval` after any change to prompts, schema or safety code. GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, lint and the free tests on every push and pull request; the paid evals stay manual.

## Building the app
`mobile/eas.json` defines `development`, `preview` and `production` profiles. Replace the two `REPLACE-WITH-…` API URLs with your deployed server, then `npx eas build --profile preview --platform android`.

## Before a public release
- [ ] Clinician review of the emergency phrases (`emergency-i18n.ts`, `safety.ts`) and the prompts
- [ ] Native-speaker review of all translations, especially emergency/disclaimer text
- [ ] Privacy policy and terms (the Terms screen is a placeholder); confirm Anthropic's data-retention terms
- [ ] Test on real iOS and Android devices: camera, photo/PDF pickers, text-to-speech, dictation, PDF share sheet, maps link
- [x] History and saved photos are encrypted at rest (Android cloud backup is disabled)
- [ ] Production env: `UPSTASH_REDIS_REST_*`, `TRUSTED_PROXY_HOPS`, `DAILY_*_LIMIT`; alert on `budget_80_percent` / `budget_exhausted`; spend limit on the Anthropic workspace
- [ ] App attestation (App Attest / Play Integrity) so only the genuine app can call the API
- [ ] Clinician-labeled real-photo evaluation across skin tones, ages and body areas (the live evals are text-only plus one synthetic image)
- [ ] Negation handling for Japanese, Korean and Hindi emergency phrases (currently high-recall; other languages are negation-aware)
- [ ] Regulatory review (medical-device software rules) and privacy/terms; data-processing terms with the AI provider
- [ ] App icon / splash (currently Expo defaults; the extracted logos are ~264 px), EAS builds, store listings

## Paywall setup
1. Create the yearly subscription in App Store Connect and Play Console (price e.g. $29.99, no introductory offer).
2. In RevenueCat: add both apps, an entitlement named `pro`, and an offering whose current package is the yearly product.
3. Put the public SDK keys in `mobile/.env` (`EXPO_PUBLIC_RC_IOS_KEY`, `EXPO_PUBLIC_RC_ANDROID_KEY`). Purchases need an EAS development or production build (not Expo Go).
4. On the server set `REQUIRE_SUBSCRIPTION=true` and `REVENUECAT_SECRET_KEY`.
5. Before release add a working Terms and Privacy link (both stores require them for subscriptions), and test with sandbox/test purchases on a real device.

## Not built yet
Accounts & subscriptions · family profiles · embeddings / similar-case lookup (schema and opt-in endpoint exist) · right-to-left languages.
