import { Heart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PropertyGrid } from "@/components/property/PropertyGrid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api/client";
import { getAccessToken, getSessionUser } from "@/lib/api/session";
import { sanityFetch } from "@/lib/sanity/live";
import { PROPERTIES_BY_IDS_QUERY } from "@/lib/sanity/queries";

export default async function SavedListingsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/sign-in");

  const accessToken = await getAccessToken();
  let savedProperties: unknown[] = [];

  if (accessToken) {
    try {
      const saved = await apiFetch<{
        items: Array<{ property: { sanityId: string } }>;
      }>("/users/me/saved?limit=100", { accessToken });
      const ids = saved.items.map((s) => s.property.sanityId).filter(Boolean);
      if (ids.length) {
        const { data } = await sanityFetch({
          query: PROPERTIES_BY_IDS_QUERY,
          params: { ids },
        });
        savedProperties = data || [];
      }
    } catch {
      savedProperties = [];
    }
  }

  return (
    <div className="container py-16">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Saved Listings</h1>
      </div>

      {savedProperties && savedProperties.length > 0 ? (
        <PropertyGrid
          properties={savedProperties as never}
          showRemoveButton
        />
      ) : (
        <EmptyState
          icon={Heart}
          title="No saved listings yet"
          description="Start browsing properties and save your favorites here."
          action={
            <Button asChild>
              <Link href="/properties">Browse Properties</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
