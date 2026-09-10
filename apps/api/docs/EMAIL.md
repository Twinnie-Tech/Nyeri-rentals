# Email delivery (OTP & transactional)

GreenKey supports multiple email providers via `EMAIL_PROVIDER`.

| Environment | Recommended provider | Delivers to real inboxes? |
|-------------|----------------------|---------------------------|
| Local dev | `console` | No — code logged + `devCode` |
| QA / staging | `mailtrap` | No — captured in Mailtrap Testing inbox |
| Production | `mailtrap-send`, `resend`, or `sendgrid` | Yes |

---

## Welcome email (first registration)

After a successful first-time sign-up (new user created via email OTP or email/password register), the API sends a welcome message using the same `EMAIL_PROVIDER` as OTP mail. Failures are logged and do not block sign-in.

Phone-first sign-up sends welcome **SMS + WhatsApp** immediately (see [`MESSAGING.md`](./MESSAGING.md)). A welcome email is sent when they later add an email (e.g. onboarding).

## QA / staging — Mailtrap Email Testing

1. Create a free account at [mailtrap.io](https://mailtrap.io)
2. Open **Email Testing** → your inbox → **SMTP Settings** → **Nodemailer**
3. Copy username + password into `apps/api/.env`:

```env
EMAIL_PROVIDER=mailtrap
MAIL_FROM_NAME=GreenKey Realty
MAIL_FROM_EMAIL=noreply@greenkey.test
MAILTRAP_USER=your_mailtrap_username
MAILTRAP_PASS=your_mailtrap_password
# Optional overrides (defaults below)
# MAILTRAP_HOST=sandbox.smtp.mailtrap.io
# MAILTRAP_PORT=2525
```

4. Restart the API (`pnpm dev:api`)
5. Sign in with email OTP → open the Mailtrap inbox to copy the code  
   (no `devCode` is returned; treat QA like production UX)

If you see `self-signed certificate in certificate chain` (common with Windows antivirus SSL scanning), Mailtrap Testing already relaxes TLS verification. For generic SMTP you can set:

```env
SMTP_TLS_REJECT_UNAUTHORIZED=false
```

Emails never reach Gmail/Outlook when using `mailtrap` — they stay in Mailtrap.

---

## Production requirements

Before going live with real OTP email:

### Domain & DNS
- [ ] Own a domain (e.g. `greenkeyrealty.co.ke`)
- [ ] Set `MAIL_FROM_EMAIL` to an address on that domain (`noreply@…`)
- [ ] Configure **SPF**, **DKIM**, and **DMARC** in your ESP dashboard / DNS
- [ ] Verify the sending domain in the chosen provider

### Provider choice (pick one)

| Provider | `EMAIL_PROVIDER` | Required secrets |
|----------|------------------|------------------|
| Mailtrap Sending | `mailtrap-send` | `MAILTRAP_USER`, `MAILTRAP_PASS` (Sending stream credentials) |
| Resend | `resend` | `RESEND_API_KEY` |
| SendGrid | `sendgrid` | `SENDGRID_API_KEY` |
| Generic SMTP (SES, Postmark, …) | `smtp` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |

### Shared production vars

```env
NODE_ENV=production
EMAIL_PROVIDER=mailtrap-send   # or resend | sendgrid | smtp
MAIL_FROM_NAME=GreenKey Realty
MAIL_FROM_EMAIL=noreply@yourdomain.com
APP_URL=https://your-production-app.com
```

### Mailtrap Sending example

```env
EMAIL_PROVIDER=mailtrap-send
MAIL_FROM_NAME=GreenKey Realty
MAIL_FROM_EMAIL=noreply@yourdomain.com
MAILTRAP_USER=api
MAILTRAP_PASS=your_sending_api_token
# Defaults: live.smtp.mailtrap.io:587
```

### Resend example

```env
EMAIL_PROVIDER=resend
MAIL_FROM_EMAIL=noreply@yourdomain.com
RESEND_API_KEY=re_xxxxxxxx
```

### Do not use in production
- `console` — OTP only in server logs
- `mailtrap` (Testing sandbox) — never reaches users
- Personal Gmail SMTP as the primary relay (quotas / ToS / deliverability)

### Ops checklist
- [ ] Rotate API keys / SMTP passwords; store only in the host secret store (Vercel / Railway / etc.)
- [ ] Confirm OTP emails land in Gmail + Outlook from a staging smoke test with the **production** provider
- [ ] Monitor bounce / spam rates in the ESP dashboard
- [ ] Keep `OTP_TTL_SECONDS` short (e.g. 300) and rate limits enabled (already in auth)

---

## Provider reference

| Value | Purpose |
|-------|---------|
| `console` | Local development |
| `mailtrap` | QA — Mailtrap **Email Testing** sandbox |
| `mailtrap-send` | Production — Mailtrap **Email Sending** |
| `resend` | Production — Resend HTTP API |
| `sendgrid` | Production — SendGrid HTTP API |
| `smtp` | Any SMTP relay (SES, Postmark, custom) |
