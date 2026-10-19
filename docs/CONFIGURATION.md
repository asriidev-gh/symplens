# SympLens – Configuration reference

## Server (`server/.env`, copy from `.env.example`)
| Variable | Required | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | yes | – | Claude access. Server only, never in the app |
| `CLAUDE_MODEL` | no | `claude-sonnet-5-5` | Model id |
| `CLAUDE_EFFORT` | no | `medium` | Reasoning effort (made no measurable speed difference) |
| `CORS_ORIGINS` | for web builds | localhost in dev | Comma-separated allowed web origins |
| `TRUSTED_PROXY_HOPS` | production | 1 | Proxies in front of the server; the client IP is taken that many entries from the **right** of `X-Forwarded-For` |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | production | – | Shared rate-limit, budget and quota counters. Without them, limits are per instance |
| `DAILY_ANALYSIS_LIMIT` | no | 3000 | Global daily cap on analyses (alert on `budget_80_percent`, `budget_exhausted`) |
| `DAILY_AUX_LIMIT` | no | 6000 | Global daily cap on chat/translate calls |
| `REQUIRE_SUBSCRIPTION` | production | `false` | Turn the paywall check on |
| `REVENUECAT_SECRET_KEY` | with paywall | – | RevenueCat **secret** v1 key |
| `REVENUECAT_ENTITLEMENT` | no | `pro` | Entitlement name |
| `MONTHLY_ANALYSIS_LIMIT` | no | 60 | Per-subscriber analyses per UTC month |
| `MONTHLY_AUX_LIMIT` | no | 300 | Per-subscriber chat/translate calls per UTC month |
| `DATABASE_URL` | no | – | Only for the opt-in anonymous-pattern feature |

## App (`mobile/.env`)
| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Server URL: `http://localhost:3000` (web), `http://10.0.2.2:3000` (Android emulator), `http://<PC-LAN-IP>:3000` (phone) |
| `EXPO_PUBLIC_RC_IOS_KEY` / `EXPO_PUBLIC_RC_ANDROID_KEY` | RevenueCat **public** SDK keys. Empty means debug builds treat everyone as subscribed |

`EXPO_PUBLIC_*` values are bundled into the app: never put secrets there.

## EAS build profiles (`mobile/eas.json`)
`development` (dev client, emulator API), `preview` (internal testing), `production` (store). Replace the two `REPLACE-WITH-…` API URLs before building.

## App behavior flags (`mobile/app.json`)
`userInterfaceStyle: automatic` (needed for the Automatic theme), `android.allowBackup: false` (keeps health data out of cloud backups), bundle id / package `app.symplens.mobile`.
