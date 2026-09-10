import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/api/constants";

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

type TokenPair = {
  accessToken: string;
  refreshToken: string;
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

function applyAuthCookies(res: NextResponse, tokens: TokenPair) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });
  res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
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

async function refreshTokens(refreshToken: string): Promise<TokenPair | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TokenPair;
    if (!data.accessToken || !data.refreshToken) return null;
    return data;
  } catch {
    return null;
  }
}

function redirectSignIn(req: NextRequest) {
  const signIn = new URL("/sign-in", req.url);
  signIn.searchParams.set("redirect_url", req.url);
  return NextResponse.redirect(signIn);
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  let access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  let rotated: TokenPair | null = null;

  if (!access && !refresh) {
    return redirectSignIn(req);
  }

  let user = access ? await fetchMe(access) : null;

  if (!user && refresh) {
    rotated = await refreshTokens(refresh);
    if (rotated) {
      access = rotated.accessToken;
      user = await fetchMe(access);
    }
  }

  if (!user) {
    return redirectSignIn(req);
  }

  const isOnboarding = pathname.startsWith("/onboarding");
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/saved") ||
    pathname.startsWith("/profile");

  let response = NextResponse.next();

  if (isProtected && !user.onboardingComplete) {
    response = NextResponse.redirect(new URL("/onboarding", req.url));
  } else if (isOnboarding && user.onboardingComplete) {
    response = NextResponse.redirect(new URL("/", req.url));
  } else if (pathname.startsWith("/dashboard")) {
    const isAdmin = user.roles?.includes("ADMIN");
    if (!hasActivePlan(user)) {
      response = NextResponse.redirect(new URL("/pricing", req.url));
    } else if (
      !isAdmin &&
      !user.agent?.onboardingComplete &&
      !pathname.startsWith("/dashboard/onboarding")
    ) {
      response = NextResponse.redirect(
        new URL("/dashboard/onboarding", req.url),
      );
    }
  }

  if (rotated) {
    applyAuthCookies(response, rotated);
  }

  return response;
}

export const config = {
  // Do not run proxy on /api — Next 16 + Turbopack can 404 Route Handlers
  // when proxy matches them (see vercel/next.js#92921). Auth cookies are
  // still set by Route Handlers; proxy only gates pages.
  matcher: [
    "/((?!_next|api|trpc|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
