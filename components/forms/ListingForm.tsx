"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FieldErrors } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createListing, updateListing } from "@/actions/properties";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete, type AddressResult } from "./AddressAutocomplete";
import { type ImageItem, ImageUpload } from "./ImageUpload";
import { LocationPicker } from "./LocationPicker";
import {
  FURNISHED_OPTIONS,
  isFarmlandType,
  isLandType,
  isVillaType,
  LAND_PURPOSES,
  LAND_SIZES,
  LISTING_CATEGORIES,
  LISTING_STATUSES,
  PROPERTY_TYPES,
  ROAD_ACCESS_OPTIONS,
  WATER_SOURCE_OPTIONS,
} from "@/lib/property-categories";

// Re-export Amenity type from shared types
import type { Amenity } from "@/types";
export type { Amenity };

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.coerce.number().positive("Price must be positive"),
  listingCategory: z.enum(["rent", "sale", "airbnb"]),
  propertyType: z.enum([
    "house",
    "apartment",
    "bedsitter",
    "condo",
    "townhouse",
    "villa",
    "land",
    "farmland",
  ]),
  landSize: z
    .enum(["quarter_acre", "half_acre", "one_acre", "multi_acre", "custom"])
    .optional(),
  landSizeAcres: z.coerce.number().min(0).optional(),
  landPurpose: z.enum(["residential", "commercial", "agricultural"]).optional(),
  // Rent
  furnished: z
    .enum(["unfurnished", "semi_furnished", "furnished"])
    .optional(),
  depositAmount: z.coerce.number().min(0).optional(),
  availableFrom: z.string().optional(),
  petsAllowed: z.boolean().optional(),
  // Sale
  titleDeedReady: z.boolean().optional(),
  serviceCharge: z.coerce.number().min(0).optional(),
  originalPrice: z.coerce.number().positive().optional(),
  openHouseDate: z.string().optional(),
  // Airbnb
  maxGuests: z.coerce.number().min(1).optional(),
  minNights: z.coerce.number().min(1).optional(),
  cleaningFee: z.coerce.number().min(0).optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  // Villa
  hasPool: z.boolean().optional(),
  hasStaffQuarters: z.boolean().optional(),
  hasGarden: z.boolean().optional(),
  hasBackupPower: z.boolean().optional(),
  // Land / farmland
  roadAccess: z.enum(["tarmac", "murram", "footpath", "none"]).optional(),
  fenced: z.boolean().optional(),
  waterSource: z
    .enum(["borehole", "river", "piped", "rain", "none"])
    .optional(),
  cropsSuitable: z.string().optional(),
  parkingSpaces: z.coerce.number().min(0).optional(),
  status: z.enum(["active", "pending", "sold", "rented"]).optional(),
  bedrooms: z.coerce.number().min(0),
  bathrooms: z.coerce.number().min(0),
  squareFeet: z.coerce.number().min(0),
  yearBuilt: z.coerce
    .number()
    .min(1800)
    .max(new Date().getFullYear())
    .optional(),
  street: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().optional().default(""),
  amenities: z.array(z.string()).optional(),
});
// Input type: what the form fields receive (strings from inputs)
type FormDataInput = z.input<typeof formSchema>;
// Output type: what validation produces (coerced to proper types)
type FormDataOutput = z.output<typeof formSchema>;

interface ListingImage {
  asset: {
    _id: string;
    url: string;
  };
}

interface GeoPoint {
  lat: number;
  lng: number;
}

interface ListingFormProps {
  listing?: {
    _id: string;
    title: string;
    description?: string;
    price: number;
    listingCategory?: string;
    propertyType: string;
    landSize?: string;
    landSizeAcres?: number;
    landPurpose?: string;
    furnished?: string;
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
    roadAccess?: string;
    fenced?: boolean;
    waterSource?: string;
    cropsSuitable?: string;
    parkingSpaces?: number;
    status: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    yearBuilt?: number;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    location?: GeoPoint;
    amenities?: string[];
    images?: ListingImage[];
  };
  amenities: Amenity[];
  mode?: "create" | "edit";
}
export function ListingForm({
  listing,
  amenities,
  mode = "create",
}: ListingFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize images from listing data
  const initialImages: ImageItem[] =
    listing?.images?.map((img) => ({
      id: img.asset._id,
      url: img.asset.url,
      assetRef: img.asset._id,
    })) || [];

  const [images, setImages] = useState<ImageItem[]>(initialImages);
  const [location, setLocation] = useState<GeoPoint | undefined>(
    listing?.location,
  );

  // Build initial address display value for edit mode
  const initialAddressValue = listing?.address
    ? [
        listing.address.street,
        listing.address.city,
        listing.address.state,
        listing.address.zipCode,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const [addressDisplayValue, setAddressDisplayValue] =
    useState(initialAddressValue);
  const emptyFormValues: FormDataInput = {
    title: "",
    description: "",
    price: 0,
    listingCategory: "rent",
    propertyType: "house",
    landSize: undefined,
    landSizeAcres: undefined,
    landPurpose: undefined,
    furnished: undefined,
    depositAmount: undefined,
    availableFrom: undefined,
    petsAllowed: false,
    titleDeedReady: false,
    serviceCharge: undefined,
    originalPrice: undefined,
    openHouseDate: undefined,
    maxGuests: undefined,
    minNights: undefined,
    cleaningFee: undefined,
    checkInTime: undefined,
    checkOutTime: undefined,
    hasPool: false,
    hasStaffQuarters: false,
    hasGarden: false,
    hasBackupPower: false,
    roadAccess: undefined,
    fenced: false,
    waterSource: undefined,
    cropsSuitable: undefined,
    parkingSpaces: undefined,
    status: "active",
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 0,
    yearBuilt: undefined,
    street: "",
    city: "",
    state: "",
    zipCode: "",
    amenities: [],
  };

  const form = useForm<FormDataInput, unknown, FormDataOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: listing?.title || "",
      description: listing?.description || "",
      price: listing?.price || 0,
      listingCategory:
        (listing?.listingCategory as FormDataOutput["listingCategory"]) ||
        "rent",
      propertyType:
        (listing?.propertyType as FormDataOutput["propertyType"]) || "house",
      landSize: listing?.landSize as FormDataOutput["landSize"],
      landSizeAcres: listing?.landSizeAcres,
      landPurpose: listing?.landPurpose as FormDataOutput["landPurpose"],
      furnished: listing?.furnished as FormDataOutput["furnished"],
      depositAmount: listing?.depositAmount,
      availableFrom: listing?.availableFrom?.slice(0, 10),
      petsAllowed: listing?.petsAllowed ?? false,
      titleDeedReady: listing?.titleDeedReady ?? false,
      serviceCharge: listing?.serviceCharge,
      originalPrice: listing?.originalPrice,
      openHouseDate: listing?.openHouseDate?.slice(0, 16),
      maxGuests: listing?.maxGuests,
      minNights: listing?.minNights,
      cleaningFee: listing?.cleaningFee,
      checkInTime: listing?.checkInTime || "",
      checkOutTime: listing?.checkOutTime || "",
      hasPool: listing?.hasPool ?? false,
      hasStaffQuarters: listing?.hasStaffQuarters ?? false,
      hasGarden: listing?.hasGarden ?? false,
      hasBackupPower: listing?.hasBackupPower ?? false,
      roadAccess: listing?.roadAccess as FormDataOutput["roadAccess"],
      fenced: listing?.fenced ?? false,
      waterSource: listing?.waterSource as FormDataOutput["waterSource"],
      cropsSuitable: listing?.cropsSuitable || "",
      parkingSpaces: listing?.parkingSpaces,
      status: (listing?.status as FormDataOutput["status"]) || "active",
      bedrooms: listing?.bedrooms || 0,
      bathrooms: listing?.bathrooms || 0,
      squareFeet: listing?.squareFeet || 0,
      yearBuilt: listing?.yearBuilt,
      street: listing?.address?.street || "",
      city: listing?.address?.city || "",
      state: listing?.address?.state || "",
      zipCode: listing?.address?.zipCode || "",
      amenities: listing?.amenities || [],
    },
  });

  const watchedPropertyType = form.watch("propertyType");
  const watchedCategory = form.watch("listingCategory");
  const showLandFields = isLandType(watchedPropertyType);
  const showVillaFields = isVillaType(watchedPropertyType);
  const showFarmlandFields = isFarmlandType(watchedPropertyType);
  const showRentFields = watchedCategory === "rent";
  const showSaleFields = watchedCategory === "sale";
  const showAirbnbFields = watchedCategory === "airbnb";
  const showServiceCharge =
    showSaleFields &&
    ["apartment", "condo", "townhouse"].includes(watchedPropertyType);
  // Handle address selection from autocomplete
  const handleAddressSelect = (address: AddressResult | null) => {
    if (address) {
      // Update form fields with parsed address
      form.setValue("street", address.street, { shouldValidate: true });
      form.setValue("city", address.city, { shouldValidate: true });
      form.setValue("state", address.state, { shouldValidate: true });
      form.setValue("zipCode", address.zipCode, { shouldValidate: true });

      // Update location for map
      setLocation({ lat: address.lat, lng: address.lng });
      setAddressDisplayValue(address.formattedAddress);
    } else {
      // Clear address fields
      form.setValue("street", "", { shouldValidate: true });
      form.setValue("city", "", { shouldValidate: true });
      form.setValue("state", "", { shouldValidate: true });
      form.setValue("zipCode", "", { shouldValidate: true });
      setLocation(undefined);
      setAddressDisplayValue("");
    }
  };

  // Sync location picker changes back (for manual adjustments)
  const handleLocationChange = (newLocation: GeoPoint) => {
    setLocation(newLocation);
  };

  const onSubmit = (data: FormDataOutput) => {
    setSubmitError(null);
    startTransition(async () => {
      try {
        // Convert images to Sanity format
        const imageRefs = images
          .filter((img) => !img.isUploading && img.assetRef)
          .map((img) => ({
            _type: "image" as const,
            _key: img.id,
            asset: {
              _type: "reference" as const,
              _ref: img.assetRef,
            },
          }));

        const isLand = isLandType(data.propertyType);
        const isVilla = isVillaType(data.propertyType);
        const isFarm = isFarmlandType(data.propertyType);
        const isRent = data.listingCategory === "rent";
        const isSale = data.listingCategory === "sale";
        const isAirbnb = data.listingCategory === "airbnb";

        const formData = {
          title: data.title,
          description: data.description,
          price: data.price,
          listingCategory: data.listingCategory,
          propertyType: data.propertyType,
          landSize: isLand ? data.landSize : undefined,
          landSizeAcres: isLand ? data.landSizeAcres : undefined,
          landPurpose: isLand ? data.landPurpose : undefined,
          furnished:
            isRent && !isLand ? data.furnished : undefined,
          depositAmount: isRent ? data.depositAmount : undefined,
          availableFrom: isRent ? data.availableFrom || undefined : undefined,
          petsAllowed: isRent && !isLand ? data.petsAllowed : undefined,
          titleDeedReady:
            isSale || isLand ? data.titleDeedReady : undefined,
          serviceCharge:
            isSale &&
            ["apartment", "condo", "townhouse"].includes(data.propertyType)
              ? data.serviceCharge
              : undefined,
          originalPrice: isSale ? data.originalPrice : undefined,
          openHouseDate: isSale
            ? data.openHouseDate || undefined
            : undefined,
          maxGuests: isAirbnb ? data.maxGuests : undefined,
          minNights: isAirbnb ? data.minNights : undefined,
          cleaningFee: isAirbnb ? data.cleaningFee : undefined,
          checkInTime: isAirbnb ? data.checkInTime || undefined : undefined,
          checkOutTime: isAirbnb ? data.checkOutTime || undefined : undefined,
          hasPool: isVilla ? data.hasPool : undefined,
          hasStaffQuarters: isVilla ? data.hasStaffQuarters : undefined,
          hasGarden: isVilla ? data.hasGarden : undefined,
          hasBackupPower: isVilla ? data.hasBackupPower : undefined,
          roadAccess: isLand ? data.roadAccess : undefined,
          fenced: isLand ? data.fenced : undefined,
          waterSource: isFarm ? data.waterSource : undefined,
          cropsSuitable: isFarm
            ? data.cropsSuitable || undefined
            : undefined,
          parkingSpaces: !isLand ? data.parkingSpaces : undefined,
          status: data.status,
          bedrooms: isLand ? 0 : data.bedrooms,
          bathrooms: isLand ? 0 : data.bathrooms,
          squareFeet: isLand ? 0 : data.squareFeet,
          yearBuilt: isLand ? undefined : data.yearBuilt,
          address: {
            street: data.street,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode || "",
          },
          location,
          amenities: data.amenities,
          images: imageRefs,
        };
        if (mode === "edit" && listing) {
          await updateListing(listing._id, formData);
          toast.success("Listing updated successfully");
          router.push("/dashboard/listings");
          router.refresh();
        } else {
          const result = await createListing(formData);
          if (!result.success) {
            setSubmitError(result.error);
            toast.error(result.error);
            return;
          }
          form.reset(emptyFormValues);
          setImages([]);
          setLocation(undefined);
          setAddressDisplayValue("");
          setSubmitError(null);
          toast.success("Listing created successfully");
          router.push("/dashboard/listings");
          router.refresh();
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save listing";
        setSubmitError(message);
        toast.error(message);
      }
    });
  };

  const getFirstErrorMessage = (errors: FieldErrors<FormDataInput>): string => {
    const errorValues = Object.values(errors);

    for (const error of errorValues) {
      if (!error) continue;

      if ("message" in error && typeof error.message === "string") {
        return error.message;
      }
    }

    return "Please fix the highlighted fields before submitting.";
  };

  const onInvalid = (errors: FieldErrors<FormDataInput>) => {
    setSubmitError(getFirstErrorMessage(errors));
  };

  // Watch for validation errors on address fields to show in autocomplete
  const addressErrors = [
    form.formState.errors.street,
    form.formState.errors.city,
    form.formState.errors.state,
    form.formState.errors.zipCode,
  ].filter(Boolean);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        {submitError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submitError}
          </div>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Beautiful 3BR Home in Downtown"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the property..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="listingCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listing Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Rent, sale, or Airbnb" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LISTING_CATEGORIES.map((category) => (
                          <SelectItem
                            key={category.value}
                            value={category.value}
                          >
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="propertyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROPERTY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchedCategory === "sale"
                      ? "Sale Price (KES)"
                      : watchedCategory === "airbnb"
                        ? "Nightly Rate (KES)"
                        : "Monthly Rent (KES)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="45000"
                      name={field.name}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      disabled={field.disabled}
                      value={String(field.value ?? "")}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showLandFields && (
              <div className="space-y-4 rounded-xl border border-border/60 bg-muted/30 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="landSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Land Size</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LAND_SIZES.map((size) => (
                              <SelectItem key={size.value} value={size.value}>
                                {size.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="landSizeAcres"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exact acres (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 2.5"
                            name={field.name}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            disabled={field.disabled}
                            value={String(field.value ?? "")}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="landPurpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Land Purpose</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Purpose" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LAND_PURPOSES.map((purpose) => (
                              <SelectItem
                                key={purpose.value}
                                value={purpose.value}
                              >
                                {purpose.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="roadAccess"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Road Access</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Access type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ROAD_ACCESS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="titleDeedReady"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-end gap-3 space-y-0 pb-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Title deed ready
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fenced"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-end gap-3 space-y-0 pb-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Fenced / bordered
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                {showFarmlandFields && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="waterSource"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Water Source</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {WATER_SOURCE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cropsSuitable"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Crops / Use Suitable</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. maize, dairy, horticulture"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            )}

            {mode === "edit" && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LISTING_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Property Images</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload
              images={images}
              onChange={setImages}
              maxImages={10}
              disabled={isPending}
            />
          </CardContent>
        </Card>

        {!showLandFields && (
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          name={field.name}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          disabled={field.disabled}
                          value={String(field.value ?? "")}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bathrooms</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          name={field.name}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          disabled={field.disabled}
                          value={String(field.value ?? "")}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="squareFeet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Square Feet</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          name={field.name}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          disabled={field.disabled}
                          value={String(field.value ?? "")}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearBuilt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year Built</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2020"
                          name={field.name}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          disabled={field.disabled}
                          value={String(field.value ?? "")}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parkingSpaces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parking Spaces</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          name={field.name}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          disabled={field.disabled}
                          value={String(field.value ?? "")}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {showRentFields && !showLandFields && (
          <Card>
            <CardHeader>
              <CardTitle>Rental Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="furnished"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Furnishing</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select furnishing" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FURNISHED_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Deposit (KES)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        disabled={field.disabled}
                        value={String(field.value ?? "")}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="availableFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="petsAllowed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-end gap-3 space-y-0 pb-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Pets allowed</FormLabel>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {showSaleFields && (
          <Card>
            <CardHeader>
              <CardTitle>Sale Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="originalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Price (if reduced)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        disabled={field.disabled}
                        value={String(field.value ?? "")}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="openHouseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Open House / Viewing</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {showServiceCharge && (
                <FormField
                  control={form.control}
                  name="serviceCharge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Charge (KES / month)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          name={field.name}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          disabled={field.disabled}
                          value={String(field.value ?? "")}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {!showLandFields && (
                <FormField
                  control={form.control}
                  name="titleDeedReady"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-end gap-3 space-y-0 pb-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Title deed ready
                      </FormLabel>
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>
        )}

        {showAirbnbFields && (
          <Card>
            <CardHeader>
              <CardTitle>Airbnb / Short Stay</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxGuests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Guests</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        disabled={field.disabled}
                        value={String(field.value ?? "")}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minNights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Nights</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        disabled={field.disabled}
                        value={String(field.value ?? "")}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cleaningFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cleaning Fee (KES)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        name={field.name}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        disabled={field.disabled}
                        value={String(field.value ?? "")}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="checkInTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="checkOutTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-out Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {showVillaFields && (
          <Card>
            <CardHeader>
              <CardTitle>Luxury Villa Features</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  ["hasPool", "Swimming pool"],
                  ["hasStaffQuarters", "Staff quarters"],
                  ["hasGarden", "Private garden"],
                  ["hasBackupPower", "Backup power (generator / solar)"],
                ] as const
              ).map(([name, label]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">{label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Amenities</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="amenities"
              render={({ field }) => (
                <FormItem>
                  {amenities.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {amenities.map((amenity) => (
                        <div
                          key={amenity._id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={amenity.value}
                            checked={field.value?.includes(amenity.value)}
                            onCheckedChange={(checked: boolean) => {
                              const currentValue = field.value || [];
                              if (checked) {
                                field.onChange([
                                  ...currentValue,
                                  amenity.value,
                                ]);
                              } else {
                                field.onChange(
                                  currentValue.filter(
                                    (v) => v !== amenity.value,
                                  ),
                                );
                              }
                            }}
                            disabled={isPending}
                          />
                          <label
                            htmlFor={amenity.value}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {amenity.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No amenities available. Add amenities in Sanity Studio.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Property Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Address Autocomplete - single input that replaces separate fields */}
            <div className="space-y-2">
              <Label>Search Address</Label>
              <AddressAutocomplete
                value={addressDisplayValue}
                onChange={handleAddressSelect}
                placeholder="Start typing an address (e.g., 123 Main St, San Francisco)"
                disabled={isPending}
              />
              {addressErrors.length > 0 && !form.getValues("street") && (
                <p className="text-sm text-destructive">
                  Please select an address from the suggestions
                </p>
              )}
            </div>

            {/* Hidden form fields - these store the actual values for submission */}
            <input type="hidden" {...form.register("street")} />
            <input type="hidden" {...form.register("city")} />
            <input type="hidden" {...form.register("state")} />
            <input type="hidden" {...form.register("zipCode")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location on Map</CardTitle>
            <p className="text-sm text-muted-foreground">
              The map updates automatically when you select an address. You can
              also click to fine-tune the exact location.
            </p>
          </CardHeader>
          <CardContent>
            <LocationPicker
              value={location}
              onChange={handleLocationChange}
              disabled={isPending}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <a href="/dashboard/listings">Cancel</a>
          </Button>
          <LoadingButton
            type="submit"
            loading={isPending}
            loadingText="Saving..."
          >
            {mode === "edit" ? "Update Listing" : "Create Listing"}
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
