import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { setAuthCookies } from "@/lib/api/cookies";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string | null;
    email: string | null;
    name: string | null;
    roles: string[];
    onboardingComplete: boolean;
  } | null;
  isNew?: boolean;
};

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const data = await apiFetch<AuthResponse>("/auth/otp/verify", {
      method: "POST",
      body,
    });
    const res = NextResponse.json({
      user: data.user,
      isNew: data.isNew ?? false,
    });
    setAuthCookies(res, data);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "OTP verify failed";
    return NextResponse.json({ message }, { status: 401 });
  }
}
