import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from "class-validator";

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

  /**
   * Phone changes must go through /users/me/phone/request-verification
   * + /users/me/phone/verify so the number is OTP-proven on this account.
   */
  @ApiPropertyOptional({
    deprecated: true,
    description: "Ignored for changes — use phone verification endpoints",
  })
  @IsOptional()
  @IsString()
  phone?: string;

  /**
   * Email changes must go through /users/me/email/request-verification
   * + /users/me/email/verify.
   */
  @ApiPropertyOptional({
    deprecated: true,
    description: "Ignored for changes — use email verification endpoints",
  })
  @IsOptional()
  @IsEmail({}, { message: "Enter a valid email address" })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class RequestPhoneVerificationDto {
  @ApiProperty({ example: "+254712345678" })
  @IsString()
  @MinLength(9)
  phone!: string;
}

export class VerifyPhoneDto {
  @ApiProperty({ example: "+254712345678" })
  @IsString()
  @MinLength(9)
  phone!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @Length(4, 8)
  code!: string;
}

export class RequestEmailVerificationDto {
  @ApiProperty({ example: "you@example.com" })
  @IsEmail({}, { message: "Enter a valid email address" })
  email!: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: "you@example.com" })
  @IsEmail({}, { message: "Enter a valid email address" })
  email!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @Length(4, 8)
  code!: string;
}
