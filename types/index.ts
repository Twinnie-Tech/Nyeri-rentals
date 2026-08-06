// Amenity type
export interface Amenity {
  _id: string;
  value: string;
  label: string;
  icon?: string | null;
  order?: number;
}

// Property types
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface SanityImage {
  asset: {
    _id: string;
    url: string;
    metadata?: {
      lqip?: string;
      dimensions?: {
        width: number;
        height: number;
      };
    };
  };
  alt?: string;
}

export interface Property {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  price: number;
  listingCategory?: "rent" | "sale" | "airbnb";
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
  status: "active" | "pending" | "sold" | "rented";
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt?: number;
  address: Address;
  location?: GeoPoint;
  images?: SanityImage[];
  image?: SanityImage;
  amenities?: string[];
  featured?: boolean;
  createdAt: string;
  updatedAt?: string;
  agent?: Agent;
}

export interface Agent {
  _id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  photo?: SanityImage;
  bio?: string;
  licenseNumber?: string;
  agency?: string;
  onboardingComplete?: boolean;
  createdAt?: string;
}

export interface Lead {
  _id: string;
  property: {
    _id: string;
    title: string;
    slug: string;
  };
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  status: "new" | "contacted" | "closed";
  createdAt: string;
}

export interface User {
  _id: string;
  clerkId?: string;
  name: string;
  email: string;
  phone?: string;
  phoneVerifiedAt?: string | null;
  emailVerifiedAt?: string | null;
  photo?: SanityImage;
  savedListings?: Property[];
  createdAt?: string;
}

// Form data types
export interface UserOnboardingData {
  name: string;
  phone: string;
  email: string;
  photo?: SanityImage;
}

export interface AgentOnboardingData {
  bio: string;
  photo?: SanityImage;
  licenseNumber: string;
  agency?: string;
  phone: string;
}

export interface UserProfileData {
  name: string;
  phone: string;
  email: string;
  photo?: SanityImage;
}

export interface AgentProfileData {
  bio: string;
  photo?: SanityImage;
  licenseNumber: string;
  agency?: string;
  phone: string;
}

export interface ListingFormData {
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
  images?: SanityImage[];
  amenities?: string[];
}

// Search params
export interface PropertySearchParams {
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  type?: string;
  city?: string;
  page?: number;
}
