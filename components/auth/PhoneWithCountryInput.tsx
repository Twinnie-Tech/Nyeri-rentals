"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AUTH_COUNTRIES,
  getAuthCountry,
  toE164,
  type AuthCountryCode,
} from "@/lib/auth/countries";
import { cn } from "@/lib/utils";

type PhoneWithCountryProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (e164: string, local: string, countryCode: AuthCountryCode) => void;
  countryCode?: AuthCountryCode;
  onCountryChange?: (code: AuthCountryCode) => void;
  required?: boolean;
  disabled?: boolean;
};

export function PhoneWithCountryInput({
  id,
  label = "Phone number",
  value,
  onChange,
  countryCode = "KE",
  onCountryChange,
  required,
  disabled,
}: PhoneWithCountryProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const country = getAuthCountry(countryCode);
  const [open, setOpen] = useState(false);

  /** Prefer showing local national number without dial prefix */
  const localDisplay = (() => {
    const digits = value.replace(/\D/g, "");
    const dialDigits = country.dial.replace("+", "");
    if (digits.startsWith(dialDigits)) {
      return digits.slice(dialDigits.length);
    }
    if (value.startsWith("0")) return value.replace(/\D/g, "").slice(1);
    if (!value.startsWith("+")) return value.replace(/\D/g, "");
    return "";
  })();

  function selectCountry(code: AuthCountryCode) {
    onCountryChange?.(code);
    const next = getAuthCountry(code);
    const e164 = localDisplay
      ? toE164(next.dial, localDisplay)
      : next.dial;
    onChange(e164 === next.dial ? "" : e164, localDisplay, code);
    setOpen(false);
  }

  function handleLocalChange(raw: string) {
    const cleaned = raw.replace(/[^\d\s]/g, "");
    const digits = cleaned.replace(/\D/g, "").replace(/^0+/, "");
    const limited = digits.slice(0, country.nsLength);
    const e164 = limited ? toE164(country.dial, limited) : "";
    onChange(e164, limited, countryCode);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div
        className={cn(
          "flex h-11 overflow-hidden rounded-lg border-2 border-border bg-background shadow-xs",
          "focus-within:border-primary focus-within:ring-primary/20 focus-within:ring-[3px]",
          "transition-[border-color,box-shadow] duration-200",
          disabled && "opacity-50 pointer-events-none",
        )}
      >
        <div className="relative shrink-0 border-r border-border">
          <button
            type="button"
            aria-label="Select country"
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex h-full items-center gap-1.5 px-3 text-sm font-medium",
              "hover:bg-accent/60 transition-colors",
            )}
          >
            <span className="text-base leading-none" aria-hidden="true">
              {country.flag}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {country.dial}
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>

          {open ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close country list"
                onClick={() => setOpen(false)}
              />
              <ul
                role="listbox"
                className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[220px] overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-warm-md"
              >
                {AUTH_COUNTRIES.map((c) => (
                  <li key={c.code} role="option" aria-selected={c.code === countryCode}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm",
                        "hover:bg-accent transition-colors",
                        c.code === countryCode && "bg-accent/70",
                      )}
                      onClick={() => selectCountry(c.code)}
                    >
                      <span className="text-base" aria-hidden="true">
                        {c.flag}
                      </span>
                      <span className="flex-1 font-medium">{c.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {c.dial}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <Input
          id={inputId}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={country.placeholder}
          value={localDisplay}
          onChange={(e) => handleLocalChange(e.target.value)}
          required={required}
          disabled={disabled}
          className="h-full min-w-0 flex-1 rounded-none border-0 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
