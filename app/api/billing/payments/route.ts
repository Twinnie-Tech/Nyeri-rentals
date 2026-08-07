import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { getAccessToken } from "@/lib/api/session";
import type { InvoicePayment } from "@/lib/billing/invoices";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const payments = await apiFetch<InvoicePayment[]>("/billing/payments", {
      accessToken,
    });
    return NextResponse.json(payments);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load payments";
    return NextResponse.json({ message }, { status: 400 });
  }
}
