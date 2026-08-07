# SMS & WhatsApp delivery (OTP & welcome)

Phone OTP is sent on **SMS and WhatsApp** to the same number (unless `WHATSAPP_ENABLED=false`).

| Environment | SMS | WhatsApp |
|-------------|-----|----------|
| Local | `console` | `console` / `auto` |
| QA | Africa's Talking sandbox | **Infobip** (trial test sender) |
| Production | AT / Twilio live | Infobip own sender + templates |

---

## Behaviour

1. Generate OTP → Redis  
2. Send **SMS** + **WhatsApp** in parallel  
3. SMS failure fails the request **only if WhatsApp also failed**; either channel alone is enough  
4. Both `console` → `devCode` returned  

First phone registration also queues welcome SMS + WhatsApp.

---

## Infobip WhatsApp (QA / trial) — [onboarding guide](https://portal.infobip.com/onboarding-guide)

Infobip free trial (0/6 steps in the portal):

- Use Infobip’s **test sender** (`447860099299` by default)
- **100 free** WhatsApp messages
- Send only to **verified numbers**

### Complete the 6 portal steps

1. **Send your test message** — verify your phone in the Infobip UI and send a trial WhatsApp  
2. **Check message status log** — confirm delivery in Infobip  
3. **Register your WhatsApp sender** — later for production (keep test sender for QA)  
4–6. Follow remaining onboarding steps in the portal (templates, webhooks, go-live as shown)

### API credentials

1. [Developer Tools → API Keys](https://portal.infobip.com/) → create a key with scope **`whatsapp:message:send`**  
2. Copy **Base URL** (e.g. `https://xxxxx.api.infobip.com`) and the **API key**

### App env (`apps/api/.env`)

```env
SMS_PROVIDER=africastalking
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=infobip

INFOBIP_BASE_URL=https://YOUR_SUBDOMAIN.api.infobip.com
INFOBIP_API_KEY=your_api_key
INFOBIP_WHATSAPP_FROM=447860099299
```

Restart the API. Phone OTP then goes to **AT SMS + Infobip WhatsApp**.

### Trial limits that matter for OTP

| Constraint | What to do |
|------------|------------|
| Verified numbers only | Add/verify `+254…` in Infobip onboarding before testing |
| Free-form text needs a recent user message (24h) | Complete “Send your test message” first, or use an approved **template** |
| Test sender | Keep `INFOBIP_WHATSAPP_FROM=447860099299` until you register your own |

### Templates (recommended for real OTP)

Business-initiated OTP outside the 24h window needs a Meta-approved template:

```env
INFOBIP_WHATSAPP_OTP_TEMPLATE=your_otp_template_name
INFOBIP_WHATSAPP_TEMPLATE_LANG=en
# Only if the template is an Authentication “copy code” / URL button template:
# INFOBIP_WHATSAPP_OTP_AUTH_BUTTON=true
```

API references:

- [Send text](https://www.infobip.com/docs/api/channels/whatsapp/whatsapp-outbound-messages/whatsapp-text-and-media-messages/send-whatsapp-text-message)  
- [Send template](https://www.infobip.com/docs/api/channels/whatsapp/whatsapp-outbound-messages/whatsapp-template-message/send-whatsapp-template-message)  
- [API authorization](https://www.infobip.com/docs/essentials/api-essentials/api-authorization)

---

## Africa's Talking SMS

```env
SMS_PROVIDER=africastalking
AT_USERNAME=sandbox
AT_API_KEY=…
AT_SANDBOX=true
```

See earlier AT notes; sandbox OTP is read in the [simulator](https://simulator.africastalking.com:1517/).

---

## Local console

```env
SMS_PROVIDER=console
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=console
```

---

## Production checklist

- [ ] Infobip own WhatsApp sender registered (step 3+)  
- [ ] OTP authentication template approved  
- [ ] Live SMS sender ID (AT/Twilio)  
- [ ] Secrets only in host env  
- [ ] Smoke-test SMS + WhatsApp on a real Kenyan number  

Message copy: `apps/api/src/messaging/message.templates.ts`.
