# GreenKey Nest API

Backend-for-Frontend for GreenKey Realty web and future React Native apps.

## Stack

- NestJS + JWT (**phone or email OTP**; optional email/password)
- PostgreSQL + Prisma
- Redis (OTP, rate limits, M-Pesa idempotency)
- M-Pesa Daraja STK Push + bank transfer verification
- Sanity write token for CMS mutations (listings content stays in Sanity)

## Quick start

From repo root:

```bash
docker compose up -d
cp apps/api/.env.example apps/api/.env
pnpm install
pnpm --filter @greenkey/api prisma:generate
pnpm --filter @greenkey/api prisma:migrate
pnpm --filter @greenkey/api dev
```

Postgres is exposed on **host port 5433** (maps to container 5432) so it does not clash with a local PostgreSQL install on 5432.

| Service | Connection |
|---------|------------|
| Postgres | `localhost:5433` · user/db/pass `greenkey` |
| Redis | `localhost:6379` · no password |

API base: `http://localhost:4000/v1`

**Swagger UI:** [http://localhost:4000/docs](http://localhost:4000/docs) — browse and try every endpoint (Authorize with a JWT from OTP verify).

Web app: set `NEXT_PUBLIC_API_URL=http://localhost:4000/v1` in `.env.local`.

## Key routes

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/otp/request` | public (`channel`: `phone` \| `email`) |
| POST | `/auth/otp/verify` | public |
| POST | `/auth/login` | public |
| POST | `/auth/refresh` | public |
| GET | `/auth/me` | JWT |
| POST | `/users/onboarding` | JWT |
| PATCH | `/users/me` | JWT |
| GET | `/properties` | public (paginated) |
| POST | `/properties` | JWT + agent plan (Sanity write + mirror) |
| POST | `/properties/media/upload` | JWT + agent plan |
| GET | `/billing/plan` | public |
| POST | `/billing/mpesa/stk` | JWT |
| POST | `/billing/mpesa/callback` | public (Daraja) |
| POST | `/billing/bank` | JWT |
| GET | `/billing/payments` | JWT |
| GET | `/admin/payments/pending` | ADMIN |
| POST | `/admin/payments/:id/verify` | ADMIN |
| GET | `/health` | public |

Mobile contract: [`../../docs/MOBILE_API.md`](../../docs/MOBILE_API.md)

Sanity **write** token must be set on the API as `SANITY_WRITE_TOKEN` (not in the Next.js or mobile apps).

In development without `MPESA_*` credentials, STK creates a pending payment; complete it with `POST /billing/mpesa/simulate-complete/:paymentId`.

OTP codes are logged to the API console when `SMS_PROVIDER=console` / `EMAIL_PROVIDER=console` (and returned as `devCode`).

## Phone OTP (SMS + WhatsApp)

Full guide: [`docs/MESSAGING.md`](./docs/MESSAGING.md).

Phone OTP is delivered on **SMS and WhatsApp**. First-time phone registration also sends a welcome SMS + WhatsApp.

| Env | SMS | WhatsApp |
|-----|-----|----------|
| Local | `console` | `console` |
| QA | `africastalking` | **`infobip`** (trial test sender) |
| Prod | AT / Twilio live | Infobip own sender + templates |

Infobip onboarding: [portal.infobip.com/onboarding-guide](https://portal.infobip.com/onboarding-guide) — see [`docs/MESSAGING.md`](./docs/MESSAGING.md).

## Email OTP

Full guide: [`docs/EMAIL.md`](./docs/EMAIL.md). Env templates: `.env.example`, `.env.staging.example`, `.env.production.example`.

| Environment | `EMAIL_PROVIDER` | Notes |
|-------------|------------------|-------|
| Local | `console` | Logs code + returns `devCode` |
| QA / staging | `mailtrap` | Mailtrap **Email Testing** — open [mailtrap.io](https://mailtrap.io) inbox |
| Production | `mailtrap-send` / `resend` / `sendgrid` / `smtp` | Real inboxes; verified domain + SPF/DKIM/DMARC |

**QA — Mailtrap Testing**

```env
EMAIL_PROVIDER=mailtrap
MAIL_FROM_NAME=GreenKey Realty
MAIL_FROM_EMAIL=noreply@greenkey.test
MAILTRAP_USER=…   # Email Testing → SMTP Settings
MAILTRAP_PASS=…
```

**Production — Mailtrap Sending** (or Resend / SendGrid — see `docs/EMAIL.md`)

```env
EMAIL_PROVIDER=mailtrap-send
MAIL_FROM_EMAIL=noreply@yourdomain.com
MAILTRAP_USER=api
MAILTRAP_PASS=…   # Sending stream token
```

When any non-`console` provider is used, `devCode` is **not** returned.

## Deploy (Railway)

Cloud runbook (Vercel + Railway + Upstash + Sanity): [`../../docs/DEPLOY.md`](../../docs/DEPLOY.md).

- Image: repo-root `Dockerfile.api` (see `railway.toml`)
- Health: `GET /v1/health`
- On boot: `prisma migrate deploy` then `node dist/main.js`
- Set `DATABASE_URL`, `REDIS_URL` (Upstash), JWT, `SANITY_*`, messaging from `.env.staging.example` / `.env.production.example`
