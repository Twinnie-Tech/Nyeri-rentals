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
    }),
    defineField({
      name: "originalPrice",
      title: "Original Price",
      type: "number",
      description: "Original listing price (if reduced)",
      validation: (Rule) => Rule.positive(),
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
