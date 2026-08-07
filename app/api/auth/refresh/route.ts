import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { REFRESH_COOKIE } from "@/lib/api/constants";
import { clearAuthCookies, setAuthCookies } from "@/lib/api/cookies";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: unknown;
};

export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    const res = NextResponse.json(
      { message: "No refresh token" },
      { status: 401 },
    );
    clearAuthCookies(res);
    return res;
  }

  try {
    const data = await apiFetch<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
    const res = NextResponse.json({ user: data.user });
    setAuthCookies(res, data);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    const res = NextResponse.json({ message }, { status: 401 });
    clearAuthCookies(res);
    return res;
  }
}
