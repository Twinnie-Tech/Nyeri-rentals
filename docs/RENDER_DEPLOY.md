# Deploy Nest API + Postgres on Render

Railway free-tier often blocks deploys in `us-west2` during peak hours (8 AM–8 PM America/Los_Angeles). Use **Render** for staging API + Postgres instead. Keep **Vercel** (web), **Upstash** (Redis), and **Sanity** (`staging`).

| Layer | Host |
|-------|------|
| Web | Vercel (`develop`) |
| API | Render Web Service (Docker → `Dockerfile.api`) |
| Postgres | Render Postgres |
| Redis | Upstash `greenkey-staging` |
| CMS | Sanity `staging` |

Also see [`STAGING_GO_LIVE.md`](./STAGING_GO_LIVE.md) · [`DEPLOY.md`](./DEPLOY.md) · Blueprint: [`render.yaml`](../render.yaml)

---

## Option A — Blueprint (recommended)

1. Push your latest `develop` branch to GitHub (includes `Dockerfile.api` + `render.yaml`).
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the **Nyeri-rentals** repo → select `render.yaml` → apply.
4. After create, open **greenkey-api-staging** → **Environment** and set the `sync: false` vars:

| Variable | Value |
|----------|--------|
| `REDIS_URL` | Upstash `rediss://…` |
| `SANITY_PROJECT_ID` | `1nfit4k5` |
| `SANITY_WRITE_TOKEN` | Editor write token |
| `APP_URL` | Your Vercel staging URL (e.g. `https://….vercel.app`) |
| `API_URL` | `https://greenkey-api-staging.onrender.com` (no `/v1`) |
| `CORS_ORIGINS` | Exact Vercel origin (same as `APP_URL`) |
| `MPESA_CALLBACK_URL` | `https://greenkey-api-staging.onrender.com/v1/billing/mpesa/callback` |

5. **Manual Deploy** → wait until healthy.
6. Smoke:

```powershell
node scripts/smoke-staging.mjs https://greenkey-api-staging.onrender.com/v1
```

Swagger: `https://greenkey-api-staging.onrender.com/docs`

---

## Option B — Manual (no Blueprint)

### B1. Postgres
1. **New** → **PostgreSQL** → name `greenkey-staging-db` → Free plan.  
2. Copy **Internal Database URL** (preferred) or External if needed.  
3. Prisma needs SSL — Render URLs usually already include `sslmode=require`.

### B2. Web service
1. **New** → **Web Service** → this GitHub repo.  
2. Settings:
   - **Branch:** `develop`
   - **Runtime:** Docker
   - **Dockerfile path:** `Dockerfile.api`
   - **Docker build context:** `.` (repo root)
   - **Health check path:** `/v1/health`
3. Paste env from `apps/api/.env.staging.example` + `DATABASE_URL` from B1 + Upstash `REDIS_URL`.
4. Deploy.

---

## Vercel wiring

On the Vercel project (Preview / `develop`):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://greenkey-api-staging.onrender.com/v1` |
| `API_URL` | same |

Redeploy the web app after changing these.

---

## Notes

- **Free web services spin down** after idle (~15 min). First request after sleep can take 30–60s — warm the health URL before a talk demo.
- **OTP:** with `SMS_PROVIDER=console` / `EMAIL_PROVIDER=console`, codes appear in **Render → Logs**.
- **Do not** use Railway `postgres.railway.internal` URLs on Render.
- GitHub Action `deploy-staging.yml` Railway CLI steps are optional; Render auto-deploys from `develop` when the service is linked to GitHub.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails on Docker | Confirm Dockerfile path `Dockerfile.api` and context `.` |
| Migrate / P1001 | `DATABASE_URL` must be the **Render** Postgres URL for this service |
| `redis: false` on health | Set Upstash `REDIS_URL` (`rediss://`) |
| CORS errors from Vercel | `CORS_ORIGINS` must match the browser origin exactly |
| Health check timeout | First boot runs `prisma migrate deploy`; allow longer start, or redeploy once DB is ready |
