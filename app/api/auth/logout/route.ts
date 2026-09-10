import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { clearAuthCookies } from "@/lib/api/cookies";
import { getRefreshToken } from "@/lib/api/session";

export async function POST() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: { refreshToken },
      });
    } catch {
      // ignore
    }
  }
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
