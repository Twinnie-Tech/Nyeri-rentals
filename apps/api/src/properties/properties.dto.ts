import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import {
  ListingCategory,
  ListingStatus,
  PropertyType,
} from "@prisma/client";
import { Type } from "class-transformer";

export class UpsertPropertyMirrorDto {
  @IsString()
  sanityId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsEnum(ListingCategory)
  listingCategory!: ListingCategory;

  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bathrooms?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  county?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}

export class PropertyQueryDto {
  @IsOptional()
  @IsEnum(ListingCategory)
  listingCategory?: ListingCategory;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
