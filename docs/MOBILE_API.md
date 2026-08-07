# Mobile / React Native API contracts

GreenKey Nest BFF (`/v1`) is the single backend for web and React Native.  
Do **not** put Sanity write tokens or M-Pesa secrets in the mobile app.

Base URL (local): `http://localhost:4000/v1`  
Swagger: `http://localhost:4000/docs`

---

## Auth

| Step | Method | Path | Body |
|------|--------|------|------|
| Request OTP | `POST` | `/auth/otp/request` | `{ "channel": "phone" \| "email", "target": "+2547…" \| "a@b.com" }` |
| Verify OTP | `POST` | `/auth/otp/verify` | `{ "channel", "target", "code", "name?" }` |
| Refresh | `POST` | `/auth/refresh` | `{ "refreshToken" }` |
| Me | `GET` | `/auth/me` | Bearer access token |
| Logout | `POST` | `/auth/logout` | `{ "refreshToken" }` |

**Tokens**

- `accessToken` — short-lived JWT (Bearer header)
- `refreshToken` — store in secure storage (Keychain / EncryptedSharedPreferences); rotate on every refresh

**Web difference:** Next uses httpOnly cookies (`gk_access` / `gk_refresh`) via Route Handlers. Mobile uses Bearer tokens only.

**Guards**

- Most routes require JWT
- Agent listing/lead routes also require active `agent` subscription (`AgentPlanGuard`)
- Admin routes require `ADMIN` role

---

## Onboarding & profile

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/users/onboarding` | name, phone/email completion |
| `PATCH` | `/users/me` | profile fields |
| `POST` | `/agents/ensure` | create agent + Sanity agent doc; sets `sanityId` |
| `POST` | `/agents/onboarding` | complete agent profile |
| `GET` / `PATCH` | `/agents/me` | agent profile |

---

## Properties (mirror + CMS write)

Listings **content** lives in Sanity; Nest owns writes and keeps a Postgres `PropertyMirror`.

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/properties?page=&limit=&listingCategory=&propertyType=&city=&q=` | Paginated `{ items, page, limit, total, totalPages }` |
| `GET` | `/properties/:id` | By mirror cuid or Sanity id |
| `GET` | `/properties/mine/list?page=&limit=` | Agent’s mirrors |
| `POST` | `/properties` | Create Sanity doc + mirror |
| `PUT` | `/properties/:sanityId` | Update Sanity + mirror |
| `PATCH` | `/properties/:sanityId/status` | `{ status }` |
| `DELETE` | `/properties/:sanityId` | Delete Sanity + mirror |
| `POST` | `/properties/media/upload` | `multipart/form-data` field `file` |

---

## Leads & saved

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/leads` | Creates Sanity lead + Postgres row (`sanityId` linked) |
| `GET` | `/leads/mine?page=&limit=` | Paginated agent inbox |
| `PATCH` | `/leads/:id/status` | `:id` = Prisma cuid **or** Sanity id |
| `GET` | `/users/me/saved` | Saved listing ids |
| `POST` / `DELETE` | `/users/me/saved/:propertyId` | Toggle save |

---

## Billing

Plan unlocks agent dashboard (same as web).

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/billing/plan` | Public plan catalog |
| `GET` | `/billing/subscription` | Current subscription |
| `POST` | `/billing/mpesa/stk` | `{ phone, planCode? }` → STK Push |
| `POST` | `/billing/mpesa/callback` | Daraja only (not for app) |
| `POST` | `/billing/mpesa/simulate-complete/:paymentId` | Dev / missing MPESA_* |
| `POST` | `/billing/bank` | Submit bank transfer reference |
| `GET` | `/billing/payments` | Payment history |

Poll `GET /billing/subscription` after STK until `status === ACTIVE` (callbacks can lag).

---

## Admin (bank verify)

| Method | Path | Role |
|--------|------|------|
| `GET` | `/admin/payments/pending` | `ADMIN` |
| `POST` | `/admin/payments/:id/verify` | `{ approve: boolean }` |
| `GET` | `/admin/users?page=&limit=` | Paginated users |

---

## Pagination shape

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 42,
  "totalPages": 3
}
```

Default `limit` = 20, max = 100.

---

## Security checklist for RN

1. Never ship `SANITY_WRITE_TOKEN`, Daraja keys, or JWT secrets in the app binary.
2. Use HTTPS in production; pin if required by policy.
3. Clear tokens on logout; call `/auth/logout` to revoke refresh.
4. Treat OTP `devCode` as local-only (console providers).
