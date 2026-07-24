"use server";

import { apiFetch } from "@/lib/api/client";
import { getAccessToken, getSessionUser } from "@/lib/api/session";
import { client } from "@/lib/sanity/client";
import { sanityFetch } from "@/lib/sanity/live";
import {
  AGENT_ID_BY_USER_QUERY,
  PROPERTY_AGENT_REF_QUERY,
} from "@/lib/sanity/queries";

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
  landSize?: "quarter_acre" | "half_acre" | "one_acre" | "multi_acre" | "custom";
  landSizeAcres?: number;
  landPurpose?: "residential" | "commercial" | "agricultural";
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
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

    const { data: agent } = await sanityFetch({
      query: AGENT_ID_BY_USER_QUERY,
      params: { userId: user.id },
    });

    if (!agent?._id) {
      return {
        success: false,
        error:
          "Agent profile not found. Complete onboarding first at /dashboard/onboarding.",
      };
    }

    const createdProperty = await client.create({
      _type: "property",
      title: data.title,
      slug: { _type: "slug", current: slugify(data.title) },
      description: data.description,
      price: data.price,
      listingCategory: data.listingCategory,
      propertyType: data.propertyType,
      landSize: data.landSize,
      landSizeAcres: data.landSizeAcres,
      landPurpose: data.landPurpose,
      status: "active",
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      squareFeet: data.squareFeet,
      yearBuilt: data.yearBuilt,
      address: data.address,
      location: data.location
        ? { _type: "geopoint", lat: data.location.lat, lng: data.location.lng }
        : undefined,
      amenities: data.amenities || [],
      images: data.images || [],
      agent: { _type: "reference", _ref: agent._id },
      featured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await apiFetch("/properties/mirror", {
      method: "POST",
      accessToken,
      body: {
        sanityId: createdProperty._id,
        title: data.title,
        slug: slugify(data.title),
        listingCategory: data.listingCategory,
        propertyType: data.propertyType,
        status: "active",
        price: data.price,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        city: data.address.city,
        county: data.address.state,
        latitude: data.location?.lat,
        longitude: data.location?.lng,
      },
    }).catch(() => null);

    return { success: true, id: createdProperty._id };
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
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const { data: agent } = await sanityFetch({
    query: AGENT_ID_BY_USER_QUERY,
    params: { userId: user.id },
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  const { data: listing } = await sanityFetch({
    query: PROPERTY_AGENT_REF_QUERY,
    params: { id: listingId },
  });

  if (!listing || listing.agent._ref !== agent._id) {
    throw new Error("Unauthorized");
  }

  await client
    .patch(listingId)
    .set({
      title: data.title,
      slug: { _type: "slug", current: slugify(data.title) },
      description: data.description,
      price: data.price,
      listingCategory: data.listingCategory,
      propertyType: data.propertyType,
      landSize: data.landSize,
      landSizeAcres: data.landSizeAcres,
      landPurpose: data.landPurpose,
      status: data.status || "active",
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      squareFeet: data.squareFeet,
      yearBuilt: data.yearBuilt,
      address: data.address,
      location: data.location
        ? { _type: "geopoint", lat: data.location.lat, lng: data.location.lng }
        : undefined,
      amenities: data.amenities || [],
      images: data.images || [],
      updatedAt: new Date().toISOString(),
    })
    .commit();
}

export async function updateListingStatus(
  listingId: string,
  status: "active" | "pending" | "sold" | "rented",
) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const { data: agent } = await sanityFetch({
    query: AGENT_ID_BY_USER_QUERY,
    params: { userId: user.id },
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  const { data: listing } = await sanityFetch({
    query: PROPERTY_AGENT_REF_QUERY,
    params: { id: listingId },
  });

  if (!listing || listing.agent._ref !== agent._id) {
    throw new Error("Unauthorized");
  }

  await client
    .patch(listingId)
    .set({
      status,
      updatedAt: new Date().toISOString(),
    })
    .commit();
}

export async function deleteListing(listingId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const { data: agent } = await sanityFetch({
    query: AGENT_ID_BY_USER_QUERY,
    params: { userId: user.id },
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  const { data: listing } = await sanityFetch({
    query: PROPERTY_AGENT_REF_QUERY,
    params: { id: listingId },
  });

  if (!listing || listing.agent._ref !== agent._id) {
    throw new Error("Unauthorized");
  }

  await client.delete(listingId);
}
