# RenderCon — Slide content (paste into Slidesgo template)

**Generated deck:** [`RenderCon_Proxy_vs_BFF_Slides.pptx`](./RenderCon_Proxy_vs_BFF_Slides.pptx) (Slidesgo Tech Startup palette via `python scripts/build_rendercon_slides.py`).  
Source template: [`Tech Talk Presentation Slide.pptx`](./Tech%20Talk%20Presentation%20Slide.pptx).  
Keep the template **Thanks** slide for Slidesgo attribution.  
Full spoken script: [`RENDERCON_FULL_TALK_SCRIPT.md`](./RENDERCON_FULL_TALK_SCRIPT.md).  
Full pitch: [`RENDERCON_FULL_PITCH.md`](./RENDERCON_FULL_PITCH.md).

**Recommended deck length:** 16–17 slides (delete unused startup/market/investment template slides).

Palette (from template): `#073763` `#0b5394` `#3d85c6` `#00d6c0` · fonts Squada One / Roboto Condensed.

---

## Slide 1 — Title (template: “TECH STARTUP”)

| Field | Text |
|-------|------|
| Eyebrow | RENDERCON TECH TALK |
| Title | PROXY vs BFF |
| Subtitle | Building a Backend for Frontend with Next.js + NestJS |
| Line | GreenKey Realty · Nyeri real estate product |
| Speaker | [Your Name] · fullstack engineer |
| Meta | 30–40 min · talk + live demo |

---

## Slide 2 — Agenda (template: TABLE OF CONTENTS)

| # | Section |
|---|---------|
| 01 | Hook — receptionist vs assistant |
| 02 | Why many backends break “Next-only” apps |
| 03 | Proxy vs BFF definitions |
| 04 | GreenKey architecture & ownership |
| 05 | Product stories (auth, save, M-Pesa, dual-write) |
| 06 | Live demo + Swagger as mobile view |
| 07 | Takeaways & Q&A |

---

## Slide 3 — Big idea / quote (template: quote slide)

> **Proxy** = the receptionist who points you to the right department.  
> **BFF** = the assistant who visits three departments for you, collects the paperwork, staples it, and hands you a one-page summary.

Attribution line: *Spine of this talk*

---

## Slide 4 — Section divider

| Field | Text |
|-------|------|
| Number | 01 |
| Title | WHY THIS MATTERS |
| Subtitle | Many backends. One UI. Secrets must stay server-side. |

---

## Slide 5 — Problem (template: PROBLEM)

**Title:** THE PROBLEM

**Intro:** If every client talks to every provider, coupling explodes.

**Bullets:**

- Modern React apps need identity, CMS, payments, and messaging.
- Putting all of that in the browser (or only in Next) leaks secrets.
- You also duplicate logic when mobile arrives.
- GreenKey: Sanity + Postgres + Redis + M-Pesa + SMS/WhatsApp/email.

---

## Slide 6 — Proxy vs BFF (template: THEM / US)

**Title:** PROXY vs BFF

| PROXY (receptionist) | BFF (assistant) |
|----------------------|-----------------|
| Route / gate / rewrite | Shape data for **this** UI |
| “Go to Billing” / redirect to sign-in | Call PG + Sanity + M-Pesa → one response |
| Next.js `proxy.ts` | Nest `/v1` + Next `/api` Route Handlers |
| Protects `/dashboard`, refreshes cookies | Hides Daraja & Sanity write tokens |
| Does not assemble business data | Shared contract for web + mobile |

**Footer note:** Next docs allow Route Handlers as BFF; we still use Nest for callbacks + mobile.

---

## Slide 7 — Section divider

| Field | Text |
|-------|------|
| Number | 02 |
| Title | SOLUTION |
| Subtitle | Next edge + Nest domain BFF — matches Next docs, ready for mobile. |

---

## Slide 8 — Architecture (template: PRODUCT / intro)

**Title:** ARCHITECTURE

**Line:** Two-layer BFF — Next is the web edge · Nest `/v1` is the domain BFF

**Flow chips:**

`Browser` → `Next.js` → `Nest /v1` → `Data plane` → `Providers`

| Chip | Detail |
|------|--------|
| Browser | UI only |
| Next.js | cookies · `/api` · `proxy` |
| Nest /v1 | OTP · billing · writes |
| Data plane | Postgres · Redis · Sanity |
| Providers | M-Pesa · SMS · email |

**Notes under diagram:**

- Browser → Next (httpOnly cookies + Route Handlers) → Nest BFF  
- Nest talks to Postgres, Redis, Sanity write API, Daraja, AT/Infobip  
- Next may GROQ-read Sanity for public pages; secrets never leave Nest  
- Mobile uses the same `/v1` with Bearer tokens (Swagger demo)

---

## Slide 9 — Ownership (template: TABLE)

**Title:** DATA OWNERSHIP

| Concern | Owner |
|---------|--------|
| Listing content & media | Sanity |
| Users, JWT refresh, roles, subscriptions | Postgres + Nest |
| OTP codes, rate limits, payment locks | Redis |
| M-Pesa / SMS / WhatsApp / email secrets | Nest only |
| PropertyMirror / Lead ops rows | Postgres via Nest |
| Agent dashboard listing UI | Sanity (writes via Nest) |

---

## Slide 10 — Product stories (template: PRODUCT OVERVIEW 4 tiles)

**Title:** GREENKEY PRODUCT STORIES

| Card | Body |
|------|------|
| Auth | OTP in Nest + Redis · Web: httpOnly cookies · Mobile: Bearer |
| Aggregation | Saved listings = Postgres IDs + Sanity cards |
| Billing | M-Pesa STK + callback on Nest · No Daraja keys in browser |
| Dual-write | Create listing → Sanity doc + PropertyMirror |

---

## Slide 11 — Screen map (template: TABLE / competitors list)

**Title:** ONE BACKEND · MANY VIEWS

| View | Surface | What it shows |
|------|---------|----------------|
| Buyer web | `/properties` | Sanity read + optional session |
| Auth | `/sign-in` | Next `/api/auth` → Nest OTP |
| Buyer account | `/saved` | Postgres + Sanity join |
| Billing | `/pricing` | Nest plan + STK / bank |
| Agent | `/dashboard` | Same BFF + plan gate |
| Admin | `/admin/payments` | Ops slice of `/v1` |
| CMS | `/studio` | Raw Sanity documents |
| Mobile view | `:4000/docs` | Swagger + Bearer tokens |

---

## Slide 12 — Demo (template: DEMO)

**Title:** LIVE DEMO

1. Browse `/` → `/properties`  
2. OTP sign-in → cookies (not raw JWTs in JSON)  
3. Save a listing (aggregation)  
4. `/pricing` → simulate STK → agent unlock  
5. Create listing → open `/studio` (dual-write)  
6. Incognito: Contact agent → `/dashboard/leads`  
7. Swagger `/docs` = mobile Bearer view  

---

## Slide 13 — Timing / checklist (template: TIMING)

**Title:** DEMO PREP — 8 TABS

**Web surfaces**

- `http://localhost:3000`  
- `/sign-in`  
- `/saved`  
- `/pricing`  

**Ops / mobile**

- `/dashboard`  
- `/dashboard/admin/payments`  
- `/studio`  
- `http://localhost:4000/docs`  

**Footer:** `pnpm docker:up` · `pnpm dev:api` · `pnpm/npm run dev` · console OTP · M-Pesa simulate-complete

---

## Slide 14 — Rule of thumb (template: big number / quote)

**Title:** RULE OF THUMB

If you’re only forwarding,  
it’s a **proxy**.

If you’re shaping for a client  
and protecting secrets,  
it’s a **BFF**.

---

## Slide 15 — Takeaways (template: REVIEWING / multi cards)

**Title:** TAKEAWAYS

1. Proxy directs; BFF delivers a UI-shaped answer.  
2. Don’t put provider secrets in the client.  
3. One `/v1` contract serves web + mobile (cookies vs Bearer).  
4. CMS ≠ system of record for accounts and payments.  
5. Why not M-Pesa in Next? Callbacks, secrets, mobile, ops.

---

## Slide 16 — Q&A (template: WHOA / THANKS contact)

**Title:** QUESTIONS?

[Your Name] · GreenKey Realty  

Docs: `TECH_TALK_BFF.md` · `MOBILE_API.md` · `RENDERCON_FULL_TALK_SCRIPT.md`  

References: Next.js BFF guide · classic BFF talk (YouTube)

---

## Slide 17 — Thanks / attribution (KEEP)

**Title:** THANKS

Presentation visuals adapted from a **Slidesgo Tech Startup** template.  
Keep this slide for license attribution.  
slidesgo.com

---

## Rebuild / edit tips

1. Open [`RenderCon_Proxy_vs_BFF_Slides.pptx`](./RenderCon_Proxy_vs_BFF_Slides.pptx) in PowerPoint.  
2. Replace `[Your Name]` on slides 1 and 16.  
3. Rebuild from scratch anytime: `python scripts/build_rendercon_slides.py`  
4. Rehearse with [`RENDERCON_FULL_TALK_SCRIPT.md`](./RENDERCON_FULL_TALK_SCRIPT.md).  
5. Keep slide 17 (Thanks) for Slidesgo attribution.
