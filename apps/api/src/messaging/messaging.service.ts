import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { buildOtpSms, buildWelcomeSms } from "./message.templates";
import {
  PhoneDeliveryResult,
  SendMessageResult,
  SmsProviderName,
  WhatsAppProviderName,
} from "./messaging.types";

const SMS_PROVIDERS: SmsProviderName[] = [
  "console",
  "africastalking",
  "twilio",
];

const WA_PROVIDERS: WhatsAppProviderName[] = [
  "console",
  "off",
  "africastalking",
  "twilio",
  "meta",
  "infobip",
];

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private config: ConfigService) {}

  getSmsProvider(): SmsProviderName {
    const raw = (this.config.get<string>("SMS_PROVIDER") || "console")
      .trim()
      .toLowerCase();
    if (SMS_PROVIDERS.includes(raw as SmsProviderName)) {
      return raw as SmsProviderName;
    }
    this.logger.warn(`Unknown SMS_PROVIDER="${raw}", falling back to console`);
    return "console";
  }

  /** WhatsApp is on by default; set WHATSAPP_ENABLED=false to disable. */
  isWhatsAppEnabled() {
    const raw = this.config.get<string>("WHATSAPP_ENABLED");
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      return true;
    }
    const v = String(raw).trim().toLowerCase();
    return v !== "false" && v !== "0" && v !== "off" && v !== "no";
  }

  /**
   * Resolves WhatsApp transport.
   * - `off` / WHATSAPP_ENABLED=false → disabled
   * - `auto` (default) → Infobip if configured, else mirror SMS, else console
   */
  getWhatsAppProvider(): WhatsAppProviderName {
    if (!this.isWhatsAppEnabled()) return "off";

    const raw = (this.config.get<string>("WHATSAPP_PROVIDER") || "auto")
      .trim()
      .toLowerCase();

    if (raw === "auto" || raw === "") {
      if (this.config.get<string>("INFOBIP_API_KEY")?.trim()) {
        return "infobip";
      }
      const sms = this.getSmsProvider();
      if (sms === "africastalking" || sms === "twilio") return sms;
      return "console";
    }

    if (WA_PROVIDERS.includes(raw as WhatsAppProviderName)) {
      return raw as WhatsAppProviderName;
    }
    this.logger.warn(
      `Unknown WHATSAPP_PROVIDER="${raw}", falling back to auto/console`,
    );
    if (this.config.get<string>("INFOBIP_API_KEY")?.trim()) {
      return "infobip";
    }
    const sms = this.getSmsProvider();
    if (sms === "africastalking" || sms === "twilio") return sms;
    return "console";
  }

  brandName() {
    return this.config.get("MAIL_FROM_NAME") || "GreenKey Realty";
  }

  appUrl() {
    return this.config.get("APP_URL") || "http://localhost:3000";
  }

  /**
   * Send the same OTP to the phone via SMS and WhatsApp (when enabled).
   * Succeeds if at least one live channel delivers (SMS and/or WhatsApp).
   */
  async sendOtpPhone(
    phone: string,
    code: string,
    expiresInSeconds: number,
  ): Promise<PhoneDeliveryResult> {
    const body = buildOtpSms({
      code,
      expiresInSeconds,
      brandName: this.brandName(),
    });

    const waProvider = this.getWhatsAppProvider();
    const smsPromise = this.sendSms(phone, body);
    const waPromise =
      waProvider === "off"
        ? Promise.resolve(null)
        : this.sendWhatsAppSafe(phone, body, {
            kind: "otp",
            code,
            expiresInSeconds,
          });

    const [smsResult, whatsapp] = await Promise.all([
      smsPromise.then(
        (sms) => ({ ok: true as const, sms }),
        (err) => ({ ok: false as const, err }),
      ),
      waPromise,
    ]);

    const whatsappLiveOk = Boolean(
      whatsapp &&
        whatsapp.provider !== "off" &&
        whatsapp.messageId !== "failed" &&
        !whatsapp.previewOnly,
    );

    if (!smsResult.ok) {
      this.logger.error(
        `OTP SMS failed for ${phone}`,
        smsResult.err instanceof Error
          ? smsResult.err.stack
          : String(smsResult.err),
      );

      // WhatsApp alone is enough to complete OTP request
      if (whatsappLiveOk && whatsapp) {
        this.logger.warn(
          `OTP delivered via WhatsApp only (SMS failed) for ${phone}`,
        );
        return {
          sms: {
            channel: "sms",
            provider: this.getSmsProvider(),
            previewOnly: false,
            messageId: "failed",
          },
          whatsapp,
          previewOnly: false,
        };
      }

      throw new ServiceUnavailableException(
        "Could not send verification code. Please try again shortly.",
      );
    }

    const sms = smsResult.sms;
    const previewOnly = sms.previewOnly && (!whatsapp || whatsapp.previewOnly);

    this.logger.log(
      `OTP to ${phone}: sms=${sms.provider}` +
        (whatsapp ? ` whatsapp=${whatsapp.provider}` : " whatsapp=off"),
    );

    return { sms, whatsapp, previewOnly };
  }

  async sendWelcomePhone(phone: string, name?: string | null) {
    const body = buildWelcomeSms({
      name,
      brandName: this.brandName(),
      appUrl: this.appUrl(),
    });

    const [sms, whatsapp] = await Promise.all([
      this.sendSms(phone, body).catch((err) => {
        this.logger.error(
          `Welcome SMS failed for ${phone}`,
          err instanceof Error ? err.message : String(err),
        );
        return null;
      }),
      this.sendWhatsAppSafe(phone, body, { kind: "welcome" }).catch(() => null),
    ]);

    return { sms, whatsapp };
  }

  private async sendWhatsAppSafe(
    phone: string,
    text: string,
    meta: { kind: "otp" | "welcome"; code?: string; expiresInSeconds?: number },
  ): Promise<SendMessageResult | null> {
    const provider = this.getWhatsAppProvider();
    if (provider === "off") return null;

    try {
      return await this.sendWhatsApp(phone, text, meta);
    } catch (err) {
      this.logger.error(
        `WhatsApp ${meta.kind} failed for ${phone}`,
        err instanceof Error ? err.stack : String(err),
      );
      // WhatsApp is best-effort alongside SMS — do not fail the whole OTP
      if (provider === "console") {
        return {
          channel: "whatsapp",
          provider: "console",
          previewOnly: true,
        };
      }
      return {
        channel: "whatsapp",
        provider,
        previewOnly: false,
        messageId: "failed",
      };
    }
  }

  async sendSms(to: string, body: string): Promise<SendMessageResult> {
    const provider = this.getSmsProvider();
    try {
      switch (provider) {
        case "africastalking":
          return await this.sendSmsAfricasTalking(to, body);
        case "twilio":
          return await this.sendSmsTwilio(to, body);
        default:
          this.logger.log(`[console sms] to=${to}\n${body}`);
          return {
            channel: "sms",
            provider: "console",
            previewOnly: true,
            messageId: "console",
          };
      }
    } catch (err) {
      this.logger.error(
        `Failed to send SMS via ${provider}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  async sendWhatsApp(
    to: string,
    text: string,
    meta: { kind: "otp" | "welcome"; code?: string; expiresInSeconds?: number },
  ): Promise<SendMessageResult> {
    const provider = this.getWhatsAppProvider();
    switch (provider) {
      case "off":
        return {
          channel: "whatsapp",
          provider: "off",
          previewOnly: true,
        };
      case "africastalking":
        return await this.sendWhatsAppAfricasTalking(to, text, meta);
      case "twilio":
        return await this.sendWhatsAppTwilio(to, text, meta);
      case "meta":
        return await this.sendWhatsAppMeta(to, text, meta);
      case "infobip":
        return await this.sendWhatsAppInfobip(to, text, meta);
      default:
        this.logger.log(`[console whatsapp] to=${to}\n${text}`);
        return {
          channel: "whatsapp",
          provider: "console",
          previewOnly: true,
          messageId: "console",
        };
    }
  }

  // --- Africa's Talking SMS ---

  private atBase() {
    const sandbox =
      String(this.config.get("AT_SANDBOX") || "").toLowerCase() === "true";
    return sandbox
      ? "https://api.sandbox.africastalking.com/version1"
      : "https://api.africastalking.com/version1";
  }

  private atCredentials() {
    const username = this.config.get<string>("AT_USERNAME");
    const apiKey = this.config.get<string>("AT_API_KEY");
    if (!username || !apiKey) {
      throw new Error("AT_USERNAME and AT_API_KEY are required");
    }
    return { username, apiKey };
  }

  private async sendSmsAfricasTalking(
    to: string,
    body: string,
  ): Promise<SendMessageResult> {
    const { username, apiKey } = this.atCredentials();
    const from = this.config.get<string>("AT_SMS_FROM") || undefined;

    const params = new URLSearchParams();
    params.set("username", username);
    params.set("to", to);
    params.set("message", body);
    if (from) params.set("from", from);

    const res = await fetch(`${this.atBase()}/messaging`, {
      method: "POST",
      headers: {
        apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const raw = await res.text();
    let data: {
      SMSMessageData?: {
        Message?: string;
        Recipients?: Array<{
          statusCode?: number;
          messageId?: string;
          status?: string;
        }>;
      };
    } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      // AT often returns plain text on auth errors, e.g. "The supplied authentication is invalid"
      throw new Error(raw.trim() || `Africa's Talking SMS error ${res.status}`);
    }

    if (!res.ok) {
      throw new Error(
        data.SMSMessageData?.Message ||
          raw.trim() ||
          `Africa's Talking SMS error ${res.status}`,
      );
    }

    const recipient = data.SMSMessageData?.Recipients?.[0];
    const statusCode = recipient?.statusCode;
    // 100 / 101 = success queued / sent
    if (statusCode !== undefined && statusCode >= 200) {
      throw new Error(
        recipient?.status || data.SMSMessageData?.Message || "SMS rejected",
      );
    }

    this.logger.log(
      `AT SMS sent to ${to} id=${recipient?.messageId} status=${recipient?.status}`,
    );
    return {
      channel: "sms",
      provider: "africastalking",
      previewOnly: false,
      messageId: recipient?.messageId,
    };
  }

  private async sendWhatsAppAfricasTalking(
    to: string,
    text: string,
    meta: { kind: "otp" | "welcome"; code?: string },
  ): Promise<SendMessageResult> {
    const { username, apiKey } = this.atCredentials();
    const waNumber = this.config.get<string>("AT_WHATSAPP_NUMBER");
    if (!waNumber) {
      throw new Error("AT_WHATSAPP_NUMBER is required for WhatsApp via AT");
    }

    const templateId = this.config.get<string>("AT_WHATSAPP_OTP_TEMPLATE_ID");
    const welcomeTemplateId = this.config.get<string>(
      "AT_WHATSAPP_WELCOME_TEMPLATE_ID",
    );

    let body: Record<string, unknown>;
    if (meta.kind === "otp" && templateId && meta.code) {
      body = {
        templateId,
        headerValue: this.brandName(),
        bodyValues: [meta.code],
      };
    } else if (meta.kind === "welcome" && welcomeTemplateId) {
      body = {
        templateId: welcomeTemplateId,
        headerValue: this.brandName(),
        bodyValues: [this.brandName()],
      };
    } else {
      // Session / free-form text (works after user opts in; sandbox testing)
      body = { message: text };
    }

    const res = await fetch(
      "https://chat.africastalking.com/whatsapp/message/send",
      {
        method: "POST",
        headers: {
          apiKey,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          waNumber,
          phoneNumber: to,
          body,
        }),
      },
    );

    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      id?: string;
      messageId?: string;
    };
    if (!res.ok) {
      throw new Error(
        data.message || `Africa's Talking WhatsApp error ${res.status}`,
      );
    }

    const messageId = data.messageId || data.id;
    this.logger.log(`AT WhatsApp sent to ${to} id=${messageId}`);
    return {
      channel: "whatsapp",
      provider: "africastalking",
      previewOnly: false,
      messageId,
    };
  }

  // --- Twilio ---

  private twilioAuthHeader() {
    const sid = this.config.get<string>("TWILIO_ACCOUNT_SID");
    const token = this.config.get<string>("TWILIO_AUTH_TOKEN");
    if (!sid || !token) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required");
    }
    return {
      sid,
      header: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
    };
  }

  private async sendSmsTwilio(
    to: string,
    body: string,
  ): Promise<SendMessageResult> {
    const { sid, header } = this.twilioAuthHeader();
    const from = this.config.get<string>("TWILIO_SMS_FROM");
    if (!from) throw new Error("TWILIO_SMS_FROM is required");

    const params = new URLSearchParams();
    params.set("To", to);
    params.set("From", from);
    params.set("Body", body);

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: header,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    const data = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) {
      throw new Error(data.message || `Twilio SMS error ${res.status}`);
    }

    this.logger.log(`Twilio SMS sent to ${to} id=${data.sid}`);
    return {
      channel: "sms",
      provider: "twilio",
      previewOnly: false,
      messageId: data.sid,
    };
  }

  private async sendWhatsAppTwilio(
    to: string,
    text: string,
    meta: { kind: "otp" | "welcome"; code?: string },
  ): Promise<SendMessageResult> {
    const { sid, header } = this.twilioAuthHeader();
    const from =
      this.config.get<string>("TWILIO_WHATSAPP_FROM") ||
      this.config.get<string>("TWILIO_SMS_FROM");
    if (!from) throw new Error("TWILIO_WHATSAPP_FROM is required");

    const params = new URLSearchParams();
    params.set("To", to.startsWith("whatsapp:") ? to : `whatsapp:${to}`);
    params.set(
      "From",
      from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    );

    const contentSid =
      meta.kind === "otp"
        ? this.config.get<string>("TWILIO_WHATSAPP_OTP_CONTENT_SID")
        : this.config.get<string>("TWILIO_WHATSAPP_WELCOME_CONTENT_SID");

    if (contentSid && meta.kind === "otp" && meta.code) {
      params.set("ContentSid", contentSid);
      params.set("ContentVariables", JSON.stringify({ "1": meta.code }));
    } else if (contentSid) {
      params.set("ContentSid", contentSid);
    } else {
      params.set("Body", text);
    }

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: header,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    const data = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) {
      throw new Error(data.message || `Twilio WhatsApp error ${res.status}`);
    }

    this.logger.log(`Twilio WhatsApp sent to ${to} id=${data.sid}`);
    return {
      channel: "whatsapp",
      provider: "twilio",
      previewOnly: false,
      messageId: data.sid,
    };
  }

  // --- Meta Cloud API ---

  private async sendWhatsAppMeta(
    to: string,
    text: string,
    meta: { kind: "otp" | "welcome"; code?: string },
  ): Promise<SendMessageResult> {
    const token = this.config.get<string>("META_WHATSAPP_TOKEN");
    const phoneNumberId = this.config.get<string>(
      "META_WHATSAPP_PHONE_NUMBER_ID",
    );
    if (!token || !phoneNumberId) {
      throw new Error(
        "META_WHATSAPP_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID are required",
      );
    }

    const digits = to.replace(/\D/g, "");
    const otpTemplate =
      this.config.get<string>("META_WHATSAPP_OTP_TEMPLATE") || "otp_verify";
    const welcomeTemplate =
      this.config.get<string>("META_WHATSAPP_WELCOME_TEMPLATE") || "welcome";
    const lang = this.config.get<string>("META_WHATSAPP_TEMPLATE_LANG") || "en";

    let payload: Record<string, unknown>;

    if (meta.kind === "otp" && meta.code) {
      payload = {
        messaging_product: "whatsapp",
        to: digits,
        type: "template",
        template: {
          name: otpTemplate,
          language: { code: lang },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: meta.code }],
            },
          ],
        },
      };
    } else if (meta.kind === "welcome") {
      payload = {
        messaging_product: "whatsapp",
        to: digits,
        type: "template",
        template: {
          name: welcomeTemplate,
          language: { code: lang },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: this.brandName(),
                },
              ],
            },
          ],
        },
      };
    } else {
      payload = {
        messaging_product: "whatsapp",
        to: digits,
        type: "text",
        text: { body: text },
      };
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = (await res.json()) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(
        data.error?.message || `Meta WhatsApp error ${res.status}`,
      );
    }

    const messageId = data.messages?.[0]?.id;
    this.logger.log(`Meta WhatsApp sent to ${to} id=${messageId}`);
    return {
      channel: "whatsapp",
      provider: "meta",
      previewOnly: false,
      messageId,
    };
  }

  // --- Infobip WhatsApp ---

  /** Infobip expects MSISDNs without '+'. */
  private infobipMsisdn(phone: string) {
    return phone.replace(/\D/g, "");
  }

  private infobipBaseUrl() {
    let raw = (
      this.config.get<string>("INFOBIP_BASE_URL") || "https://api.infobip.com"
    )
      .trim()
      .replace(/\/$/, "");
    if (!/^https?:\/\//i.test(raw)) {
      raw = `https://${raw}`;
    }
    return raw;
  }

  private async sendWhatsAppInfobip(
    to: string,
    text: string,
    meta: { kind: "otp" | "welcome"; code?: string },
  ): Promise<SendMessageResult> {
    const apiKey = this.config.get<string>("INFOBIP_API_KEY");
    const from =
      this.config.get<string>("INFOBIP_WHATSAPP_FROM") || "447860099299";
    if (!apiKey) {
      throw new Error(
        "INFOBIP_API_KEY is required when WHATSAPP_PROVIDER=infobip",
      );
    }

    const toMsisdn = this.infobipMsisdn(to);
    const fromMsisdn = this.infobipMsisdn(from);
    const otpTemplate = this.config.get<string>(
      "INFOBIP_WHATSAPP_OTP_TEMPLATE",
    );
    const welcomeTemplate = this.config.get<string>(
      "INFOBIP_WHATSAPP_WELCOME_TEMPLATE",
    );
    const lang =
      this.config.get<string>("INFOBIP_WHATSAPP_TEMPLATE_LANG") || "en";

    const useTemplate =
      (meta.kind === "otp" && Boolean(otpTemplate?.trim())) ||
      (meta.kind === "welcome" && Boolean(welcomeTemplate?.trim()));

    if (useTemplate) {
      return this.sendWhatsAppInfobipTemplate({
        apiKey,
        from: fromMsisdn,
        to: toMsisdn,
        kind: meta.kind,
        code: meta.code,
        text,
        templateName:
          meta.kind === "otp"
            ? (otpTemplate as string).trim()
            : (welcomeTemplate as string).trim(),
        language: lang,
      });
    }

    // Free-form text — trial / 24h session window after user messages the sender
    const res = await fetch(
      `${this.infobipBaseUrl()}/whatsapp/1/message/text`,
      {
        method: "POST",
        headers: {
          Authorization: `App ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          from: fromMsisdn,
          to: toMsisdn,
          content: { text },
        }),
      },
    );

    const raw = await res.text();
    let data: {
      messageId?: string;
      to?: string;
      requestError?: {
        serviceException?: { text?: string; messageId?: string };
      };
    } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      throw new Error(raw.trim() || `Infobip WhatsApp error ${res.status}`);
    }

    if (!res.ok) {
      throw new Error(
        data.requestError?.serviceException?.text ||
          raw.trim() ||
          `Infobip WhatsApp error ${res.status}`,
      );
    }

    this.logger.log(
      `Infobip WhatsApp text sent to ${toMsisdn} id=${data.messageId}`,
    );
    return {
      channel: "whatsapp",
      provider: "infobip",
      previewOnly: false,
      messageId: data.messageId,
    };
  }

  private async sendWhatsAppInfobipTemplate(opts: {
    apiKey: string;
    from: string;
    to: string;
    kind: "otp" | "welcome";
    code?: string;
    text: string;
    templateName: string;
    language: string;
  }): Promise<SendMessageResult> {
    const placeholders =
      opts.kind === "otp" && opts.code ? [opts.code] : [this.brandName()];

    const content: Record<string, unknown> = {
      templateName: opts.templateName,
      templateData: {
        body: { placeholders },
        ...(opts.kind === "otp" &&
        opts.code &&
        String(
          this.config.get("INFOBIP_WHATSAPP_OTP_AUTH_BUTTON") || "",
        ).toLowerCase() === "true"
          ? {
              buttons: [{ type: "URL", parameter: opts.code }],
            }
          : {}),
      },
      language: opts.language,
    };

    const res = await fetch(
      `${this.infobipBaseUrl()}/whatsapp/1/message/template`,
      {
        method: "POST",
        headers: {
          Authorization: `App ${opts.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              from: opts.from,
              to: opts.to,
              content,
            },
          ],
        }),
      },
    );

    const raw = await res.text();
    let data: {
      messages?: Array<{ messageId?: string; to?: string }>;
      requestError?: { serviceException?: { text?: string } };
    } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      throw new Error(raw.trim() || `Infobip template error ${res.status}`);
    }

    if (!res.ok) {
      throw new Error(
        data.requestError?.serviceException?.text ||
          raw.trim() ||
          `Infobip template error ${res.status}`,
      );
    }

    const messageId = data.messages?.[0]?.messageId;
    this.logger.log(
      `Infobip WhatsApp template sent to ${opts.to} id=${messageId}`,
    );
    return {
      channel: "whatsapp",
      provider: "infobip",
      previewOnly: false,
      messageId,
    };
  }
}
