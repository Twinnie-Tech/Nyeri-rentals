# RenderCon — Full talk script (Proxy vs BFF)

**Title:** Proxy vs BFF: Building a Backend for Frontend with Next.js + NestJS  
**Product:** GreenKey Realty  
**Length:** 30–40 minutes (talk + live demo)  
**Slides:** [`RenderCon_Proxy_vs_BFF_Slides.pptx`](./RenderCon_Proxy_vs_BFF_Slides.pptx) · content copy: [`RENDERCON_SLIDE_CONTENT.md`](./RENDERCON_SLIDE_CONTENT.md)  
**Full pitch (CFP):** [`RENDERCON_FULL_PITCH.md`](./RENDERCON_FULL_PITCH.md)  
**Demo runbook:** [`TECH_TALK_BFF.md`](./TECH_TALK_BFF.md)

Replace `[Your Name]` before presenting.

---

## Timing at a glance

| Min | Slide(s) | Mode |
|-----|----------|------|
| 0–3 | 1–3 | Hook + analogy |
| 3–8 | 4–6 | Problem + Proxy vs BFF |
| 8–14 | 7–9 | Architecture + ownership |
| 14–20 | 10–11 | GreenKey stories + screen map |
| 20–32 | 12–13 + live app | Demo |
| 32–38 | 14–16 | Rule, takeaways, Q&A |
| — | 17 | Keep for Slidesgo attribution |

---

## Slide 1 — Title

**Say:**  
Good [morning/afternoon]. I’m [Your Name]. Today we’re talking about something teams mix up constantly: **proxy** versus **Backend for Frontend**. I’ll ground it in a real product — GreenKey Realty — built with Next.js and NestJS, including Kenya-local pieces like M-Pesa and OTP over SMS/WhatsApp.

**Show:** Title slide.

---

## Slide 2 — Agenda

**Say:**  
We’ll start with a simple analogy, then definitions, then architecture. After that I’ll walk GreenKey stories — auth, aggregation, payments, dual-write — then a live demo, and we’ll close with a rule of thumb and questions.

**Show:** Agenda list. Don’t linger.

---

## Slide 3 — Hook (receptionist vs assistant)

**Say:**  
Here’s the line I want you to remember:

**Proxy** is the receptionist who points you to the right department.  
**BFF** is the assistant who visits three departments for you, collects the paperwork, staples it, and hands you a one-page summary.

If you only remember one thing, remember that.

**Show:** Quote slide. Pause 3 seconds.

---

## Slide 4 — Section: Why this matters

**Say:**  
Why care? Because modern React apps don’t talk to one backend anymore.

---

## Slide 5 — The problem

**Say:**  
Identity, CMS content, payments, SMS, WhatsApp, email — if the browser talks to all of them, you leak secrets and couple every client to every provider. When mobile shows up, you duplicate the mess. GreenKey hits Sanity, Postgres, Redis, Daraja, and messaging providers. That combination is exactly why a BFF earns its keep.

**Show:** Problem bullets. Optional: open home page briefly.

---

## Slide 6 — Proxy vs BFF

**Say:**  
Left side — proxy. In Next.js 16 that’s often `proxy.ts`: gate the dashboard, refresh cookies, redirect to sign-in. It directs traffic. It does **not** assemble your business response.

Right side — BFF. Shape data for **this** UI. Call Postgres, Sanity, M-Pesa — return one clean payload. Hide Daraja keys and Sanity write tokens. Give web and mobile one `/v1` contract.

Important nuance: Next’s docs say Route Handlers *can* be your BFF. We still run Nest for long-lived billing, Safaricom callbacks, and a shared mobile API. Next is the web edge; Nest is the domain BFF.

**Show:** Two-column comparison. Point left then right.

---

## Slide 7 — Section: Solution

**Say:**  
So the solution isn’t “more middleware.” It’s a deliberate two-layer design.

---

## Slide 8 — Architecture

**Say:**  
Browser hits Next. Next holds httpOnly cookies and same-origin `/api` routes. Nest owns `/v1`: OTP, JWT refresh, billing, Sanity writes, mirrors. Data plane is Postgres, Redis, Sanity. Providers stay behind Nest.

Mobile doesn’t need a different backend — same `/v1`, Bearer tokens instead of cookies. We’ll show that in Swagger.

**Show:** Architecture boxes. Trace left → right with your hand.

```text
Browser → Next (cookies + /api) → Nest /v1
        → Postgres · Redis · Sanity · M-Pesa · SMS/email
```

---

## Slide 9 — Data ownership

**Say:**  
Say this out loud with me: **CMS is not the system of record for everything.**

Sanity owns listing content. Postgres owns users, roles, subscriptions. Redis owns OTPs and rate limits. Payment provider secrets live only on Nest. Dual-write mirrors exist so API and mobile can search without scraping the CMS.

**Show:** Ownership table. Tap “Sanity” vs “Postgres” rows.

---

## Slide 10 — Product stories

**Say:**  
Four stories you’ll see in the demo.

1. **Auth** — OTP issued in Nest, stored in Redis. Web gets cookies; JSON never returns raw JWTs to the browser.  
2. **Aggregation** — Saved listings join Postgres IDs with Sanity cards. That’s the assistant stapling paperwork.  
3. **Billing** — STK Push and Safaricom callback hit Nest only.  
4. **Dual-write** — Create listing writes Sanity and `PropertyMirror`.

**Show:** Four cards. Don’t deep-dive code yet.

---

## Slide 11 — One backend, many views

**Say:**  
Same BFF, different lenses: buyer, auth, saved, pricing, agent dashboard, admin, Studio, and Swagger as the mobile view. You don’t need a React Native app to teach this — Bearer in Swagger is enough.

**Show:** Screen map table.

---

## Slide 12 — Live demo cue

**Say:**  
Demo time. Narrate each step as a **BFF job**, not only UI clicks.

**Show:** Demo steps, then switch to browser.

### Live demo script (aim 10–12 min)

1. **Browse** — `/` → `/properties` (Sanity content view).  
2. **Sign in** — `/sign-in` → OTP. Open DevTools → Application → cookies → `gk_access` / `gk_refresh`. Network: `/api/auth/otp/verify` returns `{ user }` **without** tokens in JSON.  
3. **Save** — Save a listing → `/saved` (aggregation).  
4. **Pay** — `/pricing` → M-Pesa simulate-complete (or bank). Dashboard unlocks.  
5. **List** — Create listing with category fields → open `/studio` same doc (dual-write proof).  
6. **Lead** — Incognito buyer → Contact agent → agent `/dashboard/leads`.  
7. **Mobile** — `http://localhost:4000/docs` → Authorize Bearer → `GET /auth/me` or `GET /properties`.

**If something fails:** stay calm; fall back to architecture slides and Swagger screenshots in your notes.

**Prep (before the talk):**

```powershell
pnpm docker:up
pnpm dev:api
pnpm dev   # or npm run dev
```

Demo-safe: console/Mailtrap OTP; M-Pesa simulate path.

---

## Slide 13 — Demo prep checklist

**Say:**  
These eight tabs should already be open before you walk on stage. It keeps the demo calm.

**Show:** Checklist. Confirm apps are running.

---

## Slide 14 — Rule of thumb

**Say:**  
If you’re only forwarding, it’s a proxy.  
If you’re shaping for a client and protecting secrets, it’s a BFF.

**Show:** Big quote. Pause.

---

## Slide 15 — Takeaways

**Say:**  
Five takeaways: proxy directs; BFF delivers; no secrets in the client; one `/v1` for web and mobile; CMS isn’t accounts-and-payments.

Bonus answer for Q&A — *Why not put M-Pesa in a Next Route Handler?*  
Safaricom callbacks need a stable public API, Daraja secrets must not live next to the frontend deploy, mobile needs the same contract, and payment flows outlive a single serverless request mindset.

**Show:** Numbered takeaways.

---

## Slide 16 — Questions

**Say:**  
I’m [Your Name]. Happy to take questions on boundaries, dual-write tradeoffs, or how you’d adapt this on Vercel + Railway/Render.

**Show:** Q&A slide.

---

## Slide 17 — Thanks / Slidesgo

**Say:**  
(Only if needed) Visual template adapted from Slidesgo — we keep this slide for attribution.

---

## Backup answers (30–60s each)

**“Isn’t Nest just an API?”**  
An API exposes resources. A BFF shapes responses for a client family and owns orchestration + secrets. Nest here does both for web and mobile.

**“Why dual-write?”**  
Agents get Sanity’s content UX; Postgres mirrors unlock search, ownership, and mobile without GROQ everywhere. Cost is sync discipline on create/update/delete.

**“Could Next alone be the BFF?”**  
For simple apps, yes — Route Handlers are enough. We added Nest when billing callbacks, messaging providers, and a second client appeared.

---

## Day-of checklist

- [ ] `[Your Name]` filled on slides 1 and 16  
- [ ] Docker Postgres/Redis up; API on `:4000`; web on `:3000`  
- [ ] Seed data or known demo accounts ready  
- [ ] Eight tabs pre-opened  
- [ ] Network tab ready to show cookie vs Bearer  
- [ ] Simulate-complete path verified once  
- [ ] This script printed or on a second screen  
