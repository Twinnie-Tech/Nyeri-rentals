# GreenKey Realty

Nyeri-focused real estate platform for rentals, sales, Airbnb stays, villas, plots, and farmland.

**Stack**

| Layer | Tech |
|--------|------|
| Web | Next.js (App Router) + Tailwind |
| Auth & API (BFF) | NestJS + JWT (phone / email OTP) |
| Ops data | PostgreSQL + Prisma |
| Cache / OTP | Redis |
| CMS | Sanity (listings media & copy) |
| Maps | Mapbox |
| Billing | M-Pesa Daraja STK Push + bank transfer |

Clerk has been removed. Identity, subscriptions, payments, leads ops, and saved listings are owned by the Nest API + Postgres. Sanity remains the CMS for property content.

---

## Repo layout

```
.
├── app/                 # Next.js App Router (web)
├── components/
├── actions/             # Server actions → Nest API / Sanity
├── lib/
├── sanity/              # Sanity schemas + studio config
├── apps/api/            # NestJS BFF (@greenkey/api)
├── docker-compose.yml   # Postgres + Redis
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
SANITY_PROJECT_ID=...
SANITY_DATASET=production
SANITY_WRITE_TOKEN=...
```

**Web** — `.env.local` (project root), at minimum:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/v1
API_URL=http://localhost:4000/v1
NEXT_PUBLIC_SANITY_PROJECT_ID=...
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_MAPBOX_TOKEN=...
```

### 4. Migrate the database

```bash
pnpm --filter @greenkey/api prisma:generate
pnpm --filter @greenkey/api prisma:migrate
```

### 5. Run web + API

Two terminals:

```bash
# Terminal 1 — Nest API (http://localhost:4000/v1)
pnpm dev:api

# Terminal 2 — Next.js (http://localhost:3000)
pnpm dev
```

Sanity Studio (embedded): [http://localhost:3000/studio](http://localhost:3000/studio)

---

## Auth & onboarding

- Sign-in: **phone OTP** (country code + flag) or **email OTP**
- Dev OTP: logged in the API console; also returned as `devCode` when `SMS_PROVIDER` / `EMAIL_PROVIDER` is `console`
- Onboarding collects **name, email, and phone** (both contact fields editable)
- Profile page allows editing name, email, and phone (unique constraints with clear errors)

---

## Agent billing

- Agent plan unlocks the dashboard (default **KES 2,500 / 30 days** — see `AGENT_PLAN_*` in API env)
- Pay via **M-Pesa STK** or **bank transfer** on `/pricing` and `/dashboard/billing`
- Without Daraja credentials, STK is simulated; complete with  
  `POST /v1/billing/mpesa/simulate-complete/:paymentId`
- Agent **Invoices** table: `/dashboard/invoices` (search, filter, export CSV)

---

## Useful scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Next.js web |
| `pnpm dev:api` | Nest API watch mode |
| `pnpm docker:up` / `docker:down` | Start/stop Postgres + Redis |
| `pnpm build` / `build:api` | Production builds |
| `pnpm typegen` | Sanity schema extract + TypeGen |
| `pnpm seed` | Seed Sanity sample data |

---

## API overview

Base URL: `http://localhost:4000/v1`

| Area | Examples |
|------|----------|
| Auth | `POST /auth/otp/request`, `POST /auth/otp/verify`, `GET /auth/me` |
| Users | `POST /users/onboarding`, `PATCH /users/me`, saved listings |
| Agents | `POST /agents/ensure`, `POST /agents/onboarding` |
| Billing | `GET /billing/plan`, `POST /billing/mpesa/stk`, `GET /billing/payments` |
| Health | `GET /health` |

Full route list: [`apps/api/README.md`](apps/api/README.md)

---

## Property taxonomy

Shared constants live in `lib/property-categories.ts`:

- **Listing category:** rent · sale · airbnb  
- **Property type:** house, apartment, bedsitter, condo, townhouse, villa, land, farmland  
- Land size / purpose fields for plots & farmland  

Deploy updated Sanity schemas from Studio when schema files change.

---

## Deploy notes

- **Web (Vercel):** set Sanity + Mapbox + `NEXT_PUBLIC_API_URL` pointing at your hosted API.
- **API:** host Nest separately; provide managed Postgres, Redis, JWT secrets, and Daraja / bank env vars.
- Ensure Sanity `projectId` / `dataset` are set in the Vercel environment or the build will fail.
