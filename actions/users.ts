"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { getAccessToken, getSessionUser } from "@/lib/api/session";
import type { UserOnboardingData, UserProfileData } from "@/types";

export async function completeUserOnboarding(data: UserOnboardingData) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  try {
    await apiFetch("/users/onboarding", {
      method: "POST",
      accessToken,
      body: {
        name: data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to complete onboarding";
    throw new Error(message);
  }

  redirect("/");
}

export async function updateUserProfile(data: UserProfileData) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  try {
    await apiFetch("/users/me", {
      method: "PATCH",
      accessToken,
      body: {
        name: data.name,
        // Phone/email are linked via verification endpoints
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update profile";
    throw new Error(message);
  }
}

export type PhoneVerificationRequestResult = {
  ok: boolean;
  phone: string;
  expiresIn: number;
  delivery: "preview" | "sent";
  channels?: { sms?: boolean; whatsapp?: boolean };
  devCode?: string;
};

export type EmailVerificationRequestResult = {
  ok: boolean;
  email: string;
  expiresIn: number;
  delivery: "preview" | "sent";
  devCode?: string;
};

export async function requestPhoneVerification(
  phone: string,
): Promise<PhoneVerificationRequestResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  try {
    return await apiFetch<PhoneVerificationRequestResult>(
      "/users/me/phone/request-verification",
      {
        method: "POST",
        accessToken,
        body: { phone },
      },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send verification code";
    throw new Error(message);
  }
}

export async function verifyPhoneLink(phone: string, code: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  try {
    return await apiFetch("/users/me/phone/verify", {
      method: "POST",
      accessToken,
      body: { phone, code },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to verify phone number";
    throw new Error(message);
  }
}

export async function requestEmailVerification(
  email: string,
): Promise<EmailVerificationRequestResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  try {
    return await apiFetch<EmailVerificationRequestResult>(
      "/users/me/email/request-verification",
      {
        method: "POST",
        accessToken,
        body: { email },
      },
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to send email verification code";
    throw new Error(message);
  }
}

export async function verifyEmailLink(email: string, code: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  try {
    return await apiFetch("/users/me/email/verify", {
      method: "POST",
      accessToken,
      body: { email, code },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to verify email";
    throw new Error(message);
  }
}

export async function toggleSavedListing(
  propertyId: string,
): Promise<{ success: boolean; requiresOnboarding?: boolean }> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  if (!user.onboardingComplete) {
    return { success: false, requiresOnboarding: true };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  const saved = await apiFetch<{
    items: Array<{ property: { id: string; sanityId: string } }>;
  }>("/users/me/saved?limit=100", { accessToken });

  const isSaved = saved.items.some(
    (s) => s.property.sanityId === propertyId || s.property.id === propertyId,
  );

  if (isSaved) {
    await apiFetch(`/users/me/saved/${propertyId}`, {
      method: "DELETE",
      accessToken,
    });
  } else {
    await apiFetch(`/users/me/saved/${propertyId}`, {
      method: "POST",
      accessToken,
    });
  }

  return { success: true };
}

export async function getUserSavedIds(): Promise<string[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const saved = await apiFetch<{
      items: Array<{ property: { id: string; sanityId: string } }>;
    }>("/users/me/saved?limit=100", { accessToken });
    return saved.items.map((s) => s.property.sanityId || s.property.id);
  } catch {
    return [];
  }
}

export async function isPropertySaved(propertyId: string): Promise<boolean> {
  const savedIds = await getUserSavedIds();
  return savedIds.includes(propertyId);
}
