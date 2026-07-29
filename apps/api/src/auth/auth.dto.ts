import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** E.164-ish mobile: +2547… / 07… and common regional formats */
const PHONE_RE = /^(\+\d{1,3}|0)[1-9]\d{7,12}$/;

export class RequestOtpDto {
  @ApiProperty({ enum: ["phone", "email"], example: "phone" })
  @IsIn(["phone", "email"])
  channel!: "phone" | "email";

  @ApiPropertyOptional({ example: "+254712345678" })
  @ValidateIf((o: RequestOtpDto) => o.channel === "phone")
  @IsString()
  @Matches(PHONE_RE, {
    message: "Enter a valid mobile number with country code",
  })
  phone?: string;

  @ApiPropertyOptional({ example: "you@example.com" })
  @ValidateIf((o: RequestOtpDto) => o.channel === "email")
  @IsEmail({}, { message: "Enter a valid email address" })
  email?: string;
}

export class VerifyOtpDto {
  @ApiProperty({ enum: ["phone", "email"], example: "phone" })
  @IsIn(["phone", "email"])
  channel!: "phone" | "email";

  @ApiPropertyOptional({ example: "+254712345678" })
  @ValidateIf((o: VerifyOtpDto) => o.channel === "phone")
  @IsString()
  @Matches(PHONE_RE)
  phone?: string;

  @ApiPropertyOptional({ example: "you@example.com" })
  @ValidateIf((o: VerifyOtpDto) => o.channel === "email")
  @IsEmail()
  email?: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @MinLength(4)
  code!: string;

  @ApiPropertyOptional({ example: "Jane Doe" })
  @IsOptional()
  @IsString()
  name?: string;
}

export class RegisterEmailDto {
  @ApiProperty({ example: "you@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, example: "password123" })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: "+254712345678" })
  @IsOptional()
  @IsString()
  @Matches(PHONE_RE)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

export class LoginEmailDto {
  @ApiProperty({ example: "you@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}
