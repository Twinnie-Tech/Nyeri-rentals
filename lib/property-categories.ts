/** Shared listing taxonomy for GreenKey Realty */

export const BRAND_NAME = "GreenKey Realty";

export const LISTING_CATEGORIES = [
  { value: "rent", label: "For Rent", priceSuffix: "/ mo" },
  { value: "sale", label: "For Sale", priceSuffix: "" },
  { value: "airbnb", label: "Airbnb / Short stay", priceSuffix: "/ night" },
] as const;

export const PROPERTY_TYPES = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "bedsitter", label: "Bedsitter" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "villa", label: "Villa" },
  { value: "land", label: "Plot / Land" },
  { value: "farmland", label: "Farmland" },
] as const;

export const LAND_SIZES = [
  { value: "quarter_acre", label: "1/4 acre" },
  { value: "half_acre", label: "1/2 acre" },
  { value: "one_acre", label: "1 acre" },
  { value: "multi_acre", label: "Multiple acres" },
  { value: "custom", label: "Custom size" },
] as const;

export const LAND_PURPOSES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "agricultural", label: "Agricultural / Farming" },
] as const;

export const LISTING_STATUSES = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "sold", label: "Sold" },
  { value: "rented", label: "Rented" },
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number]["value"];
export type PropertyTypeValue = (typeof PROPERTY_TYPES)[number]["value"];
export type LandSizeValue = (typeof LAND_SIZES)[number]["value"];
export type LandPurposeValue = (typeof LAND_PURPOSES)[number]["value"];

export function isLandType(type?: string | null) {
  return type === "land" || type === "farmland";
}

export function getListingCategoryLabel(category?: string | null) {
  return (
    LISTING_CATEGORIES.find((c) => c.value === category)?.label || "Listing"
  );
}

export function getPropertyTypeLabel(type?: string | null) {
  return PROPERTY_TYPES.find((t) => t.value === type)?.label || type || "";
}

export function getPriceSuffix(category?: string | null) {
  return (
    LISTING_CATEGORIES.find((c) => c.value === category)?.priceSuffix ?? ""
  );
}

export function getLandSizeLabel(size?: string | null) {
  return LAND_SIZES.find((s) => s.value === size)?.label || size || "";
}

export function getLandPurposeLabel(purpose?: string | null) {
  return LAND_PURPOSES.find((p) => p.value === purpose)?.label || purpose || "";
}
