"use client";

import { Home, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Footer() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Thanks for subscribing!");
    setEmail("");
    setIsSubmitting(false);
  };

  return (
    <footer className="border-t border-border/60 bg-foreground text-background">
      <div className="container py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5 lg:gap-8">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2.5 mb-4 w-fit transition-opacity duration-200 hover:opacity-80"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                <Home
                  className="h-4 w-4 text-secondary-foreground"
                  aria-hidden="true"
                />
              </div>
              <span className="text-xl font-semibold font-heading tracking-tight">
                GreenKey Realty
              </span>
            </Link>
            <p className="text-background/65 max-w-sm mb-6 text-sm leading-relaxed">
              Helping people find homes across Nyeri County — and helping agents
              put the right listings in front of ready renters.
            </p>

            <div className="max-w-sm">
              <h3 className="font-heading font-semibold mb-3 text-sm">
                New listings in your inbox
              </h3>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <div className="flex-1">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <Input
                    id="newsletter-email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email…"
                    autoComplete="email"
                    required
                    className="h-11 bg-background/10 border-background/20 text-background placeholder:text-background/45"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 px-4 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  {isSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">Subscribe</span>
                </Button>
              </form>
            </div>
          </div>

          <nav aria-label="Browse properties">
            <h3 className="font-heading font-semibold mb-4 text-sm">Browse</h3>
            <ul className="space-y-3 text-sm text-background/65">
              <li>
                <Link href="/properties" className="hover:text-background">
                  All listings
                </Link>
              </li>
              <li>
                <Link
                  href="/properties?category=rent"
                  className="hover:text-background"
                >
                  For rent
                </Link>
              </li>
              <li>
                <Link
                  href="/properties?category=sale"
                  className="hover:text-background"
                >
                  For sale
                </Link>
              </li>
              <li>
                <Link
                  href="/properties?category=airbnb"
                  className="hover:text-background"
                >
                  Airbnb stays
                </Link>
              </li>
              <li>
                <Link
                  href="/properties?type=villa"
                  className="hover:text-background"
                >
                  Villas
                </Link>
              </li>
              <li>
                <Link
                  href="/properties?type=land"
                  className="hover:text-background"
                >
                  Plots & land
                </Link>
              </li>
              <li>
                <Link
                  href="/properties?type=farmland"
                  className="hover:text-background"
                >
                  Farmland
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Agent resources">
            <h3 className="font-heading font-semibold mb-4 text-sm">
              For agents
            </h3>
            <ul className="space-y-3 text-sm text-background/65">
              <li>
                <Link href="/pricing" className="hover:text-background">
                  Become an agent
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-background">
                  Agent dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/listings/new"
                  className="hover:text-background"
                >
                  Upload a listing
                </Link>
              </li>
              <li>
                <Link href="/dashboard/leads" className="hover:text-background">
                  Lead inbox
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Account">
            <h3 className="font-heading font-semibold mb-4 text-sm">Account</h3>
            <ul className="space-y-3 text-sm text-background/65">
              <li>
                <Link href="/saved" className="hover:text-background">
                  Saved homes
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-background">
                  My profile
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="hover:text-background">
                  Sign in
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-background/15 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-background/50">
          <p suppressHydrationWarning>
            © {new Date().getFullYear()} GreenKey Realty
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-background">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-background">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
