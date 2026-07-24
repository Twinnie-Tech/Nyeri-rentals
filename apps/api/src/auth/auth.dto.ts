import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from "class-validator";

/** E.164-ish mobile: +2547… / 07… and common regional formats */
const PHONE_RE = /^(\+\d{1,3}|0)[1-9]\d{7,12}$/;

export class RequestOtpDto {
  @IsIn(["phone", "email"])
  channel!: "phone" | "email";

  @ValidateIf((o: RequestOtpDto) => o.channel === "phone")
  @IsString()
  @Matches(PHONE_RE, {
    message: "Enter a valid mobile number with country code",
  })
  phone?: string;

  @ValidateIf((o: RequestOtpDto) => o.channel === "email")
  @IsEmail({}, { message: "Enter a valid email address" })
  email?: string;
}

export class VerifyOtpDto {
  @IsIn(["phone", "email"])
  channel!: "phone" | "email";

  @ValidateIf((o: VerifyOtpDto) => o.channel === "phone")
  @IsString()
  @Matches(PHONE_RE)
  phone?: string;

  @ValidateIf((o: VerifyOtpDto) => o.channel === "email")
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(4)
  code!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class RegisterEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_RE)
  phone?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class LoginEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
