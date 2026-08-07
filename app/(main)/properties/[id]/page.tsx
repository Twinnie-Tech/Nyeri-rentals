import {
  Bath,
  Bed,
  Calendar,
  Check,
  ChevronRight,
  MapPin,
  Square,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DynamicMapView } from "@/components/map/DynamicMapView";
import { AgentCard } from "@/components/property/AgentCard";
import { ContactAgentButton } from "@/components/property/ContactAgentButton";
import { ImageGallery } from "@/components/property/ImageGallery";
import { SavePropertyButton } from "@/components/property/SavePropertyButton";
import { SharePropertyButton } from "@/components/property/SharePropertyButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatBadge } from "@/components/ui/stat-badge";
import { getSessionUser } from "@/lib/api/session";
import {
  FURNISHED_OPTIONS,
  getLandPurposeLabel,
  getLandSizeLabel,
  getListingCategoryLabel,
  getPriceSuffix,
  getPropertyTypeLabel,
  isLandType,
  ROAD_ACCESS_OPTIONS,
  WATER_SOURCE_OPTIONS,
} from "@/lib/property-categories";
import { sanityFetch } from "@/lib/sanity/live";
import { PROPERTY_DETAIL_QUERY } from "@/lib/sanity/queries";

function formatKes(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KSH",
    maximumFractionDigits: 0,
  }).format(price);
}

function labelFrom(
  options: readonly { value: string; label: string }[],
  value?: string | null,
) {
  return options.find((o) => o.value === value)?.label || value || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { data: property } = await sanityFetch({
    query: PROPERTY_DETAIL_QUERY,
    params: { id },
  });

  if (!property) {
    return { title: "Property Not Found" };
  }

  return {
    title: `${property.title} - ${formatKes(property.price)}`,
    description:
      property.description?.slice(0, 160) ||
      `${getPropertyTypeLabel(property.propertyType)} ${getListingCategoryLabel(property.listingCategory).toLowerCase()} in Nyeri.`,
  };
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionUser();
  const userId = session?.id;

  const { data: property } = await sanityFetch({
    query: PROPERTY_DETAIL_QUERY,
    params: { id },
  });

  if (!property) {
    notFound();
  }

  const statusLabel =
    property.status !== "active"
      ? property.status.charAt(0).toUpperCase() + property.status.slice(1)
      : null;

  const showBuildingStats = !isLandType(property.propertyType);
  const priceSuffix = getPriceSuffix(property.listingCategory);

  const detailRows: { label: string; value: string }[] = [];

  if (property.listingCategory === "rent") {
    if (property.furnished) {
      detailRows.push({
        label: "Furnishing",
        value: labelFrom(FURNISHED_OPTIONS, property.furnished) || "",
      });
    }
    if (property.depositAmount != null) {
      detailRows.push({
        label: "Security deposit",
        value: formatKes(property.depositAmount),
      });
    }
    if (property.availableFrom) {
      detailRows.push({
        label: "Available from",
        value: new Date(property.availableFrom).toLocaleDateString(),
      });
    }
    if (property.petsAllowed != null) {
      detailRows.push({
        label: "Pets",
        value: property.petsAllowed ? "Allowed" : "Not allowed",
      });
    }
  }

  if (property.listingCategory === "sale") {
    if (property.originalPrice != null) {
      detailRows.push({
        label: "Original price",
        value: formatKes(property.originalPrice),
      });
    }
    if (property.serviceCharge != null) {
      detailRows.push({
        label: "Service charge",
        value: `${formatKes(property.serviceCharge)} / mo`,
      });
    }
    if (property.openHouseDate) {
      detailRows.push({
        label: "Open house",
        value: new Date(property.openHouseDate).toLocaleString(),
      });
    }
    if (property.titleDeedReady != null && !isLandType(property.propertyType)) {
      detailRows.push({
        label: "Title deed",
        value: property.titleDeedReady ? "Ready" : "Pending",
      });
    }
  }

  if (property.listingCategory === "airbnb") {
    if (property.maxGuests != null) {
      detailRows.push({
        label: "Max guests",
        value: String(property.maxGuests),
      });
    }
    if (property.minNights != null) {
      detailRows.push({
        label: "Minimum nights",
        value: String(property.minNights),
      });
    }
    if (property.cleaningFee != null) {
      detailRows.push({
        label: "Cleaning fee",
        value: formatKes(property.cleaningFee),
      });
    }
    if (property.checkInTime) {
      detailRows.push({ label: "Check-in", value: property.checkInTime });
    }
    if (property.checkOutTime) {
      detailRows.push({ label: "Check-out", value: property.checkOutTime });
    }
  }

  if (property.propertyType === "villa") {
    const villaFlags = [
      property.hasPool && "Swimming pool",
      property.hasStaffQuarters && "Staff quarters",
      property.hasGarden && "Private garden",
      property.hasBackupPower && "Backup power",
    ].filter(Boolean) as string[];
    if (villaFlags.length) {
      detailRows.push({
        label: "Villa features",
        value: villaFlags.join(", "),
      });
    }
  }

  if (isLandType(property.propertyType)) {
    if (property.landSize) {
      detailRows.push({
        label: "Land size",
        value: getLandSizeLabel(property.landSize),
      });
    }
    if (property.landSizeAcres != null) {
      detailRows.push({
        label: "Acres",
        value: String(property.landSizeAcres),
      });
    }
    if (property.landPurpose) {
      detailRows.push({
        label: "Purpose",
        value: getLandPurposeLabel(property.landPurpose),
      });
    }
    if (property.roadAccess) {
      detailRows.push({
        label: "Road access",
        value: labelFrom(ROAD_ACCESS_OPTIONS, property.roadAccess) || "",
      });
    }
    if (property.fenced != null) {
      detailRows.push({
        label: "Fenced",
        value: property.fenced ? "Yes" : "No",
      });
    }
    if (property.titleDeedReady != null) {
      detailRows.push({
        label: "Title deed",
        value: property.titleDeedReady ? "Ready" : "Pending",
      });
    }
  }

  if (property.propertyType === "farmland") {
    if (property.waterSource) {
      detailRows.push({
        label: "Water source",
        value: labelFrom(WATER_SOURCE_OPTIONS, property.waterSource) || "",
      });
    }
    if (property.cropsSuitable) {
      detailRows.push({
        label: "Crops / use",
        value: property.cropsSuitable,
      });
    }
  }

  if (property.parkingSpaces != null && showBuildingStats) {
    detailRows.push({
      label: "Parking spaces",
      value: String(property.parkingSpaces),
    });
  }

  return (
    <div className="min-h-screen bg-accent/20">
      <div className="bg-background border-b border-border/50">
        <div className="container py-4">
          <nav
            className="flex items-center gap-2 text-sm text-muted-foreground"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <Link
              href="/properties"
              className="hover:text-foreground transition-colors"
            >
              Properties
            </Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {property.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <ImageGallery
              images={property.images || []}
              title={property.title}
            />

            <div className="bg-background rounded-2xl border border-border/50 p-6 shadow-warm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold font-heading tabular-nums">
                      {formatKes(property.price)}
                      {priceSuffix ? (
                        <span className="text-lg font-normal text-muted-foreground">
                          {priceSuffix}
                        </span>
                      ) : null}
                    </h1>
                    {statusLabel && (
                      <Badge
                        variant={
                          property.status === "sold" ? "destructive" : "muted"
                        }
                      >
                        {statusLabel}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-lg text-muted-foreground">
                    {property.title}
                  </h2>
                </div>
                <div className="flex gap-2">
                  {userId && <SavePropertyButton propertyId={property._id} />}
                  <SharePropertyButton
                    title={property.title}
                    price={formatKes(property.price)}
                  />
                </div>
              </div>

              {property.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin
                    className="h-5 w-5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    {property.address.street}, {property.address.city},{" "}
                    {property.address.state}
                    {property.address.zipCode
                      ? ` ${property.address.zipCode}`
                      : ""}
                  </span>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {property.listingCategory && (
                  <Badge variant="outline">
                    {getListingCategoryLabel(property.listingCategory)}
                  </Badge>
                )}
                {property.propertyType && (
                  <Badge variant="secondary">
                    {getPropertyTypeLabel(property.propertyType)}
                  </Badge>
                )}
              </div>
            </div>

            {showBuildingStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBadge
                  icon={Bed}
                  value={property.bedrooms}
                  label="Bedrooms"
                  color="primary"
                />
                <StatBadge
                  icon={Bath}
                  value={property.bathrooms}
                  label="Bathrooms"
                  color="secondary"
                />
                <StatBadge
                  icon={Square}
                  value={property.squareFeet || 0}
                  label="Sq Ft"
                  color="primary"
                />
                {property.yearBuilt && (
                  <StatBadge
                    icon={Calendar}
                    value={property.yearBuilt}
                    label="Year Built"
                    color="secondary"
                  />
                )}
              </div>
            )}

            {detailRows.length > 0 && (
              <Card className="shadow-warm">
                <CardHeader>
                  <CardTitle className="font-heading">
                    Listing details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {detailRows.map((row) => (
                      <div key={row.label}>
                        <dt className="text-sm text-muted-foreground">
                          {row.label}
                        </dt>
                        <dd className="font-medium mt-0.5">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}

            {property.description && (
              <Card className="shadow-warm">
                <CardHeader>
                  <CardTitle className="font-heading">
                    About This Property
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {property.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {property.amenities && property.amenities.length > 0 && (
              <Card className="shadow-warm">
                <CardHeader>
                  <CardTitle className="font-heading">
                    Amenities & Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {property.amenities.map((amenity: string) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-3 p-3 rounded-lg bg-accent/50"
                      >
                        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                          <Check
                            className="h-4 w-4 text-success"
                            aria-hidden="true"
                          />
                        </div>
                        <span className="capitalize text-sm font-medium">
                          {amenity.replace(/-/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {property.location && (
              <Card className="shadow-warm overflow-hidden">
                <CardHeader>
                  <CardTitle className="font-heading">Location</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[400px]">
                    <DynamicMapView
                      properties={[
                        {
                          ...property,
                          slug: property.slug || id,
                        },
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {property.agent && (
                <AgentCard agent={property.agent}>
                  <ContactAgentButton
                    propertyId={property._id}
                    agentId={property.agent._id}
                    isAuthenticated={!!userId}
                  />
                </AgentCard>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
