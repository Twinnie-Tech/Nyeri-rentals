# GreenKey — Step-by-step deployment (dev · staging · prod)

**Stack:** Vercel (Next) · Railway (Nest + Postgres) · Upstash (Redis) · Sanity (CMS)

| Env | Who | Web | API | Data |
|-----|-----|-----|-----|------|
| **dev** | Engineers | localhost:3000 | localhost:4000 | Docker Postgres/Redis |
| **staging** | Clients / QA | `staging.…` | `api-staging.…` | Railway DB + Upstash + Sanity `staging` |
| **prod** | Public | `yourdomain.com` | `api.…` | Railway DB + Upstash + Sanity `production` |

**Config map**

| File | Role |
|------|------|
| [`deploy/environments.yaml`](../deploy/environments.yaml) | Env matrix (URLs, secrets, branches) |
| [`Dockerfile.api`](../Dockerfile.api) | Nest image for Railway |
| [`railway.toml`](../railway.toml) | Railway build + healthcheck |
| [`vercel.json`](../vercel.json) | Next on Vercel |
| [`docker-compose.yml`](../docker-compose.yml) | Local Postgres + Redis |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Lint + API build + Docker build |
| [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml) | Deploy on `develop` |
| [`.github/workflows/deploy-production.yml`](../.github/workflows/deploy-production.yml) | Deploy on `main` |
| [`.github/dependabot.yml`](../.github/dependabot.yml) | Dependency PRs |
| `apps/api/.env.development.example` | Local API env |
| `apps/api/.env.staging.example` | Staging API env |
| `apps/api/.env.production.example` | Prod API env |
| [`.env.example`](../.env.example) | Next / Vercel env |

---

## Phase A — One-time account & GitHub setup

### A1. Create accounts
- [ ] GitHub repo (this project)  
- [ ] [Vercel](https://vercel.com)  
- [ ] [Railway](https://railway.app)  
- [ ] [Upstash](https://upstash.com)  
- [ ] [Sanity](https://www.sanity.io/manage)  

### A2. Branches
- [ ] `main` = production  
- [ ] `develop` = staging (create from `main` if missing)  
- [ ] Protect `main`: require PR + CI green + optional reviewer  

### A3. GitHub Environments
Repo → **Settings → Environments**:

1. Create **`staging`**
2. Create **`production`** → enable **Required reviewers**

Optional secrets (per environment) for CLI deploys:

| Secret | Purpose |
|--------|---------|
| `RAILWAY_TOKEN` | Railway account/project token |
| `RAILWAY_SERVICE_ID` | Nest service id |
| `RAILWAY_ENVIRONMENT_ID` | staging or production env id |
| `VERCEL_TOKEN` | Optional CLI deploy |
| `VERCEL_ORG_ID` | Optional |
| `VERCEL_PROJECT_ID` | Optional |

> If you skip CLI secrets, rely on **Railway + Vercel GitHub auto-deploy** (still works). Workflows will skip CLI steps gracefully.

---

## Phase B — Sanity (all environments)

### B1. Datasets
1. Sanity manage → project → **Datasets**  
2. Ensure:
   - `development` (optional for local)  
   - **`staging`** (create if needed)  
   - **`production`**  

### B2. Tokens
1. **API → Tokens → Add API token**  
2. Create **Editor** (write) token → use as Nest `SANITY_WRITE_TOKEN` (can reuse one token across envs, or separate)  
3. Optional **Viewer** token → Vercel `SANITY_API_READ_TOKEN` for previews  

### B3. CORS
Add origins:

- `http://localhost:3000`  
- `https://staging.yourdomain.com`  
- `https://yourdomain.com`  

### B4. Schema
Deploy/sync schemas from Studio so `staging` and `production` match repo schemas.

---

## Phase C — Upstash Redis

1. Create DB **`greenkey-staging`** → copy `REDIS_URL` (`rediss://…`)  
2. Create DB **`greenkey-prod`** → copy `REDIS_URL`  
3. Keep them for Phase E (Railway variables)

---

## Phase D — Local **dev** (must work before cloud)

### D1. Install & data plane
```bash
pnpm install
pnpm docker:up
```

### D2. API env
```bash
cp apps/api/.env.development.example apps/api/.env
# Fill SANITY_PROJECT_ID + SANITY_WRITE_TOKEN
```

### D3. Web env
```bash
cp .env.example .env.local
# Fill Sanity project id, dataset, Mapbox, API URL
```

### D4. Migrate & run
```bash
pnpm --filter @greenkey/api exec prisma generate
pnpm --filter @greenkey/api prisma:deploy
pnpm dev:api    # terminal 1 → http://localhost:4000/v1
pnpm dev        # terminal 2 → http://localhost:3000
```

### D5. Dev smoke
- [ ] `GET http://localhost:4000/v1/health` → `db` + `redis` true  
- [ ] Sign-in OTP (console providers print codes in API logs)  
- [ ] Create listing after agent plan (if testing agents)

---

## Phase E — Railway **staging** API

### E1. Project
1. Railway → **New Project** → **Deploy from GitHub** → this repo  
2. Confirm root is repo root (`Dockerfile.api` + `railway.toml`)  

### E2. Postgres
1. **Add Plugin → PostgreSQL**  
2. Confirm `DATABASE_URL` appears on the Nest service  

### E3. Variables
Open Nest service → **Variables**. Copy from `apps/api/.env.staging.example` and set:

| Variable | Staging value |
|----------|----------------|
| `NODE_ENV` | `staging` |
| `PORT` | `4000` |
| `DATABASE_URL` | (from plugin) |
| `REDIS_URL` | Upstash staging |
| `JWT_ACCESS_SECRET` | unique random ≥32 chars |
| `JWT_REFRESH_SECRET` | unique random ≥32 chars |
| `APP_URL` | `https://staging.yourdomain.com` |
| `API_URL` | `https://api-staging.yourdomain.com` (or Railway `*.up.railway.app`) |
| `CORS_ORIGINS` | `https://staging.yourdomain.com` |
| `SANITY_PROJECT_ID` | your project |
| `SANITY_DATASET` | **`staging`** |
| `SANITY_WRITE_TOKEN` | write token |
| Messaging / Mailtrap / M-Pesa sandbox | as in staging example |

### E4. Networking
1. **Settings → Networking → Generate domain**  
2. Optional custom domain: `api-staging.yourdomain.com`  
3. Update `API_URL` + `MPESA_CALLBACK_URL` to that public URL  

### E5. Git trigger
- Watch branch: **`develop`**  
- Environment name: **staging**  

### E6. Deploy
Push to `develop` or **Deploy** in Railway UI.  
Container runs: `prisma migrate deploy` → `node dist/main.js`.

### E7. Verify API
```text
GET https://api-staging…/v1/health
→ {"ok":true,"db":true,"redis":true,...}
```
Swagger: `https://api-staging…/docs`

---

## Phase F — Vercel **staging** web

### F1. Import
1. Vercel → **Add New** → Import GitHub repo  
2. Framework: Next.js (`vercel.json`)  

### F2. Environment variables
Project → **Settings → Environment Variables**  
Scope to **Preview** and/or a Staging environment:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://api-staging…/v1` |
| `API_URL` | same |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | project id |
| `NEXT_PUBLIC_SANITY_DATASET` | **`staging`** |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | token |

**Do not** add `SANITY_WRITE_TOKEN` or JWT secrets.

### F3. Branch / domain
1. Production Branch = `main`  
2. Assign `staging.yourdomain.com` to deployments from **`develop`**  
3. Redeploy after env changes  

### F4. Staging smoke (clients)
- [ ] Open staging site → sign-in OTP  
- [ ] Onboarding: verify phone + email  
- [ ] Agent pay (M-Pesa sandbox / simulate)  
- [ ] Create listing → Sanity dataset `staging` + Postgres mirror  
- [ ] No prod credentials used  

---

## Phase G — Railway **production** API

Repeat Phase E with a **separate** Railway environment or project:

| Item | Production |
|------|------------|
| Branch | `main` |
| Postgres | **new** production database |
| Redis | Upstash `greenkey-prod` |
| Env file | `apps/api/.env.production.example` |
| `SANITY_DATASET` | `production` |
| `AT_SANDBOX` | `false` |
| `MPESA_ENV` | `production` (when go-live) |
| Email | real provider (`mailtrap-send` / Resend / …) |
| Domains | `api.yourdomain.com` |

Use **different** JWT secrets from staging.

---

## Phase H — Vercel **production** web

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com/v1` |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` |
| Domain | `yourdomain.com` / `www` |
| Branch | `main` |

---

## Phase I — GitHub Actions wiring

Workflows already in repo:

| Workflow | Trigger |
|----------|---------|
| `ci.yml` | PR/push `main` + `develop` |
| `deploy-staging.yml` | push `develop` |
| `deploy-production.yml` | push `main` (Environment approval) |

### Recommended path (simplest)
1. Enable **Railway GitHub** deploy: `develop`→staging, `main`→production  
2. Enable **Vercel GitHub** deploy similarly  
3. Leave `RAILWAY_TOKEN` empty until you want Actions-driven `railway up`  

### Optional CLI path
1. Create Railway token + copy service/environment IDs  
2. Add secrets to GitHub Environments `staging` / `production`  
3. Push to `develop` / `main` → Actions deploys API  

---

## Phase J — Go-live checklist (prod)

- [ ] Health OK on prod API  
- [ ] OTP email reaches real inbox  
- [ ] OTP SMS/WhatsApp on live providers  
- [ ] M-Pesa callback URL reachable publicly  
- [ ] Listing create writes Sanity `production` + mirror  
- [ ] CORS only allows prod web origin  
- [ ] Staging still isolated (different DB + dataset)  

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `redis: false` on health | Set `REDIS_URL` (Upstash `rediss://`) |
| Sanity write errors | Nest `SANITY_WRITE_TOKEN` + correct `SANITY_DATASET` |
| CORS errors | `CORS_ORIGINS` must match exact Next origin |
| Migrate fails on boot | Check `DATABASE_URL`; ensure migrations committed under `apps/api/prisma/migrations` |
| Docker build fails in CI | See `ci.yml` job `api-docker`; run locally: `docker build -f Dockerfile.api .` |
| OTP works locally only | Staging must not use `SMS_PROVIDER=console` unless you read Railway logs |

---

## Quick command cheat sheet

```bash
# Dev
pnpm docker:up
pnpm dev:api
pnpm dev

# Build API image locally
docker build -f Dockerfile.api -t greenkey-api .

# Prisma on cloud-like migrate
pnpm --filter @greenkey/api prisma:deploy
```

Architecture context: [`TECH_TALK_BFF.md`](./TECH_TALK_BFF.md) · Mobile: [`MOBILE_API.md`](./MOBILE_API.md)
