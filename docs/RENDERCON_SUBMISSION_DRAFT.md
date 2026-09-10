# Tech talk submission draft — Proxy vs BFF

**Event:** RenderCon (CFP / speaker registration review)  
**Product demo:** GreenKey Realty (Nyeri-focused real estate)  
**Related docs:** [`RenderCon_Proxy_vs_BFF_Slides.pptx`](./RenderCon_Proxy_vs_BFF_Slides.pptx) · [`RENDERCON_FULL_PITCH.md`](./RENDERCON_FULL_PITCH.md) · [`RENDERCON_BFF_PITCH.md`](./RENDERCON_BFF_PITCH.md) · [`TECH_TALK_BFF.md`](./TECH_TALK_BFF.md) · [`MOBILE_API.md`](./MOBILE_API.md) · [`RENDERCON_FULL_TALK_SCRIPT.md`](./RENDERCON_FULL_TALK_SCRIPT.md) · [`RENDERCON_SLIDE_CONTENT.md`](./RENDERCON_SLIDE_CONTENT.md)

---

## Talk title

**Proxy vs BFF: Building a Backend for Frontend with Next.js + NestJS**

**Alternatives**

- Backend for Frontend in Practice — One API for Web, Mobile & Kenya Payments
- Backend for Frontend in Practice: NestJS + Next.js for a Real Estate Product

---

## One sentence

I’ll explain the difference between a **proxy** and a **BFF**, then show how GreenKey Realty uses Next.js as the web “front desk” and NestJS as the assistant that aggregates auth, CMS, payments, and messaging into one `/v1` API for web and mobile.

---

## Hook / opening analogy

> **Proxy** = the receptionist who points you to the right department.  
> **BFF** = the assistant who visits three departments for you, collects the paperwork, staples it, and hands you a one-page summary.

Use this early. It is the spine of the talk; everything else proves it in a real product.

---

## What I will talk about

### 1. Why this matters

Modern React apps don’t talk to one backend. They need:

- identity / sessions  
- CMS content  
- payments  
- SMS / WhatsApp / email  

If the browser (or even Next alone) talks to all of them, you leak secrets, duplicate logic, and break mobile.

### 2. Proxy vs BFF (clear definitions)

| | **Proxy** | **BFF** |
|--|-----------|---------|
| Job | Route / gate / rewrite | Shape data for **this** UI |
| Analogy | Receptionist | Personal assistant |
| Does | “Go to Billing” / “You’re not logged in → sign-in” | Call Postgres + Sanity + M-Pesa, return one response the UI needs |
| Next.js | `proxy.ts` (auth gate, refresh, redirects) | Route Handlers / server layer that aggregate & hide secrets |
| In GreenKey | `proxy.ts` protects `/dashboard`, refreshes cookies | Nest `/v1` + Next `/api/*` that never expose Daraja/Sanity write keys |

**Nuance for reviewers:**  
[Next.js documents BFF](https://nextjs.org/docs/app/guides/backend-for-frontend) using Route Handlers + `proxy`. GreenKey uses a **two-layer** pattern that still matches that guide:

- **Next** = web-facing BFF edge (cookies, Route Handlers, `proxy`)  
- **Nest** = domain BFF shared by web **and** mobile (`/v1`)

### 3. Architecture

```text
Browser → Next (UI + cookies + /api) → Nest BFF (/v1)
       → Postgres, Redis, Sanity, M-Pesa, SMS/WhatsApp/email
```

**Reference framing**

- Next.js BFF guide: https://nextjs.org/docs/app/guides/backend-for-frontend  
- Classic BFF motivation (aggregation for a specific client): https://www.youtube.com/watch?v=WVP1kIcsKM0  

### 4. Live product stories (GreenKey)

1. **Auth** — OTP via Nest; web gets httpOnly cookies (not raw JWTs); mobile uses Bearer (Swagger as “mobile view”).  
2. **Saved listings** — BFF joins Postgres IDs + Sanity cards → one page.  
3. **M-Pesa** — STK + callback stay on Nest; browser never holds Daraja keys.  
4. **Listings** — create via Nest → Sanity + `PropertyMirror` (dual-write).  
5. **Screen map** — buyer / agent / admin / Studio / Swagger = different *views* of the same backend.

### 5. Takeaways

1. Proxy directs; BFF delivers a UI-shaped answer.  
2. Don’t put provider secrets in the client.  
3. One BFF contract can serve web + mobile with different session styles.  
4. CMS ≠ system of record for accounts and payments.

---

## Abstract (copy for the form, ~180 words)

Teams often confuse **proxying** with a **Backend for Frontend**. A proxy is a receptionist: it points traffic to the right place or blocks the door. A BFF is an assistant: it visits several departments, gathers what the UI needs, and returns one clean summary—without handing the user the keys to every office.

This talk starts from that analogy, then grounds it in Next.js’s own BFF guidance (Route Handlers and `proxy`) and a real product: GreenKey Realty. We’ll show Next.js as the web edge—httpOnly cookies, route protection, same-origin `/api`—and NestJS `/v1` as the domain BFF that owns OTP auth, Redis rate limits, Sanity writes, Postgres mirrors, and M-Pesa callbacks. The browser and a future mobile client share that API; only the session style changes (cookies vs Bearer).

Attendees leave knowing when to stop “just proxying,” how to draw a secret boundary, and how one BFF supports multiple frontends without duplicating payment and messaging logic.

---

## Outline (timed)

| Min | Section |
|-----|---------|
| 0–3 | Hook: receptionist vs assistant |
| 3–8 | Next.js BFF docs + classic BFF idea (brief, cite links) |
| 8–14 | GreenKey architecture diagram |
| 14–22 | Proxy in our repo (`proxy.ts`) vs BFF aggregation |
| 22–34 | Live demo: OTP → save → pay → listing → lead (+ Swagger as mobile) |
| 34–40 | Tradeoffs + Q&A |

---

## Screen map (tabs to prep)

| Tab | URL | View of the backend |
|-----|-----|---------------------|
| Public / buyer | `/` → `/properties` → `/properties/[id]` | Sanity content + optional BFF session |
| Auth | `/sign-in` | Next `/api/auth/*` → Nest OTP; cookies |
| Buyer account | `/saved`, `/profile` | Postgres + Sanity aggregation |
| Billing | `/pricing` | Nest billing; secrets stay on BFF |
| Agent | `/dashboard` (listings, leads, invoices) | Same BFF + plan gate |
| Admin | `/dashboard/admin/payments` | Ops slice (`/admin/*`) |
| CMS | `/studio` | Raw Sanity docs the BFF dual-writes |
| API / “mobile” | `http://localhost:4000/docs` | Full `/v1` with Bearer tokens |

---

## References

1. https://nextjs.org/docs/app/guides/backend-for-frontend  
2. https://www.youtube.com/watch?v=WVP1kIcsKM0  
3. [`TECH_TALK_BFF.md`](./TECH_TALK_BFF.md) — full demo runbook  
4. [`MOBILE_API.md`](./MOBILE_API.md) — Bearer contract for mobile  
5. [`RENDERCON_BFF_PITCH.md`](./RENDERCON_BFF_PITCH.md) — earlier CFP pitch  

---

## Best tips for delivery

1. **Open with the analogy, then prove it** — don’t define BFF for 10 minutes first. Say receptionist vs assistant, then open the Network tab.  
2. **One slide that kills confusion** — left: Proxy (redirect/gate). Right: BFF (3 calls → 1 JSON). Use saved listings or `/auth/me` as the example.  
3. **Cite Next.js, then show your twist** — “Next says Route Handlers *can* be your BFF. We still use Nest when we need long-lived billing, mobile, and Safaricom callbacks.” That shows you read the docs and made a product decision.  
4. **Never dunk on the older BFF video** — treat it as the *why*; your talk is the *how in 2026 with App Router*.  
5. **Demo must show the secret boundary** — DevTools: no `SANITY_WRITE_TOKEN`, no M-Pesa keys; Swagger shows Bearer tokens web never returns in JSON.  
6. **Prep the eight tabs above** — don’t invent a React Native app for the talk; Swagger is the mobile view.  
7. **Rehearse the one question** — “Why not put M-Pesa in a Next Route Handler?” Answer: callbacks, secrets, shared mobile contract, timeouts/ops.  
8. **Say “proxy ≠ BFF” out loud once** — many Next folks treat `proxy` as the whole BFF. Correct it kindly.  
9. **Keep the Kenya stack as motivation, not a vendor tour** — one STK simulate is enough.  
10. **End with a rule of thumb** — *If you’re only forwarding, it’s a proxy. If you’re shaping for a client and protecting secrets, it’s a BFF.*

---

## Speaker bio (template — fill in)

> [Name] — fullstack engineer building GreenKey Realty. Working with Next.js, NestJS, Sanity, and Kenya payment/messaging providers. Passionate about practical architecture for product teams.

---

## Success criteria

- Audience can explain **proxy vs BFF** in one sentence each.  
- Audience can explain **what Nest owns vs Sanity**.  
- Live path works: OTP → plan → listing → lead.  
- Clear answer to “why not put M-Pesa in Next?”
