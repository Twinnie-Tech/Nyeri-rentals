import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE } from "@/lib/api/constants";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  "http://localhost:4000/v1";

type MeResponse = {
  id: string;
  onboardingComplete: boolean;
  roles: string[];
  agent?: { onboardingComplete: boolean } | null;
  subscription?: {
    status: string;
    currentPeriodEnd: string | null;
  } | null;
};

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return (
    pathname.startsWith("/properties") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/api/")
  );
}

function hasActivePlan(user: MeResponse) {
  if (user.roles?.includes("ADMIN")) return true;
  const sub = user.subscription;
  if (!sub || sub.status !== "ACTIVE") return false;
  if (!sub.currentPeriodEnd) return true;
  return new Date(sub.currentPeriodEnd) > new Date();
}

async function fetchMe(accessToken: string): Promise<MeResponse | null> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as MeResponse;
  } catch {
    return null;
  }
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!access) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signIn);
  }

  const user = await fetchMe(access);
  if (!user) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signIn);
  }

  const isOnboarding = pathname.startsWith("/onboarding");
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/saved") ||
    pathname.startsWith("/profile");

  if (isProtected && !user.onboardingComplete) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (isOnboarding && user.onboardingComplete) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/dashboard")) {
    if (!hasActivePlan(user)) {
      return NextResponse.redirect(new URL("/pricing", req.url));
    }
    if (
      !user.agent?.onboardingComplete &&
      !pathname.startsWith("/dashboard/onboarding")
    ) {
      return NextResponse.redirect(new URL("/dashboard/onboarding", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
