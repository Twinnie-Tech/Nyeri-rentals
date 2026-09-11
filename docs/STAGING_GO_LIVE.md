# Staging go-live — talk URL + client QA

Target stack (from [`deploy/environments.yaml`](../deploy/environments.yaml)):

| Layer | Host |
|-------|------|
| Web | Vercel (branch **`develop`**) |
| API | **Render** Web Service (`Dockerfile.api`) |
| Postgres | **Render** Postgres |
| Redis | Upstash **`greenkey-staging`** |
| CMS | Sanity dataset **`staging`** |

> **API host:** use Render (not Railway). Railway free-tier blocks peak-hour deploys in `us-west2`. Step-by-step: [`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md).

Full reference: [`DEPLOY.md`](./DEPLOY.md). Env templates: `apps/api/.env.staging.example` · `.env.example`.

---

## 0. Branch contract

Vercel + Render watch **`develop`** for staging.

```powershell
git checkout develop
git push -u origin develop
```

---

## 1. One-time cloud setup (do in order)

### 1a. Sanity
1. [Sanity Manage](https://www.sanity.io/manage) → project **`1nfit4k5`**
2. Dataset **`staging`** — already created (public ACL)
3. API → Tokens → **Editor** write token → Nest `SANITY_WRITE_TOKEN`
4. CORS — `http://localhost:3000` and `https://*.vercel.app` are configured
5. Open Studio once with `NEXT_PUBLIC_SANITY_DATASET=staging` for QA content

### 1b. Upstash
1. Create Redis DB **`greenkey-staging`**
2. Copy `REDIS_URL` (`rediss://…`)

### 1c. Render (API + Postgres)
Follow [`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md) — Blueprint `render.yaml` or manual Web Service + Postgres.

| Must set | Notes |
|----------|--------|
| `DATABASE_URL` | Auto from Render Postgres |
| `REDIS_URL` | Upstash staging |
| `APP_URL` | Vercel staging URL |
| `API_URL` | `https://greenkey-api-staging.onrender.com` |
| `CORS_ORIGINS` | Exact Vercel origin |
| `SANITY_PROJECT_ID` / `SANITY_DATASET=staging` / `SANITY_WRITE_TOKEN` | |
| `ALLOW_PAYMENT_SIMULATE=true` | Talk-safe plan unlock |
| `SMS_PROVIDER=console` / `EMAIL_PROVIDER=console` | OTP in **Render logs** |

```text
GET https://greenkey-api-staging.onrender.com/v1/health
→ {"ok":true,"db":true,"redis":true,...}
```

### 1d. Vercel (web)
| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://greenkey-api-staging.onrender.com/v1` |
| `API_URL` | same |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `1nfit4k5` |
| `NEXT_PUBLIC_SANITY_DATASET` | `staging` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox token |

Deploy branch **`develop`**, then set Render `APP_URL` + `CORS_ORIGINS` to the Vercel origin.

---

## 2. Talk-safe smoke test

```powershell
node scripts/smoke-staging.mjs https://greenkey-api-staging.onrender.com/v1
```

- [ ] Health → `ok`, `db`, `redis` true  
- [ ] Vercel site → `/properties`  
- [ ] `/sign-in` → OTP from **Render logs**  
- [ ] Save listing → `/saved`  
- [ ] `/pricing` → simulate-complete → agent unlock  
- [ ] Create listing → Sanity `staging` + mirror  
- [ ] Swagger `/docs` → Bearer → `GET /auth/me`  

Warm the Render URL before the talk (free tier sleeps when idle).

---

## 3. Client QA hardening

On Render staging, switch from console providers when ready (Mailtrap / AT sandbox). Keep a separate DB from production.

---

## 4. Update the env matrix

After first successful deploy, edit [`deploy/environments.yaml`](../deploy/environments.yaml) staging `urls:` with the real hosts.
