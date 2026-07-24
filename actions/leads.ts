"use server";

import { apiFetch } from "@/lib/api/client";
import { getAccessToken, getSessionUser } from "@/lib/api/session";
import { client } from "@/lib/sanity/client";
import { sanityFetch } from "@/lib/sanity/live";
import {
  AGENT_ID_BY_USER_QUERY,
  LEAD_AGENT_REF_QUERY,
  LEAD_EXISTS_QUERY,
} from "@/lib/sanity/queries";

export async function createLead(
  propertyId: string,
  agentId: string,
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

  const { data: existingLead } = await sanityFetch({
    query: LEAD_EXISTS_QUERY,
    params: { propertyId, email: user.email || user.phone },
  });

  if (existingLead) {
    return { success: true, message: "You have already contacted this agent." };
  }

  await client.create({
    _type: "lead",
    property: { _type: "reference", _ref: propertyId },
    agent: { _type: "reference", _ref: agentId },
    buyerName: user.name,
    buyerEmail: user.email || "",
    buyerPhone: user.phone,
    status: "new",
    createdAt: new Date().toISOString(),
  });

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
  }).catch(() => null);

  return { success: true };
}

export async function updateLeadStatus(
  leadId: string,
  status: "new" | "contacted" | "closed",
) {
  const user = await getSessionUser();
  const accessToken = await getAccessToken();
  if (!user || !accessToken) throw new Error("Not authenticated");

  const { data: agent } = await sanityFetch({
    query: AGENT_ID_BY_USER_QUERY,
    params: { userId: user.id },
  });

  if (!agent) throw new Error("Agent not found");

  const { data: lead } = await sanityFetch({
    query: LEAD_AGENT_REF_QUERY,
    params: { leadId },
  });

  if (!lead || lead.agent._ref !== agent._id) {
    throw new Error("Unauthorized");
  }

  await client.patch(leadId).set({ status }).commit();

  const statusMap = {
    new: "new",
    contacted: "contacted",
    closed: "closed",
  } as const;

  await apiFetch(`/leads/${leadId}/status`, {
    method: "PATCH",
    accessToken,
    body: { status: statusMap[status] },
  }).catch(() => null);
}
