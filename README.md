# GreenKey Realty

Nyeri-focused real estate platform for rentals, sales, Airbnb stays, villas, plots, and farmland.

**Stack**

| Layer | Tech |
|--------|------|
| Web | Next.js (App Router) + Tailwind |
| Auth & API (BFF) | NestJS + JWT (phone / email OTP) |
| Ops data | PostgreSQL + Prisma (`PropertyMirror`, users, billing, leads) |
| Cache / OTP | Redis |
| CMS | Sanity (listings media & copy — **writes go through Nest**) |
| Maps | Mapbox |
| Messaging | Africa's Talking (SMS) + Infobip (WhatsApp) + email providers |
| Billing | M-Pesa Daraja STK Push + bank transfer |

Clerk has been removed. Identity, subscriptions, payments, leads ops, saved listings, and listing **writes** are owned by the Nest API + Postgres. Next.js reads Sanity for public pages; Nest holds the Sanity write token for create/update/delete and media upload.

More detail: [`docs/TECH_TALK_BFF.md`](docs/TECH_TALK_BFF.md) · [`docs/MOBILE_API.md`](docs/MOBILE_API.md)

---

## Repo layout

```
.
├── app/                 # Next.js App Router (web)
├── components/
├── actions/             # Server actions → Nest API only (no Sanity writes)
├── lib/
├── scripts/
│   └── with-system-ca.cjs   # Auto NODE_OPTIONS for Windows AV TLS
├── sanity/              # Sanity schemas + studio config
├── apps/api/            # NestJS BFF (@greenkey/api)
├── docs/                # DEPLOY, BFF tech talk, mobile contracts, messaging
├── Dockerfile.api       # Nest image for Railway
├── railway.toml
├── vercel.json
├── docker-compose.yml   # Local Postgres + Redis
└── package.json         # pnpm workspace root
```

API details: [`apps/api/README.md`](apps/api/README.md)

---

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io)
- Docker Desktop (Postgres + Redis)
- Sanity project (listings CMS)
- Mapbox token (maps / geocoding)

---

## Local setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start Postgres & Redis

```bash
pnpm docker:up
# or: docker compose up -d
```

| Service | Host | Credentials |
|---------|------|-------------|
| PostgreSQL | `localhost:5433` | user/db/password: `greenkey` |
| Redis | `localhost:6379` | no password |

> Host port **5433** avoids clashing with a local PostgreSQL install on `5432`.

**pgAdmin connection**

- Host: `localhost`
- Port: `5433`
- Database: `greenkey`
- Username / password: `greenkey`

**Redis URL:** `redis://localhost:6379`

### 3. Configure environment

**API** — copy and edit:

```bash
cp apps/api/.env.example apps/api/.env
```

Important vars:

```env
DATABASE_URL=postgresql://greenkey:greenkey@localhost:5433/greenkey?schema=public
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

# Nest owns Sanity writes (do not rely on NEXT_PUBLIC_* here)
SANITY_PROJECT_ID=...
SANITY_DATASET=production
SANITY_WRITE_TOKEN=...

# Phone OTP — SMS + WhatsApp in parallel
SMS_PROVIDER=africastalking   # or console | twilio
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=infobip     # or auto | console | off
AT_USERNAME=sandbox
AT_API_KEY=...
AT_SANDBOX=true
INFOBIP_BASE_URL=https://YOUR_SUBDOMAIN.api.infobip.com
INFOBIP_API_KEY=...
INFOBIP_WHATSAPP_FROM=447860099299

# Email OTP
EMAIL_PROVIDER=mailtrap       # or console | resend | sendgrid | smtp
```

**Web** — `.env.local` (project root), at minimum:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/v1
API_URL=http://localhost:4000/v1
NEXT_PUBLIC_SANITY_PROJECT_ID=...
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_MAPBOX_TOKEN=...
```

> Nest does **not** read root `.env.local`. Put `SANITY_*` write credentials in `apps/api/.env`.

### 4. Migrate the database

```bash
pnpm --filter @greenkey/api prisma:generate
pnpm --filter @greenkey/api prisma:migrate
# or: pnpm --filter @greenkey/api prisma:deploy
```

### 5. Run web + API

Two terminals:

```bash
# Terminal 1 — Nest API (http://localhost:4000/v1)
pnpm dev:api

# Terminal 2 — Next.js (http://localhost:3000)
pnpm dev
# or: npm run dev
```

Scripts automatically set `--use-system-ca` (via `scripts/with-system-ca.cjs`) so Sanity / Africa's Talking / Infobip HTTPS work on Windows hosts with AV TLS interception. You do **not** need to export `$env:NODE_OPTIONS` by hand.

Sanity Studio (embedded): [http://localhost:3000/studio](http://localhost:3000/studio)

---

## Auth & onboarding

### Sign-in

- **Phone OTP** (country picker) or **email OTP**
- Phone delivery: SMS + WhatsApp in parallel when enabled — [`apps/api/docs/MESSAGING.md`](apps/api/docs/MESSAGING.md)
- Email: `console` (local), `mailtrap` (QA), `mailtrap-send` / `resend` / `sendgrid` / `smtp` (prod) — [`apps/api/docs/EMAIL.md`](apps/api/docs/EMAIL.md)
- Dev OTP: logged in the API console; returned as `devCode` only when the provider is `console` / preview

### One account per phone / email

- Verifying OTP for a phone or email that already exists **logs into that account** (never creates a duplicate).
- If onboarding is already complete → redirect straight into the app (skip `/onboarding`).
- Accounts with both contacts verified and a name may be auto-marked onboarded on sign-in.

### Onboarding (`/onboarding`)

1. Enter **name**, **email**, and **phone**
2. Unverified phone → SMS/WhatsApp OTP → link to this account (`phoneVerifiedAt`)
3. Unverified email → email OTP → link (`emailVerifiedAt`)
4. Contacts already proven at sign-in are skipped
5. Complete only when both contacts are verified on the account

### Profile (`/profile`)

- Edit name freely
- Changing or adding **phone** or **email** requires a one-time code before it is saved
- Verified contacts show a “Verified — sign-in uses this account” hint

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/users/me/phone/request-verification` | Send phone OTP while authenticated |
| `POST` | `/users/me/phone/verify` | Link phone + set `phoneVerifiedAt` |
| `POST` | `/users/me/email/request-verification` | Send email OTP while authenticated |
| `POST` | `/users/me/email/verify` | Link email + set `emailVerifiedAt` |
| `POST` | `/users/onboarding` | Finish setup (requires verified phone + email) |
| `PATCH` | `/users/me` | Update name (phone/email via verify endpoints) |

JWT access cookies last ~15 minutes. `proxy.ts` rotates them via Nest `POST /auth/refresh` on protected navigations. Manual: `POST /api/auth/refresh`.

---

## Listings (Sanity + Postgres dual-write)

Agent listing create/update/delete goes **only** through Nest:

1. **Sanity** — full CMS document (media, copy, category fields)
2. **Postgres `PropertyMirror`** — searchable mirror **plus** full form payload:
   - Core: title, description, price, beds/baths, address, geo, amenities, images
   - Category packs in `details` JSON (rent / sale / Airbnb / villa / land / farmland)

Public browse still uses Sanity GROQ on Next; Nest/mobile can read mirrors from `/v1/properties`.

Media upload: `POST /v1/properties/media/upload` (Nest → Sanity assets).

---

## Property taxonomy

Shared constants: `lib/property-categories.ts`

| Axis | Values |
|------|--------|
| Listing category | `rent` · `sale` · `airbnb` |
| Property type | house, apartment, bedsitter, condo, townhouse, villa, land, farmland |

Conditional form fields in `components/forms/ListingForm.tsx` and Sanity `property` schema (furnished/deposit, title deed/open house, guests/nights, pool/staff, acreage/crops, etc.).

Deploy updated Sanity schemas from Studio when schema files change.

---

## Agent billing

- Agent plan unlocks the dashboard (default **KES 2,500 / 30 days** — `AGENT_PLAN_*` in API env)
- Pay via **M-Pesa STK** or **bank transfer** on `/pricing` and `/dashboard/billing`
- Without Daraja credentials, STK is simulated; complete with  
  `POST /v1/billing/mpesa/simulate-complete/:paymentId`
- Admin bank verify: `/dashboard/admin/payments`
- Agent **Invoices**: `/dashboard/invoices` (search, filter, export CSV)

---

## Useful scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` / `npm run dev` | Next.js web (system CA applied) |
| `pnpm dev:api` | Nest API watch mode (system CA applied) |
| `pnpm docker:up` / `docker:down` | Start/stop Postgres + Redis |
| `pnpm build` / `build:api` | Production builds |
| `pnpm typegen` | Sanity schema extract + TypeGen |
| `pnpm seed` | Seed Sanity sample data (Nyeri-oriented demo) |

---

## API overview

Base URL: `http://localhost:4000/v1`

| Area | Examples |
|------|----------|
| Auth | `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/refresh`, `GET /auth/me` |
| Users | `POST /users/onboarding`, `PATCH /users/me`, phone/email verify, saved listings |
| Agents | `POST /agents/ensure`, `POST /agents/onboarding` |
| Properties | `POST /properties`, `PUT /properties/:sanityId`, media upload, mirrors |
| Leads | `POST /leads`, `GET /leads/mine`, `PATCH /leads/:id/status` |
| Billing | `GET /billing/plan`, `POST /billing/mpesa/stk`, `POST /billing/bank` |
| Admin | `GET /admin/payments/pending`, `POST /admin/payments/:id/verify` |
| Health | `GET /health` |

**Swagger UI:** [http://localhost:4000/docs](http://localhost:4000/docs) — **Authorize** with a JWT from OTP verify.

Full route list: [`apps/api/README.md`](apps/api/README.md) · Mobile contracts: [`docs/MOBILE_API.md`](docs/MOBILE_API.md)

---

## Deploy notes

**Full step-by-step (dev → staging → prod):** [`docs/DEPLOY.md`](docs/DEPLOY.md)

**Stack:** Vercel (Next) · Railway (Nest + Postgres) · Upstash (Redis) · Sanity datasets

| Env | Branch | Web | API | Sanity |
|-----|--------|-----|-----|--------|
| Dev | local | `pnpm dev` | `pnpm dev:api` + Docker | local `.env` |
| Staging | `develop` | Vercel | Railway | dataset `staging` |
| Prod | `main` | Vercel | Railway | dataset `production` |

| Artifact | Path |
|----------|------|
| Env matrix | `deploy/environments.yaml` |
| Nest Docker | `Dockerfile.api` + `railway.toml` |
| Vercel | `vercel.json` |
| CI | `.github/workflows/ci.yml` |
| Deploy staging | `.github/workflows/deploy-staging.yml` |
| Deploy production | `.github/workflows/deploy-production.yml` |
| API env templates | `apps/api/.env.development.example`, `.env.staging.example`, `.env.production.example` |
| Web env template | `.env.example` |

Never put `SANITY_WRITE_TOKEN` or JWT secrets on Vercel — only on Railway Nest.
