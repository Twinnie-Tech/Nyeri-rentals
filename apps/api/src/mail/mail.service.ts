import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import nodemailer, { type Transporter } from "nodemailer";
import type {
  MailProviderName,
  SendMailInput,
  SendMailResult,
} from "./mail.types";
import { buildOtpEmail } from "./otp-email.template";
import { buildWelcomeEmail } from "./welcome-email.template";

const PROVIDERS: MailProviderName[] = [
  "console",
  "smtp",
  "mailtrap",
  "mailtrap-send",
  "resend",
  "sendgrid",
];

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private smtpTransport: Transporter | null = null;
  private smtpTransportKey: string | null = null;

  constructor(private config: ConfigService) {}

  getProvider(): MailProviderName {
    const raw = (this.config.get<string>("EMAIL_PROVIDER") || "console")
      .trim()
      .toLowerCase();
    if (PROVIDERS.includes(raw as MailProviderName)) {
      return raw as MailProviderName;
    }
    this.logger.warn(
      `Unknown EMAIL_PROVIDER="${raw}", falling back to console`,
    );
    return "console";
  }

  async sendOtpEmail(to: string, code: string, expiresInSeconds: number) {
    const content = buildOtpEmail({
      code,
      expiresInSeconds,
      brandName: this.config.get("MAIL_FROM_NAME") || "GreenKey Realty",
      appUrl: this.config.get("APP_URL") || "http://localhost:3000",
    });

    return this.send({
      to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
  }

  async sendWelcomeEmail(to: string, name?: string | null) {
    const content = buildWelcomeEmail({
      name,
      brandName: this.config.get("MAIL_FROM_NAME") || "GreenKey Realty",
      appUrl: this.config.get("APP_URL") || "http://localhost:3000",
    });

    return this.send({
      to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
  }

  async send(input: SendMailInput): Promise<SendMailResult> {
    const provider = this.getProvider();

    try {
      switch (provider) {
        case "smtp":
          return await this.sendViaSmtp(input, "smtp");
        case "mailtrap":
          return await this.sendViaMailtrap(input, "testing");
        case "mailtrap-send":
          return await this.sendViaMailtrap(input, "sending");
        case "resend":
          return await this.sendViaResend(input);
        case "sendgrid":
          return await this.sendViaSendgrid(input);
        default:
          return this.sendViaConsole(input);
      }
    } catch (err) {
      this.logger.error(
        `Failed to send email via ${provider}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new ServiceUnavailableException(
        "Could not send verification email. Please try again shortly.",
      );
    }
  }

  private fromHeader() {
    const email =
      this.config.get<string>("MAIL_FROM_EMAIL") || "noreply@greenkey.local";
    const name = this.config.get<string>("MAIL_FROM_NAME") || "GreenKey Realty";
    return { email, name, formatted: `${name} <${email}>` };
  }

  private sendViaConsole(input: SendMailInput): SendMailResult {
    this.logger.log(
      `[console mail] to=${input.to} subject="${input.subject}"\n${input.text}`,
    );
    return { provider: "console", previewOnly: true, messageId: "console" };
  }

  /**
   * Mailtrap Email Testing (sandbox) — QA / staging.
   * Mailtrap Email Sending (live) — production-capable delivery.
   */
  private async sendViaMailtrap(
    input: SendMailInput,
    mode: "testing" | "sending",
  ): Promise<SendMailResult> {
    const user =
      this.config.get<string>("MAILTRAP_USER") ||
      this.config.get<string>("SMTP_USER");
    const pass =
      this.config.get<string>("MAILTRAP_PASS") ||
      this.config.get<string>("SMTP_PASS");

    if (!user || !pass) {
      throw new Error(
        `Mailtrap (${mode}) requires MAILTRAP_USER and MAILTRAP_PASS ` +
          `(from the Mailtrap dashboard)`,
      );
    }

    const defaults =
      mode === "testing"
        ? { host: "sandbox.smtp.mailtrap.io", port: 2525 }
        : { host: "live.smtp.mailtrap.io", port: 587 };

    const host =
      this.config.get<string>("MAILTRAP_HOST") ||
      this.config.get<string>("SMTP_HOST") ||
      defaults.host;
    const port = Number(
      this.config.get("MAILTRAP_PORT") ||
        this.config.get("SMTP_PORT") ||
        defaults.port,
    );

    const transport = this.getOrCreateTransport({
      key: `mailtrap:${mode}:${host}:${port}:${user}`,
      host,
      port,
      user,
      pass,
      secure: false,
      // Mailtrap Testing + local AV SSL inspection often need this
      tlsRejectUnauthorized:
        mode === "sending" ? this.smtpTlsRejectUnauthorized() : false,
    });

    const from = this.fromHeader();
    const info = await transport.sendMail({
      from: from.formatted,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    const provider: MailProviderName =
      mode === "testing" ? "mailtrap" : "mailtrap-send";

    if (mode === "testing") {
      this.logger.log(
        `Mailtrap Testing email captured for ${input.to} — open https://mailtrap.io inbox (id=${info.messageId})`,
      );
    } else {
      this.logger.log(
        `Mailtrap Sending delivered to ${input.to} id=${info.messageId}`,
      );
    }

    // Neither mode returns OTP in the API — QA opens Mailtrap; prod opens real inbox
    return {
      provider,
      previewOnly: false,
      messageId: String(info.messageId || ""),
    };
  }

  private smtpTlsRejectUnauthorized() {
    const raw = this.config.get<string>("SMTP_TLS_REJECT_UNAUTHORIZED");
    if (raw !== undefined && String(raw).trim() !== "") {
      const v = String(raw).trim().toLowerCase();
      return v !== "false" && v !== "0" && v !== "no";
    }
    // Dev default: allow intercepted/self-signed chains (common with antivirus SSL scan)
    return (this.config.get("NODE_ENV") || "development") === "production";
  }

  private getOrCreateTransport(opts: {
    key: string;
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
    tlsRejectUnauthorized?: boolean;
  }) {
    const rejectUnauthorized =
      opts.tlsRejectUnauthorized ?? this.smtpTlsRejectUnauthorized();
    const key = `${opts.key}:tls=${rejectUnauthorized}`;

    if (this.smtpTransport && this.smtpTransportKey === key) {
      return this.smtpTransport;
    }

    this.smtpTransport = nodemailer.createTransport({
      host: opts.host,
      port: opts.port,
      secure: opts.secure,
      auth: { user: opts.user, pass: opts.pass },
      tls: { rejectUnauthorized },
    });
    this.smtpTransportKey = key;
    return this.smtpTransport;
  }

  private getSmtpTransport() {
    const host = this.config.get<string>("SMTP_HOST");
    const port = Number(this.config.get("SMTP_PORT") || 587);
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");

    if (!host || !user || !pass) {
      throw new Error(
        "SMTP provider requires SMTP_HOST, SMTP_USER, and SMTP_PASS",
      );
    }

    const secure =
      String(this.config.get("SMTP_SECURE") || "").toLowerCase() === "true" ||
      port === 465;

    return this.getOrCreateTransport({
      key: `smtp:${host}:${port}:${user}`,
      host,
      port,
      user,
      pass,
      secure,
    });
  }

  private async sendViaSmtp(
    input: SendMailInput,
    provider: "smtp" = "smtp",
  ): Promise<SendMailResult> {
    const transport = this.getSmtpTransport();
    const from = this.fromHeader();
    const info = await transport.sendMail({
      from: from.formatted,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    this.logger.log(`SMTP mail sent to ${input.to} id=${info.messageId}`);
    return {
      provider,
      previewOnly: false,
      messageId: String(info.messageId || ""),
    };
  }

  private async sendViaResend(input: SendMailInput): Promise<SendMailResult> {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
    }

    const from = this.fromHeader();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from.formatted,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });

    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      throw new Error(data.message || `Resend error ${res.status}`);
    }

    this.logger.log(`Resend mail sent to ${input.to} id=${data.id}`);
    return {
      provider: "resend",
      previewOnly: false,
      messageId: data.id,
    };
  }

  private async sendViaSendgrid(input: SendMailInput): Promise<SendMailResult> {
    const apiKey = this.config.get<string>("SENDGRID_API_KEY");
    if (!apiKey) {
      throw new Error(
        "SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid",
      );
    }

    const from = this.fromHeader();
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: input.to }] }],
        from: { email: from.email, name: from.name },
        subject: input.subject,
        content: [
          { type: "text/plain", value: input.text },
          { type: "text/html", value: input.html },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `SendGrid error ${res.status}`);
    }

    const messageId = res.headers.get("x-message-id") || undefined;
    this.logger.log(`SendGrid mail sent to ${input.to} id=${messageId}`);
    return {
      provider: "sendgrid",
      previewOnly: false,
      messageId,
    };
  }
}
