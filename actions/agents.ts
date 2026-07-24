"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { getAccessToken, getSessionUser, hasActiveAgentPlan } from "@/lib/api/session";
import { client } from "@/lib/sanity/client";
import { sanityFetch } from "@/lib/sanity/live";
import {
  AGENT_BY_USER_ID_QUERY,
  AGENT_ID_BY_USER_QUERY,
} from "@/lib/sanity/queries";
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

  const { data: existingSanity } = await sanityFetch({
    query: AGENT_ID_BY_USER_QUERY,
    params: { userId: user.id },
  });

  if (existingSanity) {
    return existingSanity;
  }

  const sanityAgent = await client.create({
    _type: "agent",
    userId: user.id,
    name: agent.name,
    email: agent.email,
    phone: agent.phone || "",
    onboardingComplete: false,
    createdAt: new Date().toISOString(),
  });

  return sanityAgent;
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

  const { data: agent } = await sanityFetch({
    query: AGENT_ID_BY_USER_QUERY,
    params: { userId: user.id },
  });

  if (agent) {
    await client
      .patch(agent._id)
      .set({
        bio: data.bio,
        phone: data.phone,
        licenseNumber: data.licenseNumber,
        agency: data.agency || "",
        onboardingComplete: true,
      })
      .commit();
  }

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

  const { data: agent } = await sanityFetch({
    query: AGENT_ID_BY_USER_QUERY,
    params: { userId: user.id },
  });

  if (!agent) throw new Error("Agent not found");

  await client
    .patch(agent._id)
    .set({
      bio: data.bio,
      phone: data.phone,
      licenseNumber: data.licenseNumber,
      agency: data.agency || "",
    })
    .commit();
}

export async function getAgentByUserId(userId: string) {
  const { data: agent } = await sanityFetch({
    query: AGENT_BY_USER_ID_QUERY,
    params: { userId },
  });
  return agent;
}
