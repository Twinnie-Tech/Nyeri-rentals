import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CompleteOnboardingDto, UpdateProfileDto } from "./users.dto";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";

@ApiTags("users")
@ApiBearerAuth("JWT")
@Controller("users")
export class UsersController {
  constructor(private users: UsersService) {}

  @Post("onboarding")
  @ApiOperation({ summary: "Complete user onboarding" })
  completeOnboarding(
    @CurrentUser() user: AuthUser,
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.users.completeOnboarding(user.id, dto);
  }

  @Patch("me")
  @ApiOperation({ summary: "Update profile (name, email, phone)" })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Get("me/saved")
  @ApiOperation({ summary: "List saved properties" })
  listSaved(@CurrentUser() user: AuthUser) {
    return this.users.listSaved(user.id);
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
