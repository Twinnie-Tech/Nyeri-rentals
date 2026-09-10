# Staging go-live — talk URL + client QA

Target stack (from [`deploy/environments.yaml`](../deploy/environments.yaml)):

| Layer | Host |
|-------|------|
| Web | Vercel (branch **`develop`**) |
| API | Railway (environment **staging**) |
| Postgres | Railway Postgres (staging) |
| Redis | Upstash **`greenkey-staging`** |
| CMS | Sanity dataset **`staging`** |

Full reference: [`DEPLOY.md`](./DEPLOY.md). Env templates: `apps/api/.env.staging.example` · `.env.example`.

---

## 0. Branch contract

Deploy workflows + Vercel/Railway watch **`develop`** for staging.

```powershell
# From a clean, reviewable commit of your work:
git checkout main
git pull origin main
git checkout -b develop
# merge or cherry-pick your feature branch, then:
git push -u origin develop
```

Until `develop` exists, GitHub Actions `deploy-staging.yml` and Vercel `develop` deploys will not run.

---

## 1. One-time cloud setup (do in order)

### 1a. Sanity
1. [Sanity Manage](https://www.sanity.io/manage) → project **`1nfit4k5`**  
2. Dataset **`staging`** — already created (public ACL) for this go-live  
3. API → Tokens → **Editor** write token → Nest `SANITY_WRITE_TOKEN`  
4. CORS — `http://localhost:3000` and `https://*.vercel.app` are configured; add custom domains when ready  
5. Open Studio once with `NEXT_PUBLIC_SANITY_DATASET=staging` so schema/content exist for QA  

### 1b. Upstash
1. Create Redis DB **`greenkey-staging`**.
2. Copy `REDIS_URL` (`rediss://…`).

### 1c. Railway (API + Postgres)
1. New Project → Deploy from GitHub → this repo.
2. Confirm builder uses `Dockerfile.api` / `railway.toml`.
3. Add **PostgreSQL** plugin → `DATABASE_URL` on the API service.
4. Create environment **staging**; watch branch **`develop`**.
5. Generate public domain (e.g. `*.up.railway.app`).
6. Paste variables from `apps/api/.env.staging.example`:

| Must set | Notes |
|----------|--------|
| `DATABASE_URL` | From Postgres plugin |
| `REDIS_URL` | Upstash staging |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Random ≥32 chars each |
| `APP_URL` | Vercel staging URL (update after step 1d) |
| `API_URL` | Railway public URL (no trailing `/v1`) |
| `CORS_ORIGINS` | Exact Vercel origin (comma-separated if several) |
| `SANITY_PROJECT_ID` / `SANITY_DATASET=staging` / `SANITY_WRITE_TOKEN` | |
| `ALLOW_PAYMENT_SIMULATE=true` | Talk-safe plan unlock |
| `SMS_PROVIDER=console` / `EMAIL_PROVIDER=console` | OTP in Railway logs |

7. Deploy → wait for healthy.

```text
GET https://<railway-host>/v1/health
→ {"ok":true,"db":true,"redis":true,...}
```

Swagger: `https://<railway-host>/docs`

### 1d. Vercel (web)
1. Import GitHub repo → Framework Next.js.
2. Production Branch = `main`.
3. Enable deployments for **`develop`**.
4. Environment variables (Preview / develop):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://<railway-host>/v1` |
| `API_URL` | same |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | project id |
| `NEXT_PUBLIC_SANITY_DATASET` | `staging` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox token |

5. Deploy `develop` → copy the Vercel URL.
6. **Back to Railway:** set `APP_URL` + `CORS_ORIGINS` to that exact Vercel origin; redeploy API if needed.

### 1e. Optional custom domains
Point `staging.yourdomain.com` → Vercel and `api-staging.yourdomain.com` → Railway, then update `APP_URL`, `API_URL`, `CORS_ORIGINS`, Vercel env, Sanity CORS, and `environments.yaml` URLs.

---

## 2. Talk-safe smoke test

```powershell
# From repo root — set your live API host:
$env:SMOKE_API_URL = "https://<railway-host>/v1"
node scripts/smoke-staging.mjs
```

Manual checklist:

- [ ] `GET /v1/health` → `ok`, `db`, `redis` all true  
- [ ] Open Vercel URL → home + `/properties` load  
- [ ] `/sign-in` → request OTP → copy code from **Railway logs** (`[console sms]` / email)  
- [ ] Verify → cookies set; Navbar shows signed-in  
- [ ] Save a listing → `/saved`  
- [ ] `/pricing` → STK without M-Pesa keys → UI simulate-complete → agent unlock  
- [ ] Create listing → Sanity dataset `staging` + Postgres mirror  
- [ ] Swagger `/docs` → Authorize Bearer → `GET /auth/me`  

---

## 3. Client QA hardening (after talk)

On Railway staging, switch from console providers:

- `SMS_PROVIDER=africastalking` + sandbox keys  
- `EMAIL_PROVIDER=mailtrap` + Mailtrap inbox  
- Optional real Daraja sandbox keys (or keep simulate)  
- Keep `SANITY_DATASET=staging` and a **separate** Postgres from production  

---

## 4. GitHub (optional CLI deploy)

Repo → Settings → Environments → **`staging`**:

- `RAILWAY_TOKEN`, `RAILWAY_SERVICE_ID`, `RAILWAY_ENVIRONMENT_ID`  

If unset, rely on Railway + Vercel **GitHub auto-deploy** from `develop` (recommended).

---

## 5. Update the env matrix

After first successful deploy, edit [`deploy/environments.yaml`](../deploy/environments.yaml) staging `urls:` with the real hosts so the talk script and teammates stay aligned.
