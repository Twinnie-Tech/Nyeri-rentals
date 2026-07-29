export function buildOtpSms(params: {
  code: string;
  expiresInSeconds: number;
  brandName?: string;
}) {
  const brand = params.brandName || "GreenKey Realty";
  const minutes = Math.max(1, Math.round(params.expiresInSeconds / 60));
  return `${brand} code: ${params.code}. Expires in ${minutes} min. Do not share this code.`;
}

export function buildWelcomeSms(params: {
  name?: string | null;
  brandName?: string;
  appUrl?: string;
}) {
  const brand = params.brandName || "GreenKey Realty";
  const greeting = params.name?.trim()
    ? `Hi ${params.name.trim()}`
    : "Welcome";
  const app = params.appUrl || "https://greenkeyrealty.co.ke";
  return `${greeting}! You're on ${brand}. Explore homes and connect with agents: ${app}`;
}
