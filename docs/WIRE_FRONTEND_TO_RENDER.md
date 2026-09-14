# Wire Next.js UI → Render API

Render API (verified healthy): `https://greenkey-api-staging.onrender.com/v1`

The browser never calls Render directly for auth. Flow:

```text
Browser → Next `/api/auth/*` → Nest on Render (`API_URL` + `/auth/...`)
```

If Next still has `localhost:4000`, you get **fetch failed** and **no Render logs**.

---

## 1. Local Next → Render API

In `.env.local` (already set for staging):

```env
NEXT_PUBLIC_API_URL=https://greenkey-api-staging.onrender.com/v1
API_URL=https://greenkey-api-staging.onrender.com/v1
NEXT_PUBLIC_SANITY_DATASET=staging
```

Restart the Next dev server after changing env:

```powershell
# stop npm/pnpm run dev, then:
pnpm dev
```

Optional: wake Render before first request (free tier sleeps):

```powershell
Invoke-RestMethod https://greenkey-api-staging.onrender.com/v1/health
```

---

## 2. Vercel web → Render API (required for live site)

Vercel → Project → **Settings → Environment Variables** (Preview / Production as needed):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_URL` | `https://greenkey-api-staging.onrender.com/v1` |
| `API_URL` | `https://greenkey-api-staging.onrender.com/v1` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `1nfit4k5` |
| `NEXT_PUBLIC_SANITY_DATASET` | `staging` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | your Mapbox token |

**Redeploy** the Vercel project after saving (env is baked into the build for `NEXT_PUBLIC_*`).

---

## 3. Render API CORS / APP_URL

On **greenkey-api-staging** Environment:

| Name | Value |
|------|--------|
| `API_URL` | `https://greenkey-api-staging.onrender.com` (no `/v1`) |
| `APP_URL` | your Vercel URL **or** `http://localhost:3000` while testing locally |
| `CORS_ORIGINS` | same as `APP_URL` (comma-separated if both: `http://localhost:3000,https://your-app.vercel.app`) |

OTP via Next BFF does not need CORS, but keep origins correct for any browser→API calls and redirects.

Redeploy Render after changing env.

---

## 4. Quick checks

```powershell
# API up
Invoke-RestMethod https://greenkey-api-staging.onrender.com/v1/health

# From repo (after local Next restart)
# Open http://localhost:3000/sign-in → request OTP
# Render → Logs should show OTP / SMS / Mailtrap activity
```

Swagger: https://greenkey-api-staging.onrender.com/docs

---

## Switch back to local Nest

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/v1
API_URL=http://localhost:4000/v1
```

Then `pnpm docker:up` + `pnpm dev:api` + `pnpm dev`.
