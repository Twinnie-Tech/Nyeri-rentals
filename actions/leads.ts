"use server";

import { apiFetch } from "@/lib/api/client";
import { getAccessToken, getSessionUser } from "@/lib/api/session";

export async function createLead(
  propertyId: string,
  _agentId: string,
): Promise<{
  success: boolean;
  requiresOnboarding?: boolean;
  message?: string;
}> {
  const user = await getSessionUser();
  const accessToken = await getAccessToken();

  if (!user || !accessToken) {
    throw new Error("Not authenticated");
  }

  if (!user.onboardingComplete) {
    return { success: false, requiresOnboarding: true };
  }

  if (!user.name || !user.phone) {
    return { success: false, requiresOnboarding: true };
  }

  try {
    await apiFetch("/leads", {
      method: "POST",
      accessToken,
      body: {
        propertyId,
        name: user.name,
        email: user.email || undefined,
        phone: user.phone,
        message: "Interested in this property",
      },
    });
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create lead";
    if (message.toLowerCase().includes("already")) {
      return { success: true, message: "You have already contacted this agent." };
    }
    throw error;
  }
}

export async function updateLeadStatus(
  leadId: string,
  status: "new" | "contacted" | "closed",
) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  await apiFetch(`/leads/${encodeURIComponent(leadId)}/status`, {
    method: "PATCH",
    accessToken,
    body: { status },
  });
}
