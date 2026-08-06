"use client";

import { Mail, Smartphone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { PhoneWithCountryInput } from "@/components/auth/PhoneWithCountryInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthCountryCode } from "@/lib/auth/countries";
import { cn } from "@/lib/utils";

type Channel = "phone" | "email";

export function PhoneOtpSignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect_url") || "/";

  const [channel, setChannel] = useState<Channel>("phone");
  const [countryCode, setCountryCode] = useState<AuthCountryCode>("KE");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"identity" | "code">("identity");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [phoneChannels, setPhoneChannels] = useState<{
    sms?: boolean;
    whatsapp?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const destination =
    channel === "phone" ? phone : email.trim().toLowerCase();

  function switchChannel(next: Channel) {
    setChannel(next);
    setError(null);
    setCode("");
    setDevCode(null);
    setPhoneChannels(null);
    setStep("identity");
  }

  function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (channel === "phone" && phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid mobile number");
      return;
    }
    if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          channel === "phone"
            ? { channel: "phone", phone }
            : { channel: "email", email: email.trim() },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message || "Could not send code",
        );
        return;
      }
      if (data.phone) setPhone(data.phone);
      if (data.email) setEmail(data.email);
      setDevCode(data.devCode || null);
      setPhoneChannels(
        channel === "phone" && data.channels ? data.channels : null,
      );
      setStep("code");
    });
  }

  function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          code,
          name: name || undefined,
          ...(channel === "phone" ? { phone } : { email: email.trim() }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message || "Invalid code",
        );
        return;
      }

      const onboarded = Boolean(data.user?.onboardingComplete);
      const requested =
        redirectTo.startsWith("http") || !redirectTo.startsWith("/")
          ? "/"
          : redirectTo;
      // Existing accounts with completed setup go straight in — never re-onboard
      const dest = onboarded
        ? requested === "/onboarding"
          ? "/"
          : requested
        : "/onboarding";

      router.push(dest);
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-border bg-card p-6 md:p-8 shadow-warm-md">
      <h1 className="text-2xl font-heading font-semibold mb-2">Sign in</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Verify with a one-time code sent to your phone or email.
      </p>

      {step === "identity" ? (
        <form onSubmit={requestOtp} className="space-y-5">
          <div
            className="flex gap-1 rounded-xl bg-muted/80 p-1"
            role="tablist"
            aria-label="Sign-in method"
          >
            <button
              type="button"
              role="tab"
              aria-selected={channel === "phone"}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                channel === "phone"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => switchChannel("phone")}
            >
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              Phone
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={channel === "email"}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                channel === "email"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => switchChannel("email")}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email
            </button>
          </div>

          {channel === "phone" ? (
            <PhoneWithCountryInput
              value={phone}
              countryCode={countryCode}
              onCountryChange={setCountryCode}
              onChange={(e164) => setPhone(e164)}
              required
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? "Sending…"
              : channel === "phone"
                ? "Send SMS & WhatsApp code"
                : "Send email code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Code sent to{" "}
            <span className="text-foreground font-medium">{destination}</span>
            {channel === "phone" && phoneChannels?.whatsapp
              ? " via SMS and WhatsApp"
              : channel === "phone"
                ? " via SMS"
                : ""}
          </p>
          {devCode ? (
            <p className="text-xs rounded-lg bg-secondary/40 px-3 py-2">
              Dev OTP: <strong>{devCode}</strong>
              {channel === "phone" ? (
                <span className="block mt-1 text-muted-foreground">
                  Also logged as SMS
                  {phoneChannels?.whatsapp ? " and WhatsApp" : ""} in the API
                  console.
                </span>
              ) : null}
            </p>
          ) : channel === "email" ? (
            <p className="text-xs rounded-lg bg-secondary/40 px-3 py-2">
              Check your inbox (and spam folder) for the verification code. Works
              with Gmail, Outlook, Yahoo, and other providers.
            </p>
          ) : (
            <p className="text-xs rounded-lg bg-secondary/40 px-3 py-2">
              {phoneChannels?.whatsapp
                ? "We sent the same code by SMS and WhatsApp. Use either message."
                : "We sent a verification code by SMS to this number."}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="code">OTP code</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="tracking-[0.3em] text-center text-lg font-medium"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Verifying…" : "Verify & continue"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setStep("identity");
              setCode("");
              setDevCode(null);
              setError(null);
            }}
          >
            {channel === "phone" ? "Change number" : "Change email"}
          </Button>
        </form>
      )}
    </div>
  );
}
