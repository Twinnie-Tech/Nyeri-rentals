import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomInt, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import {
  LoginEmailDto,
  RegisterEmailDto,
  RequestOtpDto,
  VerifyOtpDto,
} from "./auth.dto";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[\s-]/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }
  if (digits.startsWith("254") && !digits.startsWith("+")) {
    return `+${digits}`;
  }
  if (!digits.startsWith("+") && /^\d+$/.test(digits)) {
    return `+${digits}`;
  }
  return digits;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseTtlMs(ttl: string): number {
  const m = ttl.match(/^(\d+)([smhd])$/i);
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  if (u === "s") return n * 1000;
  if (u === "m") return n * 60 * 1000;
  if (u === "h") return n * 60 * 60 * 1000;
  return n * 24 * 60 * 60 * 1000;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private otpKey(channel: "phone" | "email", target: string) {
    return `otp:${channel}:${target}`;
  }

  private rateKey(channel: "phone" | "email", target: string) {
    return `otp:rate:${channel}:${target}`;
  }

  async requestOtp(dto: RequestOtpDto) {
    const channel = dto.channel;
    const target =
      channel === "phone"
        ? normalizePhone(dto.phone || "")
        : normalizeEmail(dto.email || "");

    if (!target) {
      throw new BadRequestException(
        channel === "phone" ? "Phone is required" : "Email is required",
      );
    }

    const rate = await this.redis.incr(this.rateKey(channel, target));
    if (rate === 1) await this.redis.expire(this.rateKey(channel, target), 60);
    if (rate > 3) {
      throw new BadRequestException(
        "Too many OTP requests. Try again in a minute.",
      );
    }

    const length = Number(this.config.get("OTP_LENGTH") || 6);
    const code = String(randomInt(0, 10 ** length)).padStart(length, "0");
    const ttl = Number(this.config.get("OTP_TTL_SECONDS") || 300);
    await this.redis.set(this.otpKey(channel, target), code, ttl);

    const smsProvider = this.config.get("SMS_PROVIDER") || "console";
    const emailProvider = this.config.get("EMAIL_PROVIDER") || "console";
    const isDev =
      (channel === "phone" && smsProvider === "console") ||
      (channel === "email" && emailProvider === "console");

    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(`[OTP:${channel}] ${target} => ${code} (expires in ${ttl}s)`);
    }

    return {
      ok: true,
      channel,
      ...(channel === "phone" ? { phone: target } : { email: target }),
      expiresIn: ttl,
      ...(isDev ? { devCode: code } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const channel = dto.channel;
    const target =
      channel === "phone"
        ? normalizePhone(dto.phone || "")
        : normalizeEmail(dto.email || "");

    const stored = await this.redis.get(this.otpKey(channel, target));
    if (!stored || stored !== dto.code) {
      throw new UnauthorizedException("Invalid or expired OTP");
    }
    await this.redis.del(this.otpKey(channel, target));

    if (channel === "phone") {
      return this.verifyPhoneOtp(target, dto.name);
    }
    return this.verifyEmailOtp(target, dto.name);
  }

  private async verifyPhoneOtp(phone: string, name?: string) {
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          name,
          phoneVerifiedAt: new Date(),
          roles: [Role.USER],
        },
      });
      await this.prisma.subscription.create({ data: { userId: user.id } });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          phoneVerifiedAt: new Date(),
          ...(name && !user.name ? { name } : {}),
        },
      });
    }
    return this.issueTokens(user.id, user.phone);
  }

  private async verifyEmailOtp(email: string, name?: string) {
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          emailVerifiedAt: new Date(),
          roles: [Role.USER],
        },
      });
      await this.prisma.subscription.create({ data: { userId: user.id } });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date(),
          ...(name && !user.name ? { name } : {}),
        },
      });
    }
    return this.issueTokens(user.id, user.phone);
  }

  async registerEmail(dto: RegisterEmailDto) {
    const email = normalizeEmail(dto.email);
    const phone = dto.phone ? normalizePhone(dto.phone) : undefined;
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
    });
    if (existing) {
      throw new BadRequestException("Email or phone already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        phone,
        email,
        passwordHash,
        name: dto.name,
        roles: [Role.USER],
      },
    });
    await this.prisma.subscription.create({ data: { userId: user.id } });
    return this.issueTokens(user.id, user.phone);
  }

  async loginEmail(dto: LoginEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return this.issueTokens(user.id, user.phone);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token revoked or expired");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException("User not found");
    return this.issueTokens(user.id, user.phone);
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        agent: true,
        subscription: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  private async issueTokens(userId: string, phone: string | null) {
    const accessTtl = this.config.get<string>("JWT_ACCESS_TTL") || "15m";
    const refreshTtl = this.config.get<string>("JWT_REFRESH_TTL") || "30d";

    const accessToken = await this.jwt.signAsync(
      { sub: userId, phone },
      {
        secret: this.config.get("JWT_ACCESS_SECRET"),
        expiresIn: accessTtl as `${number}${"s" | "m" | "h" | "d"}`,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: userId, phone, jti: randomBytes(8).toString("hex") },
      {
        secret: this.config.get("JWT_REFRESH_SECRET"),
        expiresIn: refreshTtl as `${number}${"s" | "m" | "h" | "d"}`,
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + parseTtlMs(refreshTtl)),
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        roles: true,
        onboardingComplete: true,
      },
    });

    return { accessToken, refreshToken, user };
  }
}
