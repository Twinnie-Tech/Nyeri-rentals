import { defineField, defineType } from "sanity";

export const property = defineType({
  name: "property",
  title: "Property",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "price",
      title: "Price (KES)",
      type: "number",
      description:
        "Monthly rent, sale price, or nightly Airbnb rate depending on listing category",
      validation: (Rule) => Rule.required().positive(),
    }),
    defineField({
      name: "listingCategory",
      title: "Listing Category",
      type: "string",
      options: {
        list: [
          { title: "For Rent", value: "rent" },
          { title: "For Sale", value: "sale" },
          { title: "Airbnb / Short stay", value: "airbnb" },
        ],
        layout: "radio",
      },
      initialValue: "rent",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "propertyType",
      title: "Property Type",
      type: "string",
      options: {
        list: [
          { title: "House", value: "house" },
          { title: "Apartment", value: "apartment" },
          { title: "Bedsitter", value: "bedsitter" },
          { title: "Condo", value: "condo" },
          { title: "Townhouse", value: "townhouse" },
          { title: "Villa", value: "villa" },
          { title: "Plot / Land", value: "land" },
          { title: "Farmland", value: "farmland" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "landSize",
      title: "Land Size",
      type: "string",
      options: {
        list: [
          { title: "1/4 acre", value: "quarter_acre" },
          { title: "1/2 acre", value: "half_acre" },
          { title: "1 acre", value: "one_acre" },
          { title: "Multiple acres", value: "multi_acre" },
          { title: "Custom size", value: "custom" },
        ],
      },
      hidden: ({ document }) =>
        !["land", "farmland"].includes(String(document?.propertyType || "")),
    }),
    defineField({
      name: "landSizeAcres",
      title: "Exact Size (acres)",
      type: "number",
      description: "Optional exact acreage (e.g. 2.5)",
      validation: (Rule) => Rule.min(0),
      hidden: ({ document }) =>
        !["land", "farmland"].includes(String(document?.propertyType || "")),
    }),
    defineField({
      name: "landPurpose",
      title: "Land Purpose",
      type: "string",
      options: {
        list: [
          { title: "Residential", value: "residential" },
          { title: "Commercial", value: "commercial" },
          { title: "Agricultural / Farming", value: "agricultural" },
        ],
      },
      hidden: ({ document }) =>
        !["land", "farmland"].includes(String(document?.propertyType || "")),
    }),
    // --- Rent-specific ---
    defineField({
      name: "furnished",
      title: "Furnishing",
      type: "string",
      options: {
        list: [
          { title: "Unfurnished", value: "unfurnished" },
          { title: "Semi-furnished", value: "semi_furnished" },
          { title: "Fully furnished", value: "furnished" },
        ],
      },
      hidden: ({ document }) =>
        document?.listingCategory !== "rent" ||
        ["land", "farmland"].includes(String(document?.propertyType || "")),
    }),
    defineField({
      name: "depositAmount",
      title: "Security Deposit (KES)",
      type: "number",
      validation: (Rule) => Rule.min(0),
      hidden: ({ document }) => document?.listingCategory !== "rent",
    }),
    defineField({
      name: "availableFrom",
      title: "Available From",
      type: "date",
      hidden: ({ document }) => document?.listingCategory !== "rent",
    }),
    defineField({
      name: "petsAllowed",
      title: "Pets Allowed",
      type: "boolean",
      initialValue: false,
      hidden: ({ document }) =>
        document?.listingCategory !== "rent" ||
        ["land", "farmland"].includes(String(document?.propertyType || "")),
    }),
    // --- Sale-specific ---
    defineField({
      name: "titleDeedReady",
      title: "Title Deed Ready",
      type: "boolean",
      initialValue: false,
      hidden: ({ document }) =>
        document?.listingCategory !== "sale" &&
        !["land", "farmland"].includes(String(document?.propertyType || "")),
    }),
    defineField({
      name: "serviceCharge",
      title: "Service Charge (KES / month)",
      type: "number",
      validation: (Rule) => Rule.min(0),
      hidden: ({ document }) =>
        document?.listingCategory !== "sale" ||
        !["apartment", "condo", "townhouse"].includes(
          String(document?.propertyType || ""),
        ),
    }),
    // --- Airbnb / short stay ---
    defineField({
      name: "maxGuests",
      title: "Max Guests",
      type: "number",
      validation: (Rule) => Rule.min(1),
      hidden: ({ document }) => document?.listingCategory !== "airbnb",
    }),
    defineField({
      name: "minNights",
      title: "Minimum Nights",
      type: "number",
      validation: (Rule) => Rule.min(1),
      hidden: ({ document }) => document?.listingCategory !== "airbnb",
    }),
    defineField({
      name: "cleaningFee",
      title: "Cleaning Fee (KES)",
      type: "number",
      validation: (Rule) => Rule.min(0),
      hidden: ({ document }) => document?.listingCategory !== "airbnb",
    }),
    defineField({
      name: "checkInTime",
      title: "Check-in Time",
      type: "string",
      description: "e.g. 14:00",
      hidden: ({ document }) => document?.listingCategory !== "airbnb",
    }),
    defineField({
      name: "checkOutTime",
      title: "Check-out Time",
      type: "string",
      description: "e.g. 10:00",
      hidden: ({ document }) => document?.listingCategory !== "airbnb",
    }),
    // --- Villa / luxury ---
    defineField({
      name: "hasPool",
      title: "Swimming Pool",
      type: "boolean",
      initialValue: false,
      hidden: ({ document }) => document?.propertyType !== "villa",
    }),
    defineField({
      name: "hasStaffQuarters",
      title: "Staff Quarters",
      type: "boolean",
      initialValue: false,
      hidden: ({ document }) => document?.propertyType !== "villa",
    }),
    defineField({
      name: "hasGarden",
      title: "Private Garden",
      type: "boolean",
      initialValue: false,
      hidden: ({ document }) => document?.propertyType !== "villa",
    }),
    defineField({
      name: "hasBackupPower",
      title: "Backup Power (generator / solar)",
      type: "boolean",
      initialValue: false,
      hidden: ({ document }) => document?.propertyType !== "villa",
    }),
    // --- Land / farmland extras ---
    defineField({
      name: "roadAccess",
      title: "Road Access",
      type: "string",
      options: {
        list: [
          { title: "Tarmac / paved", value: "tarmac" },
          { title: "Murram / gravel", value: "murram" },
          { title: "Footpath only", value: "footpath" },
          { title: "No road access", value: "none" },
        ],
      },
      hidden: ({ document }) =>
        !["land", "farmland"].includes(String(document?.propertyType || "")),
    }),
    defineField({
      name: "fenced",
      title: "Fenced / Bordered",
      type: "boolean",
      initialValue: false,
      hidden: ({ document }) =>
        !["land", "farmland"].includes(String(document?.propertyType || "")),
    }),
    defineField({
      name: "waterSource",
      title: "Water Source",
      type: "string",
      options: {
        list: [
          { title: "Borehole", value: "borehole" },
          { title: "River / stream", value: "river" },
          { title: "Piped water", value: "piped" },
          { title: "Rain harvest", value: "rain" },
          { title: "None / unknown", value: "none" },
        ],
      },
      hidden: ({ document }) => document?.propertyType !== "farmland",
    }),
    defineField({
      name: "cropsSuitable",
      title: "Crops / Use Suitable",
      type: "string",
      description: "e.g. maize, dairy, horticulture",
      hidden: ({ document }) => document?.propertyType !== "farmland",
    }),
    defineField({
      name: "parkingSpaces",
      title: "Parking Spaces",
      type: "number",
      validation: (Rule) => Rule.min(0),
      hidden: ({ document }) =>
        ["land", "farmland"].includes(String(document?.propertyType || "")),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Active", value: "active" },
          { title: "Pending", value: "pending" },
          { title: "Sold", value: "sold" },
          { title: "Rented", value: "rented" },
        ],
      },
      initialValue: "active",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "bedrooms",
      title: "Bedrooms",
      type: "number",
      validation: (Rule) => Rule.min(0),
      hidden: ({ document }) =>
        ["land", "farmland"].includes(String(document?.propertyType || "")),
    }),
    defineField({
      name: "bathrooms",
      title: "Bathrooms",
      type: "number",
      validation: (Rule) => Rule.min(0),
      hidden: ({ document }) =>
        ["land", "farmland"].includes(String(document?.propertyType || "")),
    }),
    defineField({
      name: "squareFeet",
      title: "Square Feet",
      type: "number",
      validation: (Rule) => Rule.min(0),
      hidden: ({ document }) =>
        ["land", "farmland"].includes(String(document?.propertyType || "")),
    }),
    defineField({
      name: "yearBuilt",
      title: "Year Built",
      type: "number",
      validation: (Rule) => Rule.min(1800).max(new Date().getFullYear()),
      hidden: ({ document }) =>
        ["land", "farmland"].includes(String(document?.propertyType || "")),
    }),
    defineField({
      name: "address",
      title: "Address",
      type: "object",
      fields: [
        defineField({
          name: "street",
          title: "Street",
          type: "string",
        }),
        defineField({
          name: "city",
          title: "City / Town",
          type: "string",
        }),
        defineField({
          name: "state",
          title: "County / Area",
          type: "string",
        }),
        defineField({
          name: "zipCode",
          title: "Postal Code",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "geopoint",
      description: "Map location for property",
    }),
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      of: [
        {
          type: "image",
          options: {
            hotspot: true,
          },
          fields: [
            defineField({
              name: "alt",
              title: "Alt Text",
              type: "string",
            }),
          ],
        },
      ],
    }),
    defineField({
      name: "amenities",
      title: "Amenities",
      type: "array",
      of: [{ type: "string" }],
      description: "Amenity values are managed in the Amenities collection",
    }),
    defineField({
      name: "agent",
      title: "Agent",
      type: "reference",
      to: [{ type: "agent" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "lotSize",
      title: "Lot Size (sq ft)",
      type: "number",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "openHouseDate",
      title: "Open House / Viewing Date",
      type: "datetime",
      description: "Scheduled viewing date/time (if any)",
      hidden: ({ document }) => document?.listingCategory !== "sale",
    }),
    defineField({
      name: "originalPrice",
      title: "Original Price",
      type: "number",
      description: "Original listing price (if reduced)",
      validation: (Rule) => Rule.positive(),
      hidden: ({ document }) => document?.listingCategory !== "sale",
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "updatedAt",
      title: "Updated At",
      type: "datetime",
    }),
  ],
  preview: {
    select: {
      title: "title",
      price: "price",
      status: "status",
      category: "listingCategory",
      type: "propertyType",
      media: "images.0",
    },
    prepare({ title, price, status, category, type, media }) {
      return {
        title,
        subtitle: `KES ${price?.toLocaleString()} · ${category || "listing"} · ${type || ""} · ${status}`,
        media,
      };
    },
  },
});
