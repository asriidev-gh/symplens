# SympLens – Releases and status

## Where the project stands
**Pre-release.** The code is feature-complete for a first beta but has **not** been published to TestFlight, Google Play or any hosted server, and has not yet been tested on real phones. App version in `mobile/app.json` is `1.0.0`; nothing has been tagged.

## Changelog
Newest first. All entries so far are from the initial build-out (2026-10-14).

### Unreleased
- **Scope narrowed to educational skin information** (Medgic-style, not a regulated medical device): skin-only prompt rule with look-alike naming, medical-report entry points removed, skin-focused text in all 14 languages, draft in-app Terms and Privacy (`mobile/src/lib/legal.ts`), updated evals. Live evals not yet rerun after this change
- **Monthly fair-use cap** per subscriber (60 analyses, 300 chat/translate calls, env-tunable) with a translated explanation in the app (`a4759ca`)
- **Yearly subscription paywall** via RevenueCat, no free trial, shown when tapping Analyze; server-side entitlement check returning 402; emergency guidance never gated (`df5ae5a`)
- **CI and EAS build profiles** (`58125f5`)
- **Saved progress photos encrypted at rest** (`7362e7e`)
- **Encrypted history at rest** and the **Automatic appearance** option (`7907752`)
- **Production hardening:** abuse protection (rate limits by trusted IP and install id, Redis counters, daily budget, body-size cap, CORS allow-list), negation-aware multilingual emergency rules, UX and performance fixes (`88259e1`)
- **Initial commit:** Expo app and Next.js API: analysis with Claude vision, 4-level urgency, emergency detection, onboarding, 3 themes with logos, 14 languages, result translation, progress tracking, doctor PDF, find care, bottom sheet and toast components (`684e882`)

## How to release (once the open items below are done)
1. **Server:** deploy behind a proxy that sets `X-Forwarded-For` (Vercel, Fly, nginx, ALB). Set the variables in [CONFIGURATION.md](CONFIGURATION.md). Check `GET /api/health`.
2. **Safety gate:** run `npm test` and `npm run eval` in `server/` (the evals cost API credits). Run the evals after any change to prompts, schema or safety code.
3. **Stores:** create the yearly subscription in App Store Connect and Play Console; set up RevenueCat (entitlement `pro`).
4. **Configure the app:** put the deployed API URL in `mobile/eas.json` and the RevenueCat keys in the EAS environment.
5. **Build:** `npx eas build --profile preview --platform android` (and ios) for internal testing, then `--profile production`.
6. **Test on real devices** (checklist below), then `npx eas submit` to TestFlight / Play internal testing.
7. **Tag and note:** add a section to this changelog, bump `version` in `mobile/app.json`, and `git tag vX.Y.Z`.

## Real-device test checklist
Camera and photo picker · PDF picker · text-to-speech · dictation · doctor PDF share sheet · maps link · tab bar and result layouts on small and large phones · encrypted history survives restarts · upgrade from an older plain-text history · "Delete all health data" · sandbox purchase, restore and cancel · paywall appears on Analyze only · emergency text works with no plan and no network.

## Open items before a public release
| Area | Item |
|---|---|
| Hosting | Deploy the server; Upstash Redis; spend limit on the Anthropic workspace; alerts on `budget_80_percent` / `budget_exhausted` |
| Store | Real app icon and splash (current logos are about 264 px); store listings and privacy labels; a public privacy-policy URL and a privacy contact (the in-app Terms and Privacy text is an unreviewed draft) |
| Safety | Clinician review of emergency phrases and prompts; clinician-labeled real-photo evaluation across skin tones, ages and body areas |
| Language | Native-speaker review of all 14 translations (the skin-only wording was machine-translated), especially emergency, disclaimer and paywall text; negation handling for Japanese, Korean and Hindi |
| Legal | Regulatory review (medical-device software rules); data-processing terms with the AI provider; Anthropic data-retention terms |
| Security | App attestation (App Attest / Play Integrity) so only the genuine app can call the API |
| Engineering | Streaming results, searchable/virtualized history, mobile unit and end-to-end tests, right-to-left languages |

## Not built yet
Accounts and sync across devices · family profiles · embeddings / similar-case lookup (schema and opt-in endpoint exist) · right-to-left languages.
