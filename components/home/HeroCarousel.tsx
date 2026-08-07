"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/property-categories";
import { cn } from "@/lib/utils";

export const HERO_SLIDES = [
  {
    id: "villa",
    title: "Luxury villas from above",
    subtitle: "Spacious living with highland views across Nyeri County",
    href: "/properties?type=villa",
    cta: "Browse villas",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2400&q=80",
    alt: "Aerial view of a luxury villa with pool",
  },
  {
    id: "airbnb",
    title: "Airbnb & short stays",
    subtitle: "Guest-ready homes for visitors exploring Nyeri",
    href: "/properties?category=airbnb",
    cta: "Find a stay",
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=2400&q=80",
    alt: "Bright short-stay apartment interior",
  },
  {
    id: "rent",
    title: "Homes for rent",
    subtitle: "Apartments and houses for monthly living",
    href: "/properties?category=rent",
    cta: "Browse rentals",
    image:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=2400&q=80",
    alt: "Aerial view of apartment buildings",
  },
  {
    id: "sale",
    title: "Homes for sale",
    subtitle: "Buy a house, apartment, or townhouse in Nyeri",
    href: "/properties?category=sale",
    cta: "Browse for sale",
    image:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=2400&q=80",
    alt: "Beautiful home exterior for sale",
  },
  {
    id: "apartment",
    title: "Rental apartments",
    subtitle: "Modern flats for students and professionals",
    href: "/properties?type=apartment&category=rent",
    cta: "See apartments",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2400&q=80",
    alt: "Drone view of apartment complex",
  },
  {
    id: "plot",
    title: "Plots of land",
    subtitle: "1/4, 1/2, and acre plots for homes or commerce",
    href: "/properties?type=land",
    cta: "Browse plots",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2400&q=80",
    alt: "Aerial view of open land plots",
  },
  {
    id: "farm",
    title: "Farming land",
    subtitle: "Agricultural acreage in Nyeri’s farming heartland",
    href: "/properties?type=farmland&landPurpose=agricultural",
    cta: "Browse farmland",
    image:
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=2400&q=80",
    alt: "Drone view of green farmland fields",
  },
] as const;

const SLIDE_MS = 5500;

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_SLIDES.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const goTo = (next: number) => {
    setIndex((next + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const slide = HERO_SLIDES[index];

  return (
    <section
      className="relative min-h-[88vh] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured property categories"
    >
      {HERO_SLIDES.map((item, i) => (
        <div
          key={item.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 ease-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={i !== index}
        >
          <Image
            src={item.image}
            alt={item.alt}
            fill
            priority={i === 0}
            sizes="100vw"
            className={cn(
              "object-cover scale-105 transition-transform duration-[8000ms] ease-out",
              i === index && "scale-100",
            )}
          />
        </div>
      ))}

      <div
        className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/45 to-foreground/25"
        aria-hidden="true"
      />

      <div className="container relative z-10 flex min-h-[88vh] flex-col justify-end pb-16 pt-32 md:pb-24">
        <div className="max-w-2xl">
          <p className="text-secondary font-heading text-2xl md:text-3xl tracking-tight mb-3">
            {BRAND_NAME}
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-white/70 mb-3">
            {index + 1} / {HERO_SLIDES.length} · {slide.id}
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-semibold text-white tracking-tight mb-4 transition-opacity duration-500">
            {slide.title}
          </h1>
          <p className="text-lg text-white/85 mb-8 max-w-xl">
            {slide.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <Button
              asChild
              size="xl"
              className="h-14 bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <Link href={slide.href}>
                {slide.cta}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="h-14 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link href="/properties">Browse all listings</Link>
            </Button>
          </div>

          <form
            action="/properties"
            method="GET"
            className="flex flex-col sm:flex-row gap-3 max-w-xl"
          >
            <label htmlFor="city-search" className="sr-only">
              Search by town or neighborhood
            </label>
            <input
              id="city-search"
              name="city"
              placeholder="Town or neighborhood…"
              autoComplete="address-level2"
              className="h-14 flex-1 rounded-md border-0 bg-background px-4 text-base text-foreground shadow-warm-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="xl" className="h-14">
              Search
            </Button>
          </form>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4">
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Slides"
          >
            {HERO_SLIDES.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Show ${item.title}`}
                onClick={() => goTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i === index
                    ? "w-10 bg-secondary"
                    : "w-4 bg-white/40 hover:bg-white/70",
                )}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={() => goTo(index - 1)}
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={() => goTo(index + 1)}
              aria-label="Next slide"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
