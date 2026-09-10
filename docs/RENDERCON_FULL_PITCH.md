# RenderCon — Full pitch content (Proxy vs BFF)

Use this document when filling the **CFP form**, writing a **speaker abstract**, or rehearsing the **elevator pitch**.  
For the minute-by-minute spoken script, use [`RENDERCON_FULL_TALK_SCRIPT.md`](./RENDERCON_FULL_TALK_SCRIPT.md).  
For slides, open [`RenderCon_Proxy_vs_BFF_Slides.pptx`](./RenderCon_Proxy_vs_BFF_Slides.pptx).

Replace `[Your Name]` before submitting or presenting.

---

## Elevator pitch (30 seconds)

Modern React apps talk to a CMS, a database, payments, and messaging at once. A **proxy** only points traffic the right way. A **BFF** gathers those systems, hides secrets, and returns one UI-shaped answer. I’ll show how GreenKey Realty does that with Next.js as the web edge and NestJS `/v1` as the domain BFF — including OTP auth, M-Pesa, Sanity dual-write, and a shared contract for mobile — with a live demo.

---

## Talk title

**Proxy vs BFF: Building a Backend for Frontend with Next.js + NestJS**

**Alternatives (if the form asks for backups)**

1. Backend for Frontend in Practice: NestJS + Next.js for a Real Estate Product  
2. Stop Putting Secrets in Next: A BFF Pattern for Auth, M-Pesa & CMS  
3. One Frontend, Many Backends: Building a Kenya-Ready BFF  

---

## One sentence (form field)

I’ll explain the difference between a **proxy** and a **BFF**, then show how GreenKey Realty uses Next.js as the web front desk and NestJS as the assistant that aggregates auth, CMS, payments, and messaging into one `/v1` API for web and mobile.

---

## Abstract (CFP ~150–200 words) — copy/paste ready

Modern React apps often talk to a CMS, a database, payment gateways, and messaging providers at once. Putting all of that in the browser—or even only in Next.js—quickly becomes a security and coupling problem. Teams also confuse a **proxy** (routing and gates) with a **Backend for Frontend** (shaping data and protecting secrets).

This talk draws a clear line: **proxy** is the receptionist who points you to the right department; **BFF** is the assistant who visits three departments, staples the paperwork, and hands you one page. We’ll ground it in GreenKey Realty, a Nyeri-focused real estate product: **Next.js App Router** for UI and httpOnly cookies, and **NestJS `/v1`** as the BFF that owns OTP auth, JWT refresh, agent plans, Daraja M-Pesa, SMS/WhatsApp/email, and dual-writes to Sanity + Postgres.

You’ll see ownership boundaries (CMS content vs account state), why Kenya-local provider credentials stay behind Nest, and how web + mobile share one API (cookies vs Bearer). We’ll live-demo OTP sign-in, plan unlock, listing create, and a lead—then close with a rule of thumb and tradeoffs.

---

## Short abstract (~50 words)

Proxy directs traffic; a BFF shapes answers and hides secrets. Using GreenKey Realty (Next.js + NestJS), I’ll show OTP auth, M-Pesa, Sanity dual-write, and a shared `/v1` for web and mobile—plus a live demo of the secret boundary.

---

## Audience & level

| Field | Value |
|-------|--------|
| Level | Intermediate |
| Audience | Fullstack / React / Next.js engineers; API & product architects |
| Tracks | Web · fullstack · React · architecture |
| Length | 30–40 minutes (talk + live demo) + Q&A |
| Prerequisites | Comfortable with React/Next; NestJS helpful but not required |

---

## Learning outcomes

By the end, attendees can:

1. Explain **proxy vs BFF** in one sentence each (receptionist vs assistant).  
2. Decide when Next Route Handlers are enough vs when a domain BFF (Nest) pays off.  
3. Split ownership: **Sanity (content)** vs **Postgres (identity/billing)** vs **Redis (OTP/ephemeral)**.  
4. Keep M-Pesa / SMS / write tokens off the client and still serve web + mobile from one `/v1`.  
5. Answer: “Why not put M-Pesa in Next?” (callbacks, secrets, mobile contract, ops).

---

## Outline (for the form)

1. Hook — receptionist vs assistant  
2. Why many backends break “Next-only” apps  
3. Proxy vs BFF definitions (with Next.js docs nuance)  
4. GreenKey architecture — Browser → Next → Nest `/v1` → providers  
5. Product stories — auth, aggregation, M-Pesa, dual-write  
6. Live demo (8–12 min) — OTP → pay → list → lead → Swagger Bearer  
7. Rule of thumb, takeaways, Q&A  

---

## Spine analogy (open with this)

> **Proxy** = the receptionist who points you to the right department.  
> **BFF** = the assistant who visits three departments for you, collects the paperwork, staples it, and hands you a one-page summary.

---

## Closing rule of thumb

> If you’re only forwarding, it’s a **proxy**.  
> If you’re shaping for a client and protecting secrets, it’s a **BFF**.

---

## Why this fits RenderCon

- Real Next/React product, not slides-only theory.  
- Clear teaching contrast (proxy vs BFF) many teams blur in App Router projects.  
- Africa/Kenya stack (M-Pesa, SMS/WhatsApp) as a concrete secret-boundary motivation.  
- Patterns reusable on Vercel + a separate API host (Railway / Render / similar).  
- Mobile story without requiring a native app on stage (Swagger + Bearer).

---

## Speaker bio (template)

> [Your Name] is a fullstack engineer building GreenKey Realty. They work with Next.js, NestJS, Sanity, Postgres, and Kenya payment and messaging providers, and care about practical architecture teams can ship—not just diagram.

**Shorter bio (~40 words)**

> [Your Name] — fullstack engineer on GreenKey Realty (Next.js, NestJS, Sanity, M-Pesa). Talks about Backend for Frontend patterns that keep secrets server-side and serve web + mobile from one API.

---

## Materials checklist (attach / link if asked)

| Asset | Path |
|-------|------|
| **Slides (PPTX)** | [`RenderCon_Proxy_vs_BFF_Slides.pptx`](./RenderCon_Proxy_vs_BFF_Slides.pptx) |
| Slide text (markdown) | [`RENDERCON_SLIDE_CONTENT.md`](./RENDERCON_SLIDE_CONTENT.md) |
| Full spoken script | [`RENDERCON_FULL_TALK_SCRIPT.md`](./RENDERCON_FULL_TALK_SCRIPT.md) |
| Demo runbook | [`TECH_TALK_BFF.md`](./TECH_TALK_BFF.md) |
| CFP pitch (shorter) | [`RENDERCON_BFF_PITCH.md`](./RENDERCON_BFF_PITCH.md) |
| Submission draft | [`RENDERCON_SUBMISSION_DRAFT.md`](./RENDERCON_SUBMISSION_DRAFT.md) |
| Mobile / Bearer contract | [`MOBILE_API.md`](./MOBILE_API.md) |
| Rebuild slides | `python scripts/build_rendercon_slides.py` |

---

## References (cite in talk / form)

1. [Next.js — Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)  
2. Classic BFF talk: https://www.youtube.com/watch?v=WVP1kIcsKM0  

---

## Success criteria (after the talk)

- Audience can explain **proxy vs BFF** in one sentence each.  
- Audience can explain **what Nest owns vs Sanity**.  
- Live path works: OTP → plan → listing → lead.  
- Clear answer to “why not put M-Pesa in Next?”
