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
  isLandType,
  LAND_PURPOSES,
  LAND_SIZES,
  LISTING_CATEGORIES,
  LISTING_STATUSES,
  PROPERTY_TYPES,
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

        const formData = {
          title: data.title,
          description: data.description,
          price: data.price,
          listingCategory: data.listingCategory,
          propertyType: data.propertyType,
          landSize: isLandType(data.propertyType) ? data.landSize : undefined,
          landSizeAcres: isLandType(data.propertyType)
            ? data.landSizeAcres
            : undefined,
          landPurpose: isLandType(data.propertyType)
            ? data.landPurpose
            : undefined,
          status: data.status,
          bedrooms: isLandType(data.propertyType) ? 0 : data.bedrooms,
          bathrooms: isLandType(data.propertyType) ? 0 : data.bathrooms,
          squareFeet: isLandType(data.propertyType) ? 0 : data.squareFeet,
          yearBuilt: isLandType(data.propertyType) ? undefined : data.yearBuilt,
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
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
            </div>
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
