import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  type AuthUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import {
  LoginEmailDto,
  RefreshTokenDto,
  RegisterEmailDto,
  RequestOtpDto,
  VerifyOtpDto,
} from "./auth.dto";
import { AuthService } from "./auth.service";

@ApiTags("auth")
@Controller("auth")
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post("otp/request")
  @ApiOperation({ summary: "Request OTP via phone SMS or email" })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto);
  }

  @Public()
  @Post("otp/verify")
  @ApiOperation({ summary: "Verify OTP and receive JWT tokens" })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Register with email + password" })
  register(@Body() dto: RegisterEmailDto) {
    return this.auth.registerEmail(dto);
  }

  @Public()
  @Post("login")
  @ApiOperation({ summary: "Login with email + password" })
  login(@Body() dto: LoginEmailDto) {
    return this.auth.loginEmail(dto);
  }

  @Public()
  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token" })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post("logout")
  @ApiOperation({ summary: "Revoke refresh token" })
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Get("me")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Current user profile + subscription" })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
