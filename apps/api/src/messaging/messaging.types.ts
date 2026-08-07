export type SmsProviderName = "console" | "africastalking" | "twilio";

export type WhatsAppProviderName =
  | "console"
  | "off"
  | "africastalking"
  | "twilio"
  | "meta"
  | "infobip";

export type SendMessageResult = {
  channel: "sms" | "whatsapp";
  provider: string;
  previewOnly: boolean;
  messageId?: string;
};

export type PhoneDeliveryResult = {
  sms: SendMessageResult;
  whatsapp: SendMessageResult | null;
  /** True when no live channel delivered (dev OTP may be returned) */
  previewOnly: boolean;
};
