import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CompleteOnboardingDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: "Enter a valid email address" })
  email?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: "Enter a valid email address" })
  email?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
