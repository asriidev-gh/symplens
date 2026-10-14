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

Run `npm run eval` after any change to prompts, schema or safety code.

## Before a public release
- [ ] Clinician review of the emergency phrases (`emergency-i18n.ts`, `safety.ts`) and the prompts
- [ ] Native-speaker review of all translations, especially emergency/disclaimer text
- [ ] Privacy policy and terms (the Terms screen is a placeholder); confirm Anthropic's data-retention terms
- [ ] Test on real iOS and Android devices: camera, photo/PDF pickers, text-to-speech, dictation, PDF share sheet, maps link
- [ ] Encrypt local history at rest; Redis-backed rate limiting if running more than one server
- [ ] App icon / splash (currently Expo defaults; the extracted logos are ~264 px), EAS builds, store listings

## Not built yet
Accounts & subscriptions · family profiles · embeddings / similar-case lookup (schema and opt-in endpoint exist) · right-to-left languages.
