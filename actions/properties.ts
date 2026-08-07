"use server";

import { apiFetch } from "@/lib/api/client";
import { getAccessToken, getSessionUser } from "@/lib/api/session";

interface ImageReference {
  _type: "image";
  _key: string;
  asset: {
    _type: "reference";
    _ref: string;
  };
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

interface GeoPoint {
  lat: number;
  lng: number;
}

interface ListingFormDataWithImages {
  title: string;
  description: string;
  price: number;
  listingCategory: "rent" | "sale" | "airbnb";
  propertyType:
    | "house"
    | "apartment"
    | "bedsitter"
    | "condo"
    | "townhouse"
    | "villa"
    | "land"
    | "farmland";
  landSize?:
    | "quarter_acre"
    | "half_acre"
    | "one_acre"
    | "multi_acre"
    | "custom";
  landSizeAcres?: number;
  landPurpose?: "residential" | "commercial" | "agricultural";
  furnished?: "unfurnished" | "semi_furnished" | "furnished";
  depositAmount?: number;
  availableFrom?: string;
  petsAllowed?: boolean;
  titleDeedReady?: boolean;
  serviceCharge?: number;
  originalPrice?: number;
  openHouseDate?: string;
  maxGuests?: number;
  minNights?: number;
  cleaningFee?: number;
  checkInTime?: string;
  checkOutTime?: string;
  hasPool?: boolean;
  hasStaffQuarters?: boolean;
  hasGarden?: boolean;
  hasBackupPower?: boolean;
  roadAccess?: "tarmac" | "murram" | "footpath" | "none";
  fenced?: boolean;
  waterSource?: "borehole" | "river" | "piped" | "rain" | "none";
  cropsSuitable?: string;
  parkingSpaces?: number;
  status?: "active" | "pending" | "sold" | "rented";
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt?: number;
  address: Address;
  location?: GeoPoint;
  amenities?: string[];
  images?: ImageReference[];
}

type CreateListingResult =
  | { success: true; id: string }
  | { success: false; error: string };

function toApiBody(data: ListingFormDataWithImages) {
  return {
    title: data.title,
    description: data.description,
    price: data.price,
    listingCategory: data.listingCategory,
    propertyType: data.propertyType,
    landSize: data.landSize,
    landSizeAcres: data.landSizeAcres,
    landPurpose: data.landPurpose,
    furnished: data.furnished,
    depositAmount: data.depositAmount,
    availableFrom: data.availableFrom,
    petsAllowed: data.petsAllowed,
    titleDeedReady: data.titleDeedReady,
    serviceCharge: data.serviceCharge,
    originalPrice: data.originalPrice,
    openHouseDate: data.openHouseDate,
    maxGuests: data.maxGuests,
    minNights: data.minNights,
    cleaningFee: data.cleaningFee,
    checkInTime: data.checkInTime,
    checkOutTime: data.checkOutTime,
    hasPool: data.hasPool,
    hasStaffQuarters: data.hasStaffQuarters,
    hasGarden: data.hasGarden,
    hasBackupPower: data.hasBackupPower,
    roadAccess: data.roadAccess,
    fenced: data.fenced,
    waterSource: data.waterSource,
    cropsSuitable: data.cropsSuitable,
    parkingSpaces: data.parkingSpaces,
    status: data.status,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    squareFeet: data.squareFeet,
    yearBuilt: data.yearBuilt,
    address: data.address,
    location: data.location,
    amenities: data.amenities || [],
    images: (data.images || []).map((img) => ({
      _key: img._key,
      assetRef: img.asset._ref,
    })),
  };
}

export async function createListing(
  data: ListingFormDataWithImages,
): Promise<CreateListingResult> {
  try {
    const user = await getSessionUser();
    const accessToken = await getAccessToken();

    if (!user || !accessToken) {
      return { success: false, error: "Not authenticated" };
    }

    const created = await apiFetch<{ id: string }>("/properties", {
      method: "POST",
      accessToken,
      body: toApiBody(data),
    });

    return { success: true, id: created.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create listing";
    return { success: false, error: message };
  }
}

export async function updateListing(
  listingId: string,
  data: ListingFormDataWithImages,
) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  await apiFetch(`/properties/${encodeURIComponent(listingId)}`, {
    method: "PUT",
    accessToken,
    body: toApiBody(data),
  });
}

export async function updateListingStatus(
  listingId: string,
  status: "active" | "pending" | "sold" | "rented",
) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  await apiFetch(`/properties/${encodeURIComponent(listingId)}/status`, {
    method: "PATCH",
    accessToken,
    body: { status },
  });
}

export async function deleteListing(listingId: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not authenticated");

  await apiFetch(`/properties/${encodeURIComponent(listingId)}`, {
    method: "DELETE",
    accessToken,
  });
}
