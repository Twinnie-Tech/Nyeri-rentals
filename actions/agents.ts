"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import {
  getAccessToken,
  getSessionUser,
  hasActiveAgentPlan,
} from "@/lib/api/session";
import { sanityFetch } from "@/lib/sanity/live";
import { AGENT_BY_USER_ID_QUERY } from "@/lib/sanity/queries";
import type { AgentOnboardingData, AgentProfileData } from "@/types";

export async function createAgentDocument() {
  const user = await getSessionUser();
  const accessToken = await getAccessToken();
  if (!user || !accessToken) throw new Error("Not authenticated");
  if (!hasActiveAgentPlan(user)) {
    throw new Error("User does not have agent plan");
  }

  const agent = await apiFetch<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    onboardingComplete: boolean;
    sanityId: string | null;
  }>("/agents/ensure", { method: "POST", accessToken });

  return {
    _id: agent.sanityId,
    userId: user.id,
    name: agent.name,
    email: agent.email,
    phone: agent.phone,
    onboardingComplete: agent.onboardingComplete,
  };
}

export async function completeAgentOnboarding(data: AgentOnboardingData) {
  const user = await getSessionUser();
  const accessToken = await getAccessToken();
  if (!user || !accessToken) throw new Error("Not authenticated");

  await apiFetch("/agents/onboarding", {
    method: "POST",
    accessToken,
    body: {
      name: user.name || "Agent",
      email: user.email || `${user.phone}@agents.greenkey.local`,
      phone: data.phone,
      bio: data.bio,
      licenseNumber: data.licenseNumber,
      agency: data.agency,
    },
  });

  redirect("/dashboard");
}

export async function updateAgentProfile(data: AgentProfileData) {
  const user = await getSessionUser();
  const accessToken = await getAccessToken();
  if (!user || !accessToken) throw new Error("Not authenticated");

  await apiFetch("/agents/me", {
    method: "PATCH",
    accessToken,
    body: {
      phone: data.phone,
      bio: data.bio,
      licenseNumber: data.licenseNumber,
      agency: data.agency,
    },
  });
}

export async function getAgentByUserId(userId: string) {
  const { data: agent } = await sanityFetch({
    query: AGENT_BY_USER_ID_QUERY,
    params: { userId },
  });
  return agent;
}
