"use client";

import { Bath, Bed, Heart, MapPin, Square } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getLandPurposeLabel,
  getLandSizeLabel,
  getListingCategoryLabel,
  getPriceSuffix,
  getPropertyTypeLabel,
  isLandType,
} from "@/lib/property-categories";
import { urlFor } from "@/lib/sanity/image";
import type { Property } from "@/types";

interface PropertyCardProps {
  property: Property;
  onSave?: (propertyId: string) => void;
  isSaved?: boolean;
  showRemoveButton?: boolean;
}

export function PropertyCard({
  property,
  onSave,
  isSaved,
  showRemoveButton: _showRemoveButton,
}: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSave) {
      onSave(property._id);
    }
  };

  const statusLabel =
    property.status && property.status !== "active"
      ? property.status.charAt(0).toUpperCase() + property.status.slice(1)
      : null;

  const priceSuffix = getPriceSuffix(property.listingCategory);
  const categoryLabel = getListingCategoryLabel(property.listingCategory);
  const typeLabel = getPropertyTypeLabel(property.propertyType);

  return (
    <Link href={`/properties/${property._id}`} className="group block">
      <article className="overflow-hidden rounded-2xl bg-card transition-transform duration-300 hover:-translate-y-1">
        <div className="relative aspect-[5/4] overflow-hidden rounded-2xl">
          {property.image?.asset ? (
            <Image
              src={urlFor(property.image).width(700).height(560).url()}
              alt={property.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">
                No photo yet
              </span>
            </div>
          )}

          <div
            className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-transparent opacity-70"
            aria-hidden="true"
          />

          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {property.listingCategory && (
              <Badge className="bg-secondary text-secondary-foreground shadow-sm">
                {categoryLabel}
              </Badge>
            )}
            {statusLabel && (
              <Badge
                variant={
                  property.status === "sold" || property.status === "rented"
                    ? "destructive"
                    : "muted"
                }
              >
                {statusLabel}
              </Badge>
            )}
          </div>

          {typeLabel && (
            <span className="absolute bottom-3 left-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium capitalize backdrop-blur-sm">
              {typeLabel}
            </span>
          )}

          {onSave && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background"
              onClick={handleSaveClick}
              aria-label={
                isSaved ? "Remove from saved properties" : "Save property"
              }
            >
              <Heart
                className={`h-4 w-4 transition-colors duration-200 ${
                  isSaved
                    ? "fill-primary text-primary"
                    : "text-muted-foreground"
                }`}
                aria-hidden="true"
              />
            </Button>
          )}
        </div>

        <div className="pt-4 px-1">
          <p className="font-heading text-xl font-semibold tabular-nums tracking-tight">
            {formatPrice(property.price)}
            {priceSuffix ? (
              <span className="text-sm font-body font-normal text-muted-foreground">
                {" "}
                {priceSuffix}
              </span>
            ) : null}
          </p>

          <h3 className="text-sm font-medium line-clamp-1 mb-3 min-w-0 mt-1">
            {property.title}
          </h3>

          {isLandType(property.propertyType) ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
              {property.landSize && (
                <span>{getLandSizeLabel(property.landSize)}</span>
              )}
              {property.landPurpose && (
                <span>· {getLandPurposeLabel(property.landPurpose)}</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              {property.bedrooms !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <Bed className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="tabular-nums">{property.bedrooms}</span>
                </span>
              )}
              {property.bathrooms !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <Bath className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="tabular-nums">{property.bathrooms}</span>
                </span>
              )}
              {property.squareFeet ? (
                <span className="inline-flex items-center gap-1">
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="tabular-nums">
                    {property.squareFeet.toLocaleString()}
                  </span>
                </span>
              ) : null}
            </div>
          )}

          {property.address && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="line-clamp-1 min-w-0">
                {[property.address.city, property.address.state]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
