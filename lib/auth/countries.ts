export const AUTH_COUNTRIES = [
  {
    code: "KE",
    name: "Kenya",
    dial: "+254",
    flag: "🇰🇪",
    /** National significant number length (without leading 0) */
    nsLength: 9,
    placeholder: "7XX XXX XXX",
  },
  {
    code: "UG",
    name: "Uganda",
    dial: "+256",
    flag: "🇺🇬",
    nsLength: 9,
    placeholder: "7XX XXX XXX",
  },
  {
    code: "TZ",
    name: "Tanzania",
    dial: "+255",
    flag: "🇹🇿",
    nsLength: 9,
    placeholder: "7XX XXX XXX",
  },
  {
    code: "RW",
    name: "Rwanda",
    dial: "+250",
    flag: "🇷🇼",
    nsLength: 9,
    placeholder: "7XX XXX XXX",
  },
] as const;

export type AuthCountryCode = (typeof AUTH_COUNTRIES)[number]["code"];

export function getAuthCountry(code: string) {
  return AUTH_COUNTRIES.find((c) => c.code === code) || AUTH_COUNTRIES[0];
}

/** Build E.164 from dial code + local digits (strips leading 0). */
export function toE164(dial: string, local: string): string {
  const digits = local.replace(/\D/g, "").replace(/^0+/, "");
  return `${dial}${digits}`;
}
