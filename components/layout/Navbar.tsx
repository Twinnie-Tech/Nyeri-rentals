"use client";

import { Heart, Home, LayoutDashboard, LogOut, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavUser = {
  id: string;
  name: string | null;
  roles: string[];
  subscription?: { status: string; currentPeriodEnd: string | null } | null;
};

function hasAgentAccess(user: NavUser | null) {
  if (!user) return false;
  if (user.roles?.includes("ADMIN")) return true;
  const sub = user.subscription;
  if (!sub || sub.status !== "ACTIVE") return false;
  if (!sub.currentPeriodEnd) return true;
  return new Date(sub.currentPeriodEnd) > new Date();
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<NavUser | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        return data.user as NavUser;
      })
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const signedIn = Boolean(user);
  const agentAccess = hasAgentAccess(user);
  const isPricingPage = pathname === "/pricing";

  return (
    <header
      className={
        isPricingPage
          ? "w-full border-b border-border/50 bg-background"
          : "sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      }
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-80"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
              <Home
                className="h-4 w-4 text-primary-foreground"
                aria-hidden="true"
              />
            </div>
            <span className="text-lg font-semibold font-heading tracking-tight">
              GreenKey Realty
            </span>
          </Link>

          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="Main navigation"
          >
            <Link
              href="/properties"
              className="px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:text-foreground hover:bg-accent transition-[color,background-color] duration-200"
            >
              Browse Properties
            </Link>
            {signedIn && agentAccess ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:text-foreground hover:bg-accent transition-[color,background-color] duration-200"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:text-foreground hover:bg-accent transition-[color,background-color] duration-200"
              >
                Become an Agent
              </Link>
            )}
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {signedIn ? (
            <>
              <Link
                href="/saved"
                aria-label="Saved properties"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-[color,background-color] duration-200"
              >
                <Heart className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/profile"
                aria-label="My profile"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-[color,background-color] duration-200"
              >
                <User className="h-5 w-5" aria-hidden="true" />
              </Link>
              {agentAccess ? (
                <Link
                  href="/dashboard"
                  aria-label="Agent dashboard"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-[color,background-color] duration-200"
                >
                  <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                </Link>
              ) : null}
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-1" aria-hidden="true" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/sign-in">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          {isMounted ? (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={isOpen ? "Close menu" : "Open menu"}
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <X className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] sm:w-[350px] overscroll-contain"
              >
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                      <Home
                        className="h-4 w-4 text-primary-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="font-heading">GreenKey Realty</span>
                  </SheetTitle>
                </SheetHeader>
                <nav
                  className="flex flex-col gap-2 mt-8"
                  aria-label="Mobile navigation"
                >
                  <Link
                    href="/properties"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg hover:bg-accent transition-[background-color] duration-200"
                  >
                    Browse Rentals
                  </Link>
                  {signedIn && agentAccess ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg hover:bg-accent transition-[background-color] duration-200"
                    >
                      <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                      Agent Dashboard
                    </Link>
                  ) : (
                    <Link
                      href="/pricing"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg hover:bg-accent transition-[background-color] duration-200"
                    >
                      Become an Agent
                    </Link>
                  )}
                  {signedIn ? (
                    <>
                      <div className="h-px bg-border my-2" />
                      <Link
                        href="/saved"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg hover:bg-accent transition-[background-color] duration-200"
                      >
                        <Heart className="h-5 w-5" aria-hidden="true" />
                        Saved Properties
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg hover:bg-accent transition-[background-color] duration-200"
                      >
                        <User className="h-5 w-5" aria-hidden="true" />
                        My Profile
                      </Link>
                      <Button
                        variant="outline"
                        className="mx-4 mt-2"
                        onClick={() => {
                          setIsOpen(false);
                          logout();
                        }}
                      >
                        Sign out
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="h-px bg-border my-2" />
                      <div className="flex flex-col gap-2 px-4 mt-2">
                        <Button variant="outline" className="w-full" asChild>
                          <Link href="/sign-in" onClick={() => setIsOpen(false)}>
                            Sign In
                          </Link>
                        </Button>
                        <Button className="w-full" asChild>
                          <Link href="/sign-in" onClick={() => setIsOpen(false)}>
                            Get Started
                          </Link>
                        </Button>
                      </div>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          ) : (
            <Button variant="ghost" size="icon" aria-label="Open menu" disabled>
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
