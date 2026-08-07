import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/session";

export async function POST(req: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }
  const body = await req.json();
  try {
    const data = await apiFetch("/billing/bank", {
      method: "POST",
      body,
      accessToken,
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bank submit failed";
    return NextResponse.json({ message }, { status: 400 });
  }
}
