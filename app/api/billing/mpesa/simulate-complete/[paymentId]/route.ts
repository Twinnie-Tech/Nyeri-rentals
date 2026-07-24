import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/session";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ paymentId: string }> },
) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }
  const { paymentId } = await ctx.params;
  try {
    const data = await apiFetch(
      `/billing/mpesa/simulate-complete/${paymentId}`,
      { method: "POST", accessToken },
    );
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Simulate failed";
    return NextResponse.json({ message }, { status: 400 });
  }
}
