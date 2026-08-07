import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/session";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json();

  try {
    const data = await apiFetch(`/admin/payments/${id}/verify`, {
      method: "POST",
      accessToken,
      body,
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ message }, { status: 400 });
  }
}
