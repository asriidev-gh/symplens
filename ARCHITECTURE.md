# SympLens – Architecture

> See it. Understand it. Know what to do next.

Two deployables: **`mobile/`** (Expo SDK 57, React Native, Expo Router, TypeScript) and **`server/`** (Next.js route handlers, TypeScript, stateless). Claude (vision + tools) is the analysis engine, called only from the server.

## 1. How a request flows

```
 Phone                                         Server (stateless)                     Claude
 ┌──────────────────────────┐   HTTPS/JSON    ┌───────────────────────────────┐      ┌────────┐
 │ UI · i18n (14 langs)     │ ──────────────► │ CORS → size/rate limit →      │ ───► │ vision │
 │ on-device emergency check│                 │ zod validate → image magic →  │ ◄─── │ + tool │
 │ local history + photos   │ ◄────────────── │ emergency pre-check → Claude  │      └────────┘
 │ (AsyncStorage / files)   │  validated JSON │ → schema → safety post-check  │
 └──────────────────────────┘                 └──────────────┬────────────────┘
                                                      opt-in only │
                                                    PostgreSQL + pgvector
                                              (anonymous patterns, never photos)
```

## 2. Principles (in priority order)
1. **Safety first.** Emergency detection runs on the phone *before* any network call and again on the server, in 14 languages. The model may raise urgency but never lower it below the deterministic floor (e.g. newborn + fever ⇒ urgent). Diagnostic or falsely reassuring wording is rejected and retried once; otherwise a safe failure screen is shown. Emergency guidance is never gated by account, paywall, or connectivity.
2. **Privacy.** The server never persists a photo or logs content. Photos stay on the device; the only time a stored photo leaves it is a user-initiated re-check (the earlier photo is sent with the new one for that single comparison). History is local. Private Mode disables saving. Analytics: none.
3. **Honesty.** No diagnosis, no accuracy percentages, no fake credentials. Limitations are shown with every result.

## 3. Folder structure
```
SympLens/
├─ ARCHITECTURE.md · README.md
├─ server/
│  ├─ db/schema.sql                       # anonymous_cases (pgvector); no photos, no free text
│  ├─ evals/*.eval.ts                     # LIVE model evals (cost credits): safety, i18n, translate, features
│  ├─ tests/                              # unit tests: safety rules, parity (server⇄mobile), CORS, pipeline
│  └─ src/
│     ├─ app/api/{analyze,followup,translate,contribute,health}/route.ts
│     └─ lib/{schema,safety,emergency-i18n,prompt,claude,pipeline,http,ratelimit,log,db}.ts
└─ mobile/
   ├─ assets/{diseases,logos}/             # scan-hero example photos, per-theme logos
   └─ src/
      ├─ app/                              # Expo Router: onboarding · (tabs) · analyze/{who,photo,describe} · processing · result · chat · about
      ├─ components/                       # ui, BottomSheet, Toast, TabBar, ScanHero, OnboardingArt, LanguageSheet, …
      ├─ lib/                              # api, store, session, safety(+emergency-i18n copy), photos, care, doctorSummary, …
      ├─ i18n/                             # en.ts is the source; 13 other languages must satisfy its type
      └─ theme/                            # 3 runtime-switchable themes
```

## 4. API (all JSON, `no-store`, CORS allow-list, rate-limited, body-size capped, no body logging)
| Route | Purpose |
|---|---|
| `POST /api/analyze` | Symptom or medical-report analysis (image/PDF optional). Optional `previous` (earlier check + optional earlier photo) enables cautious progress comparison. |
| `POST /api/followup` | "Ask SympLens" chat about an existing result. |
| `POST /api/translate` | Translates an existing result (text only). Output must keep urgency, enums, ids, lab values and list sizes identical to the source or it is rejected. |
| `POST /api/contribute` | Opt-in anonymous pattern contribution (requires `consent: true`). |
| `GET /api/health` | Liveness. |

## 5. Claude integration
`@anthropic-ai/sdk`, key in server env only. Current models reject forced `tool_choice`, so the call uses `tool_choice: auto` plus an explicit instruction, and the structured result is validated with zod (one retry). The tool schema's **first field is `response_language`**: committing to the language first keeps every text field in it (without this, Latin-script languages leaked English into the summary). User text is wrapped in `<user_input>` / `<previous_assessment>` tags and declared untrusted data. Thinking is always on for the model, so `max_tokens` leaves headroom.

## 6. Structured output
`AnalysisSchema` (`server/src/lib/schema.ts`): category, image_usable, summary, observations, possible_explanations (hedged, with confidence), urgency + reason, red_flags, next_steps, needs_follow_up + button-style follow_up_questions, limitations, optional lab_values, `questions_for_doctor`, and `progress_note` (only when an earlier check was provided).

## 7. Mobile architecture notes
- **State:** `StoreProvider` (settings, local history; the active theme is applied during render so all consumers re-render together); `session.ts` holds the in-memory analysis draft (photo base64 lives only here and is deleted when the result screen is left).
- **Themes:** `colors` / `urgencyStyle` / shadows are live objects overwritten by `applyTheme()`. Anything built with `StyleSheet.create` is created at render time (`makeStyles()`).
- **Languages:** add one `<code>.ts` typed `Dict`, register it in `i18n/index.ts` and `LOCALES` (mobile + server), add its emergency phrases to `emergency-i18n.ts` (both copies; a parity test enforces they match).
- **Progress tracking:** entries share a `trackId`; photos are saved only on explicit request and removed on every delete path.
- **Doctor summary:** HTML → PDF (`expo-print`) → share sheet (`expo-sharing`).
- **Find care:** opens the maps app with a localized search; SympLens never reads the user's location.

## 8. Security
HTTPS (enforce at the host) · server-side key · zod request validation · magic-byte image check · body-size limits · per-IP and per-install rate limits (in-memory: **use Redis/Upstash when running more than one instance**) · prompt-injection containment · response schema + safety validation · CORS allow-list (`CORS_ORIGINS`; localhost auto-allowed in development only) · generic client error messages.

## 9. Known gaps (see README for the release checklist)
Clinician review of emergency phrases/prompts and native-speaker review of translations · privacy policy & terms (placeholder) · Anthropic data-retention terms · local-history encryption at rest · RTL languages (Arabic/Hebrew) · accounts, subscriptions, family profiles · embeddings + similar-case lookup (schema and opt-in endpoint exist) · real-device testing of camera, picker, PDF, TTS, dictation and the PDF share sheet.
