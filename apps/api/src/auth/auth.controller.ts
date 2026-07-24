import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  LoginEmailDto,
  RefreshTokenDto,
  RegisterEmailDto,
  RequestOtpDto,
  VerifyOtpDto,
} from "./auth.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

@Controller("auth")
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post("otp/request")
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto);
  }

  @Public()
  @Post("otp/verify")
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Public()
  @Post("register")
  register(@Body() dto: RegisterEmailDto) {
    return this.auth.registerEmail(dto);
  }

  @Public()
  @Post("login")
  login(@Body() dto: LoginEmailDto) {
    return this.auth.loginEmail(dto);
  }

  @Public()
  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post("logout")
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
