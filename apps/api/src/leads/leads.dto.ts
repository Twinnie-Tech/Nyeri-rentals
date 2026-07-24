import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { LeadStatus } from "@prisma/client";

export class CreateLeadDto {
  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  status!: LeadStatus;
}
