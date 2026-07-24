import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CompleteOnboardingDto, UpdateProfileDto } from "./users.dto";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";

@Controller("users")
export class UsersController {
  constructor(private users: UsersService) {}

  @Post("onboarding")
  completeOnboarding(
    @CurrentUser() user: AuthUser,
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.users.completeOnboarding(user.id, dto);
  }

  @Patch("me")
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Get("me/saved")
  listSaved(@CurrentUser() user: AuthUser) {
    return this.users.listSaved(user.id);
  }

  @Post("me/saved/:propertyId")
  save(@CurrentUser() user: AuthUser, @Param("propertyId") propertyId: string) {
    return this.users.saveListing(user.id, propertyId);
  }

  @Delete("me/saved/:propertyId")
  unsave(
    @CurrentUser() user: AuthUser,
    @Param("propertyId") propertyId: string,
  ) {
    return this.users.unsaveListing(user.id, propertyId);
  }
}
