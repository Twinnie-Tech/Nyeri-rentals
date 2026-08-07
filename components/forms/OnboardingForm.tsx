"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  completeUserOnboarding,
  requestEmailVerification,
  requestPhoneVerification,
  verifyEmailLink,
  verifyPhoneLink,
} from "@/actions/users";
import { PhoneWithCountryInput } from "@/components/auth/PhoneWithCountryInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import type { AuthCountryCode } from "@/lib/auth/countries";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  phone: z.string().min(1, "Phone number is required"),
});

type FormData = z.infer<typeof formSchema>;
type Step = "details" | "verify-phone" | "verify-email";

interface OnboardingFormProps {
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
}

function phonesEqual(a?: string | null, b?: string | null) {
  const norm = (v?: string | null) => (v || "").replace(/\D/g, "");
  return norm(a) === norm(b) && Boolean(norm(a));
}

function emailsEqual(a?: string | null, b?: string | null) {
  return (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
}

export function OnboardingForm({
  defaultName,
  defaultEmail,
  defaultPhone,
  phoneVerified = false,
  emailVerified = false,
}: OnboardingFormProps) {
  const [isPending, startTransition] = useTransition();
  const [countryCode, setCountryCode] = useState<AuthCountryCode>("KE");
  const [step, setStep] = useState<Step>("details");
  const [draft, setDraft] = useState<FormData | null>(null);
  const [pendingPhone, setPendingPhone] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [phoneChannels, setPhoneChannels] = useState<{
    sms?: boolean;
    whatsapp?: boolean;
  } | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [linkedPhone, setLinkedPhone] = useState(
    phoneVerified ? defaultPhone : "",
  );
  const [linkedEmail, setLinkedEmail] = useState(
    emailVerified ? defaultEmail : "",
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultName,
      email: defaultEmail,
      phone: defaultPhone,
    },
  });

  function needsPhoneVerify(phone: string) {
    if (linkedPhone && phonesEqual(phone, linkedPhone)) return false;
    if (phoneVerified && phonesEqual(phone, defaultPhone)) return false;
    return true;
  }

  function needsEmailVerify(email: string) {
    if (linkedEmail && emailsEqual(email, linkedEmail)) return false;
    if (emailVerified && emailsEqual(email, defaultEmail)) return false;
    return true;
  }

  async function finishOnboarding(data: FormData) {
    await completeUserOnboarding({
      name: data.name,
      phone: data.phone,
      email: data.email,
    });
  }

  async function startPhoneVerify(data: FormData) {
    const sent = await requestPhoneVerification(data.phone);
    setPendingPhone(sent.phone);
    setDevCode(sent.devCode || null);
    setPhoneChannels(sent.channels || null);
    setOtpCode("");
    setOtpError(null);
    setStep("verify-phone");
    toast.success(
      sent.channels?.whatsapp
        ? "Code sent by SMS and WhatsApp"
        : "Verification code sent to your phone",
    );
  }

  async function startEmailVerify(data: FormData) {
    const sent = await requestEmailVerification(data.email.trim());
    setPendingEmail(sent.email);
    setDevCode(sent.devCode || null);
    setPhoneChannels(null);
    setOtpCode("");
    setOtpError(null);
    setStep("verify-email");
    toast.success("Verification code sent to your email");
  }

  async function continueAfterPhone(data: FormData) {
    if (needsEmailVerify(data.email)) {
      await startEmailVerify(data);
      return;
    }
    await finishOnboarding({
      ...data,
      email: data.email.trim().toLowerCase(),
    });
  }

  const onSubmitDetails = (data: FormData) => {
    startTransition(async () => {
      try {
        setDraft(data);
        if (needsPhoneVerify(data.phone)) {
          await startPhoneVerify(data);
          return;
        }
        setLinkedPhone(data.phone);
        await continueAfterPhone(data);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        const message =
          error instanceof Error
            ? error.message
            : "Failed to continue setup. Please try again.";
        toast.error(message);
        const lower = message.toLowerCase();
        if (lower.includes("phone")) form.setError("phone", { message });
        if (lower.includes("email")) form.setError("email", { message });
      }
    });
  };

  const onVerifyPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setOtpError(null);
    startTransition(async () => {
      try {
        await verifyPhoneLink(pendingPhone, otpCode.trim());
        const next = { ...draft, phone: pendingPhone };
        setDraft(next);
        setLinkedPhone(pendingPhone);
        toast.success("Phone verified");
        await continueAfterPhone(next);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        const message =
          error instanceof Error ? error.message : "Invalid verification code";
        setOtpError(message);
        toast.error(message);
      }
    });
  };

  const onVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setOtpError(null);
    startTransition(async () => {
      try {
        await verifyEmailLink(pendingEmail, otpCode.trim());
        setLinkedEmail(pendingEmail);
        toast.success("Email verified");
        await finishOnboarding({
          ...draft,
          email: pendingEmail,
        });
      } catch (error) {
        if (isRedirectError(error)) throw error;
        const message =
          error instanceof Error ? error.message : "Invalid verification code";
        setOtpError(message);
        toast.error(message);
      }
    });
  };

  if (step === "verify-phone" || step === "verify-email") {
    const isPhone = step === "verify-phone";
    const destination = isPhone ? pendingPhone : pendingEmail;

    return (
      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={isPhone ? onVerifyPhone : onVerifyEmail}
            className="space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-lg font-medium">
                {isPhone ? "Verify phone number" : "Verify email"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter the code sent to{" "}
                <span className="font-medium text-foreground">
                  {destination}
                </span>
                {isPhone && phoneChannels?.whatsapp
                  ? " via SMS and WhatsApp"
                  : isPhone
                    ? " via SMS"
                    : ""}
                . This links it to your account so you can sign in with either
                method.
              </p>
              {devCode ? (
                <p className="text-xs rounded-lg bg-secondary/40 px-3 py-2">
                  Dev OTP: <strong>{devCode}</strong>
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="onboarding-otp" className="text-sm font-medium">
                Verification code
              </label>
              <Input
                id="onboarding-otp"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                className="tracking-[0.3em] text-center text-lg font-medium"
              />
              {otpError ? (
                <p className="text-sm text-destructive">{otpError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3">
              <LoadingButton
                type="submit"
                className="w-full"
                loading={isPending}
                loadingText="Verifying..."
              >
                {isPhone ? "Verify phone" : "Verify email"}
              </LoadingButton>
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => {
                  setStep("details");
                  setOtpCode("");
                  setOtpError(null);
                  setDevCode(null);
                }}
              >
                Back
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmitDetails)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {emailVerified && emailsEqual(field.value, defaultEmail)
                      ? "Already verified from sign-in"
                      : "We'll send a one-time code to verify this email"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <PhoneWithCountryInput
                      label="Phone Number"
                      value={field.value}
                      countryCode={countryCode}
                      onCountryChange={setCountryCode}
                      onChange={(e164) => field.onChange(e164)}
                      required
                    />
                  </FormControl>
                  <FormDescription>
                    {phoneVerified && phonesEqual(field.value, defaultPhone)
                      ? "Already verified from sign-in"
                      : "We'll send a one-time code to verify this number"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <LoadingButton
              type="submit"
              className="w-full"
              loading={isPending}
              loadingText="Continuing..."
            >
              Continue
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
