"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  requestEmailVerification,
  requestPhoneVerification,
  updateUserProfile,
  verifyEmailLink,
  verifyPhoneLink,
} from "@/actions/users";
import { PhoneWithCountryInput } from "@/components/auth/PhoneWithCountryInput";
import { Button } from "@/components/ui/button";
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
import type { User } from "@/types";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  phone: z.string().min(1, "Phone number is required"),
});

type FormData = z.infer<typeof formSchema>;
type Step = "profile" | "verify-phone" | "verify-email";

interface ProfileFormProps {
  user: User;
}

function phonesEqual(a?: string | null, b?: string | null) {
  const norm = (v?: string | null) => (v || "").replace(/\D/g, "");
  return norm(a) === norm(b) && Boolean(norm(a));
}

function emailsEqual(a?: string | null, b?: string | null) {
  return (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [countryCode, setCountryCode] = useState<AuthCountryCode>("KE");
  const [step, setStep] = useState<Step>("profile");
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

  const phoneVerified = Boolean(user.phoneVerifiedAt && user.phone);
  const emailVerified = Boolean(user.emailVerifiedAt && user.email);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name,
      email: user.email || "",
      phone: user.phone || "",
    },
  });

  function needsPhoneVerify(phone: string) {
    const unchanged = phonesEqual(phone, user.phone);
    return !unchanged || !phoneVerified;
  }

  function needsEmailVerify(email: string) {
    const unchanged = emailsEqual(email, user.email);
    return !unchanged || !emailVerified;
  }

  async function startPhoneVerify(phone: string) {
    const sent = await requestPhoneVerification(phone);
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

  async function startEmailVerify(email: string) {
    const sent = await requestEmailVerification(email.trim());
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
      await startEmailVerify(data.email);
      return;
    }
    toast.success("Profile updated successfully");
    router.refresh();
    setStep("profile");
  }

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      try {
        await updateUserProfile({
          name: data.name,
          email: data.email,
          phone: data.phone,
        });
        setDraft(data);

        if (needsPhoneVerify(data.phone)) {
          await startPhoneVerify(data.phone);
          return;
        }
        await continueAfterPhone(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update profile";
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
        form.setValue("phone", pendingPhone);
        toast.success("Phone number verified");
        await continueAfterPhone({ ...draft, phone: pendingPhone });
      } catch (error) {
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
        form.setValue("email", pendingEmail);
        toast.success("Email verified");
        setStep("profile");
        setDevCode(null);
        router.refresh();
      } catch (error) {
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
      <form
        onSubmit={isPhone ? onVerifyPhone : onVerifyEmail}
        className="space-y-6"
      >
        <div className="space-y-2">
          <h3 className="text-lg font-medium">
            {isPhone ? "Verify phone number" : "Verify email"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Enter the code sent to{" "}
            <span className="font-medium text-foreground">{destination}</span>
            {isPhone && phoneChannels?.whatsapp
              ? " via SMS and WhatsApp"
              : isPhone
                ? " via SMS"
                : ""}
            . This links it so you can sign in with the same account.
          </p>
          {devCode ? (
            <p className="text-xs rounded-lg bg-secondary/40 px-3 py-2">
              Dev OTP: <strong>{devCode}</strong>
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="profile-otp" className="text-sm font-medium">
            Verification code
          </label>
          <Input
            id="profile-otp"
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

        <div className="flex flex-col gap-3 sm:flex-row">
          <LoadingButton
            type="submit"
            loading={isPending}
            loadingText="Verifying..."
            className="sm:flex-1"
          >
            {isPhone ? "Verify & link phone" : "Verify & link email"}
          </LoadingButton>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              setStep("profile");
              setOtpCode("");
              setOtpError(null);
              setDevCode(null);
            }}
          >
            Back
          </Button>
        </div>
      </form>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input {...field} />
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
                {emailVerified && emailsEqual(field.value, user.email) ? (
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Verified — email sign-in uses this account
                  </span>
                ) : (
                  "Changing or adding an email sends a one-time code to verify it."
                )}
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
                {phoneVerified && phonesEqual(field.value, user.phone) ? (
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Verified — phone sign-in uses this account
                  </span>
                ) : (
                  "Changing or adding a number sends a one-time code to verify it."
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <LoadingButton
          type="submit"
          loading={isPending}
          loadingText="Saving..."
        >
          Save Changes
        </LoadingButton>
      </form>
    </Form>
  );
}
