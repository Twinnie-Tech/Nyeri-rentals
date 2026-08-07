import {
  ArrowRight,
  Building2,
  Fence,
  Heart,
  Home,
  MapPin,
  Shield,
  Sprout,
  Trees,
  Upload,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { CategoryEmptyState } from "@/components/home/CategoryEmptyState";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { PropertyGrid } from "@/components/property/PropertyGrid";
import { Button } from "@/components/ui/button";
import { PROPERTY_TYPES } from "@/lib/property-categories";
import { sanityFetch } from "@/lib/sanity/live";
import {
  FEATURED_PROPERTIES_QUERY,
  PROPERTIES_BY_CATEGORY_QUERY,
} from "@/lib/sanity/queries";
import type { Property } from "@/types";

const MARKET_CATEGORIES = [
  {
    title: "Homes for rent",
    description: "Monthly rentals for families, students, and professionals",
    href: "/properties?category=rent",
    icon: Home,
  },
  {
    title: "Homes for sale",
    description: "Buy a house, apartment, or townhouse in Nyeri",
    href: "/properties?category=sale",
    icon: Building2,
  },
  {
    title: "Airbnb stays",
    description: "Short stays and guest houses for visitors",
    href: "/properties?category=airbnb",
    icon: Warehouse,
  },
  {
    title: "Luxury villas",
    description: "Featured high-end villas across Nyeri County",
    href: "/properties?type=villa",
    icon: Trees,
  },
  {
    title: "Plots & land",
    description: "1/4, 1/2, and acre plots for residential or commercial use",
    href: "/properties?type=land",
    icon: Fence,
  },
  {
    title: "Farmland",
    description: "Agricultural land in Nyeri’s farming heartland",
    href: "/properties?type=farmland&landPurpose=agricultural",
    icon: Sprout,
  },
];

const NEIGHBORHOODS = [
  { name: "Nyeri Town", query: "Nyeri", hint: "Central living" },
  { name: "Karatina", query: "Karatina", hint: "Quiet & green" },
  { name: "Othaya", query: "Othaya", hint: "Family homes" },
  { name: "Mukurwe-ini", query: "Mukurwe", hint: "Affordable finds" },
];

export default async function HomePage() {
  const [
    { data: featuredProperties },
    { data: rentals },
    { data: forSale },
    { data: airbnb },
    { data: villas },
    { data: plots },
    { data: farmland },
  ] = await Promise.all([
    sanityFetch({ query: FEATURED_PROPERTIES_QUERY }),
    sanityFetch({
      query: PROPERTIES_BY_CATEGORY_QUERY,
      params: { category: "rent", type: "", limit: 3 },
    }),
    sanityFetch({
      query: PROPERTIES_BY_CATEGORY_QUERY,
      params: { category: "sale", type: "", limit: 3 },
    }),
    sanityFetch({
      query: PROPERTIES_BY_CATEGORY_QUERY,
      params: { category: "airbnb", type: "", limit: 3 },
    }),
    sanityFetch({
      query: PROPERTIES_BY_CATEGORY_QUERY,
      params: { category: "", type: "villa", limit: 3 },
    }),
    sanityFetch({
      query: PROPERTIES_BY_CATEGORY_QUERY,
      params: { category: "", type: "land", limit: 3 },
    }),
    sanityFetch({
      query: PROPERTIES_BY_CATEGORY_QUERY,
      params: { category: "", type: "farmland", limit: 3 },
    }),
  ]);

  return (
    <div>
      <HeroCarousel />

      <section className="py-14 md:py-16 border-b border-border/60">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-heading font-semibold">
              Explore by category
            </h2>
            <p className="text-muted-foreground mt-2">
              Whether you want to rent, buy, host guests, or invest in land
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MARKET_CATEGORIES.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-2xl border border-border bg-card p-6 shadow-warm transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-primary/30"
                >
                  <Icon
                    className="h-6 w-6 text-primary mb-4"
                    aria-hidden="true"
                  />
                  <h3 className="font-heading text-xl font-semibold mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-8">
            {PROPERTY_TYPES.map((item) => (
              <Link
                key={item.value}
                href={`/properties?type=${item.value}`}
                className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container space-y-16">
          <CategoryStrip
            title="Featured listings"
            subtitle="Hand-picked homes, stays, and land across Nyeri"
            href="/properties"
            properties={featuredProperties}
            empty={{
              title: "No featured listings yet",
              description:
                "When agents mark listings as featured, they will appear here for renters and buyers browsing GreenKey Realty.",
              tips: [
                "Agents can create a listing and toggle Featured in Sanity or when editing later.",
                "Browse all active listings while this section fills up.",
              ],
              browseHref: "/properties",
              browseLabel: "Browse all listings",
              relatedLinks: [
                { href: "/properties?category=rent", label: "For rent" },
                { href: "/properties?category=sale", label: "For sale" },
                { href: "/pricing", label: "Become an agent" },
              ],
            }}
          />
          <CategoryStrip
            title="For rent"
            subtitle="Monthly homes ready for tenants"
            href="/properties?category=rent"
            properties={rentals}
            empty={{
              title: "No rentals listed yet",
              description:
                "This section shows houses, apartments, and bedsitters available for monthly rent across Nyeri County.",
              tips: [
                "Agents: choose Listing Category → For Rent when uploading.",
                "Include photos, monthly price, bedrooms, and map location.",
                "Tenants can save favorites and contact agents from each listing.",
              ],
              browseHref: "/properties?category=rent",
              browseLabel: "Open rentals filter",
              relatedLinks: [
                {
                  href: "/properties?type=apartment&category=rent",
                  label: "Apartments",
                },
                { href: "/properties?category=airbnb", label: "Airbnb stays" },
                { href: "/dashboard/listings/new", label: "List a rental" },
              ],
            }}
          />
          <CategoryStrip
            title="For sale"
            subtitle="Properties available to buy"
            href="/properties?category=sale"
            properties={forSale}
            empty={{
              title: "No homes for sale yet",
              description:
                "Sale listings cover houses, apartments, townhouses, and villas ready for purchase in Nyeri.",
              tips: [
                "Agents: set Listing Category → For Sale and enter the full sale price.",
                "Add clear photos and land or house details to attract serious buyers.",
              ],
              browseHref: "/properties?category=sale",
              browseLabel: "Open for-sale filter",
              relatedLinks: [
                { href: "/properties?type=villa", label: "Villas" },
                { href: "/properties?type=land", label: "Plots" },
                { href: "/pricing", label: "List with us" },
              ],
            }}
          />
          <CategoryStrip
            title="Airbnb & short stays"
            subtitle="Guest-ready spaces for visitors"
            href="/properties?category=airbnb"
            properties={airbnb}
            empty={{
              title: "No Airbnb stays yet",
              description:
                "Short-stay hosts can list furnished homes and guest houses with a nightly rate for visitors to Nyeri.",
              tips: [
                "Agents/hosts: choose Listing Category → Airbnb / Short stay.",
                "Price should be the nightly rate; add amenities guests care about (Wi‑Fi, parking, kitchen).",
                "Great for tourists, weekend trips, and business travel.",
              ],
              browseHref: "/properties?category=airbnb",
              browseLabel: "Open Airbnb filter",
              relatedLinks: [
                { href: "/properties?category=rent", label: "Monthly rentals" },
                { href: "/dashboard/listings/new", label: "Host a stay" },
              ],
            }}
          />
          <CategoryStrip
            title="Luxury villas"
            subtitle="Standout villas for lifestyle living"
            href="/properties?type=villa"
            properties={villas}
            empty={{
              title: "No villas published yet",
              description:
                "Villa listings highlight premium homes — for sale, for rent, or as exclusive short stays.",
              tips: [
                "When uploading, set Property Type → Villa.",
                "Pair with rent, sale, or Airbnb depending on how you want to market it.",
                "High-quality exterior and interior photos help this section shine.",
              ],
              browseHref: "/properties?type=villa",
              browseLabel: "Open villas filter",
              relatedLinks: [
                { href: "/properties?category=sale", label: "For sale" },
                { href: "/properties?category=airbnb", label: "Short stays" },
              ],
            }}
          />
          <CategoryStrip
            title="Plots & land"
            subtitle="1/4, 1/2, and acre plots for building or business"
            href="/properties?type=land"
            properties={plots}
            empty={{
              title: "No plots listed yet",
              description:
                "Plot listings are for residential or commercial land — including 1/4 acre, 1/2 acre, and full acres.",
              tips: [
                "Property Type → Plot / Land, then choose land size and purpose.",
                "Pin the exact map location so buyers can assess access and surroundings.",
                "Usually listed under For Sale with a clear price.",
              ],
              browseHref: "/properties?type=land",
              browseLabel: "Open plots filter",
              relatedLinks: [
                {
                  href: "/properties?type=land&landPurpose=residential",
                  label: "Residential plots",
                },
                {
                  href: "/properties?type=land&landPurpose=commercial",
                  label: "Commercial plots",
                },
                { href: "/properties?type=farmland", label: "Farmland" },
              ],
            }}
          />
          <CategoryStrip
            title="Farmland"
            subtitle="Agricultural land in Nyeri’s farming heartland"
            href="/properties?type=farmland&landPurpose=agricultural"
            properties={farmland}
            empty={{
              title: "No farmland listed yet",
              description:
                "Farmland listings help buyers find agricultural acreage for crops, dairy, tea, coffee, and mixed farming.",
              tips: [
                "Property Type → Farmland and Land Purpose → Agricultural.",
                "Note size in acres and describe water access, roads, and current use.",
                "Drone-style photos and map pins help buyers understand the parcel.",
              ],
              browseHref: "/properties?type=farmland&landPurpose=agricultural",
              browseLabel: "Open farmland filter",
              relatedLinks: [
                { href: "/properties?type=land", label: "Plots" },
                { href: "/properties?category=sale", label: "For sale" },
                { href: "/dashboard/listings/new", label: "List farmland" },
              ],
            }}
          />
        </div>
      </section>

      <section className="py-20 md:py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div
          className="absolute inset-0 surface-grid opacity-40"
          aria-hidden="true"
        />
        <div className="container relative">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-semibold">
              Explore neighborhoods
            </h2>
            <p className="mt-3 text-primary-foreground/75">
              Jump into popular towns and farming areas across Nyeri County.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {NEIGHBORHOODS.map((place) => (
              <Link
                key={place.name}
                href={`/properties?city=${encodeURIComponent(place.query)}`}
                className="group rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-6 transition-[background-color,transform] duration-300 hover:bg-primary-foreground/10 hover:-translate-y-1"
              >
                <MapPin
                  className="h-5 w-5 text-secondary mb-4"
                  aria-hidden="true"
                />
                <h3 className="font-heading text-xl font-semibold mb-1">
                  {place.name}
                </h3>
                <p className="text-sm text-primary-foreground/70">
                  {place.hint}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-muted/50">
        <div className="container grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          <div>
            <h2 className="text-3xl md:text-4xl font-heading font-semibold mb-5">
              Built for people looking for a place — and people listing one
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Search rentals, sales, Airbnb stays, villas, plots, and farmland
              with clear filters and direct agent contact.
            </p>
            <ul className="space-y-5">
              <li className="flex gap-4">
                <Shield className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold font-heading mb-1">
                    Clear listing details
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Category, size, amenities, map location, and pricing in one
                    place.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <Heart className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold font-heading mb-1">
                    Saved list
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Keep track of rentals, sales, stays, and land worth a second
                    look.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl bg-foreground text-background p-8 md:p-10 relative overflow-hidden">
            <div
              className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-secondary/20 blur-2xl"
              aria-hidden="true"
            />
            <Upload
              className="h-8 w-8 text-secondary mb-6"
              aria-hidden="true"
            />
            <h2 className="text-2xl md:text-3xl font-heading font-semibold mb-3">
              List homes, villas, Airbnb stays & land
            </h2>
            <p className="text-background/70 mb-8">
              Agents and landlords can upload photos, choose rent/sale/Airbnb,
              set land size and purpose, and receive leads from interested
              clients.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                <Link href="/pricing">
                  Become an agent
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-background/25 bg-transparent text-background hover:bg-background/10 hover:text-background"
              >
                <Link href="/dashboard/listings/new">Upload a listing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CategoryStrip({
  title,
  subtitle,
  href,
  properties,
  empty,
}: {
  title: string;
  subtitle: string;
  href: string;
  properties: Property[] | null | undefined;
  empty: {
    title: string;
    description: string;
    tips?: string[];
    browseHref: string;
    browseLabel: string;
    relatedLinks?: { href: string; label: string }[];
  };
}) {
  const list = properties || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-heading font-semibold">
            {title}
          </h2>
          <p className="text-muted-foreground mt-2">{subtitle}</p>
        </div>
        <Button variant="outline" asChild className="w-fit">
          <Link href={href}>
            View all
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {list.length > 0 ? (
        <PropertyGrid properties={list} />
      ) : (
        <CategoryEmptyState {...empty} />
      )}
    </div>
  );
}
