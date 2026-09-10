import { ArrowRight, Home, MapPin, Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CategoryEmptyStateProps {
  title: string;
  description: string;
  tips?: string[];
  browseHref: string;
  browseLabel: string;
  relatedLinks?: { href: string; label: string }[];
}

export function CategoryEmptyState({
  title,
  description,
  tips = [],
  browseHref,
  browseLabel,
  relatedLinks = [],
}: CategoryEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 md:px-10">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Home className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <h3 className="font-heading text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{description}</p>

        {tips.length > 0 && (
          <ul className="text-left text-sm text-muted-foreground space-y-2 mb-8 max-w-lg mx-auto">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <MapPin
                  className="h-4 w-4 text-primary shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Button asChild>
            <Link href={browseHref}>
              {browseLabel}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/listings/new">
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              Upload a listing
            </Link>
          </Button>
        </div>

        {relatedLinks.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <span className="text-muted-foreground">Also explore:</span>
            {relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-medium text-primary hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-6">
          Agents can publish rentals, sales, Airbnb stays, villas, plots, and
          farmland from the dashboard after completing their profile.
        </p>
      </div>
    </div>
  );
}
