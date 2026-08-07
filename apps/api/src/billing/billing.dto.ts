import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches } from "class-validator";

const PHONE_RE = /^(\+254|0)[17]\d{8}$/;

export class StkPushDto {
  @ApiProperty({ example: "0712345678" })
  @IsString()
  @Matches(PHONE_RE, {
    message: "Phone must be a valid Kenyan mobile (+2547… or 07…)",
  })
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class BankTransferDto {
  @ApiProperty({ example: "GT123456" })
  @IsString()
  bankReference!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankProofUrl?: string;

  @ApiPropertyOptional({ example: "0712345678" })
  @IsOptional()
  @IsString()
  phone?: string;
}
