import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";

export async function GET() {
  try {
    const plan = await apiFetch("/billing/plan");
    return NextResponse.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
