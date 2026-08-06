import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  ListingCategory,
  ListingStatus,
  PropertyType,
} from "@prisma/client";
import { Type } from "class-transformer";

export class PropertyAddressDto {
  @IsString()
  street!: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsOptional()
  @IsString()
  zipCode?: string;
}

export class PropertyLocationDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;
}

export class PropertyImageDto {
  @IsString()
  _key!: string;

  @IsString()
  assetRef!: string;
}

export class CreatePropertyDto {
  @IsString()
  @MinLength(5)
  title!: string;

  @IsString()
  @MinLength(20)
  description!: string;

  @Type(() => Number)
  @IsNumber()
  price!: number;

  @IsEnum(ListingCategory)
  listingCategory!: ListingCategory;

  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @IsOptional()
  @IsString()
  landSize?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  landSizeAcres?: number;

  @IsOptional()
  @IsString()
  landPurpose?: string;

  @IsOptional()
  @IsString()
  furnished?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  depositAmount?: number;

  @IsOptional()
  @IsString()
  availableFrom?: string;

  @IsOptional()
  @IsBoolean()
  petsAllowed?: boolean;

  @IsOptional()
  @IsBoolean()
  titleDeedReady?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  serviceCharge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  originalPrice?: number;

  @IsOptional()
  @IsString()
  openHouseDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxGuests?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minNights?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cleaningFee?: number;

  @IsOptional()
  @IsString()
  checkInTime?: string;

  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @IsOptional()
  @IsBoolean()
  hasPool?: boolean;

  @IsOptional()
  @IsBoolean()
  hasStaffQuarters?: boolean;

  @IsOptional()
  @IsBoolean()
  hasGarden?: boolean;

  @IsOptional()
  @IsBoolean()
  hasBackupPower?: boolean;

  @IsOptional()
  @IsString()
  roadAccess?: string;

  @IsOptional()
  @IsBoolean()
  fenced?: boolean;

  @IsOptional()
  @IsString()
  waterSource?: string;

  @IsOptional()
  @IsString()
  cropsSuitable?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  parkingSpaces?: number;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @Type(() => Number)
  @IsNumber()
  bedrooms!: number;

  @Type(() => Number)
  @IsNumber()
  bathrooms!: number;

  @Type(() => Number)
  @IsNumber()
  squareFeet!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  yearBuilt?: number;

  @ValidateNested()
  @Type(() => PropertyAddressDto)
  address!: PropertyAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PropertyLocationDto)
  location?: PropertyLocationDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyImageDto)
  images?: PropertyImageDto[];
}

export class UpdatePropertyDto extends CreatePropertyDto {}

export class UpdatePropertyStatusDto {
  @IsEnum(ListingStatus)
  status!: ListingStatus;
}

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
