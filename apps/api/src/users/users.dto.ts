import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CompleteOnboardingDto {
  @ApiProperty({ example: "Jane Doe" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: "+254712345678" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "you@example.com" })
  @IsOptional()
  @IsEmail({}, { message: "Enter a valid email address" })
  email?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: "Enter a valid email address" })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;
}
