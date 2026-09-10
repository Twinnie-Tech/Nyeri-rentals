import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  type AuthUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import {
  CompleteOnboardingDto,
  RequestEmailVerificationDto,
  RequestPhoneVerificationDto,
  UpdateProfileDto,
  VerifyEmailDto,
  VerifyPhoneDto,
} from "./users.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth("JWT")
@Controller("users")
export class UsersController {
  constructor(private users: UsersService) {}

  @Post("onboarding")
  @ApiOperation({
    summary: "Complete user onboarding (requires verified phone + email)",
  })
  completeOnboarding(
    @CurrentUser() user: AuthUser,
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.users.completeOnboarding(user.id, dto);
  }

  @Patch("me")
  @ApiOperation({
    summary:
      "Update profile (name). Phone/email require OTP verification endpoints.",
  })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Post("me/phone/request-verification")
  @ApiOperation({
    summary:
      "Send OTP to verify and attach a phone number to the signed-in account",
  })
  requestPhoneVerification(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestPhoneVerificationDto,
  ) {
    return this.users.requestPhoneVerification(user.id, dto);
  }

  @Post("me/phone/verify")
  @ApiOperation({
    summary:
      "Verify OTP and link the phone to this account (sets phoneVerifiedAt)",
  })
  verifyPhone(@CurrentUser() user: AuthUser, @Body() dto: VerifyPhoneDto) {
    return this.users.verifyPhone(user.id, dto);
  }

  @Post("me/email/request-verification")
  @ApiOperation({
    summary: "Send OTP to verify and attach an email to the signed-in account",
  })
  requestEmailVerification(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestEmailVerificationDto,
  ) {
    return this.users.requestEmailVerification(user.id, dto);
  }

  @Post("me/email/verify")
  @ApiOperation({
    summary:
      "Verify OTP and link the email to this account (sets emailVerifiedAt)",
  })
  verifyEmail(@CurrentUser() user: AuthUser, @Body() dto: VerifyEmailDto) {
    return this.users.verifyEmail(user.id, dto);
  }

  @Get("me/saved")
  @ApiOperation({ summary: "List saved properties (paginated)" })
  listSaved(
    @CurrentUser() user: AuthUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.users.listSaved(
      user.id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Post("me/saved/:propertyId")
  @ApiOperation({ summary: "Save a property (id or Sanity id)" })
  save(@CurrentUser() user: AuthUser, @Param("propertyId") propertyId: string) {
    return this.users.saveListing(user.id, propertyId);
  }

  @Delete("me/saved/:propertyId")
  @ApiOperation({ summary: "Remove a saved property" })
  unsave(
    @CurrentUser() user: AuthUser,
    @Param("propertyId") propertyId: string,
  ) {
    return this.users.unsaveListing(user.id, propertyId);
  }
}
