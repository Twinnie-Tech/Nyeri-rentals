import { IsOptional, IsString, Matches } from "class-validator";

const PHONE_RE = /^(\+254|0)[17]\d{8}$/;

export class StkPushDto {
  @IsString()
  @Matches(PHONE_RE, {
    message: "Phone must be a valid Kenyan mobile (+2547… or 07…)",
  })
  phone!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class BankTransferDto {
  @IsString()
  bankReference!: string;

  @IsOptional()
  @IsString()
  bankProofUrl?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
