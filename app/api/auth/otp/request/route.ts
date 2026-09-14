import { NextResponse } from "next/server";
import { ApiError, apiFetch } from "@/lib/api/client";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const data = await apiFetch<{
      ok?: boolean;
      phone?: string;
      expiresIn?: number;
      devCode?: string;
    }>("/auth/otp/request", { method: "POST", body });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OTP request failed";
    const status = err instanceof ApiError ? err.status : 400;
    return NextResponse.json({ message }, { status });
  }
}
