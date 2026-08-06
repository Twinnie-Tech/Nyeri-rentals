import { cookies } from "next/headers";
import { apiFetch } from "./client";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./constants";

export { ACCESS_COOKIE, REFRESH_COOKIE };

export type SessionUser = {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  roles: string[];
  onboardingComplete: boolean;
  phoneVerifiedAt?: string | null;
  emailVerifiedAt?: string | null;
  agent?: {
    id: string;
    onboardingComplete: boolean;
  } | null;
  subscription?: {
    status: string;
    currentPeriodEnd: string | null;
    planCode: string;
  } | null;
};

export async function getAccessToken() {
  const jar = await cookies();
  return jar.get(ACCESS_COOKIE)?.value || null;
}

export async function getRefreshToken() {
  const jar = await cookies();
  return jar.get(REFRESH_COOKIE)?.value || null;
}

/**
 * Session for RSC / server actions.
 * Access-token refresh with cookie rotation is handled in `proxy.ts`
 * (and `POST /api/auth/refresh`) so Nest token rotation stays in sync
 * with httpOnly cookies.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const access = await getAccessToken();
  if (!access) return null;
  try {
    return await apiFetch<SessionUser>("/auth/me", { accessToken: access });
  } catch {
    return null;
  }
}

export function hasActiveAgentPlan(user: SessionUser | null) {
  if (!user) return false;
  if (user.roles?.includes("ADMIN")) return true;
  const sub = user.subscription;
  if (!sub || sub.status !== "ACTIVE") return false;
  if (!sub.currentPeriodEnd) return true;
  return new Date(sub.currentPeriodEnd) > new Date();
}
