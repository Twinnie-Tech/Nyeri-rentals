// Debug: which Nest base URL this Next process is using
import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api/client";

export async function GET() {
  return NextResponse.json({
    API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? null,
    API_URL_env: process.env.API_URL ?? null,
  });
}
