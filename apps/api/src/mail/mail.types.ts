export type MailProviderName =
  | "console"
  | "smtp"
  | "mailtrap"
  | "mailtrap-send"
  | "resend"
  | "sendgrid";

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type SendMailResult = {
  provider: MailProviderName;
  messageId?: string;
  /**
   * True when the code was only logged / not meant for a real user inbox
   * (console). Mailtrap Testing still sets this false so QA opens Mailtrap UI.
   */
  previewOnly: boolean;
};
