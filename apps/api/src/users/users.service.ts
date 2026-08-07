import { randomInt } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import type { MailService } from "../mail/mail.service";
import type { MessagingService } from "../messaging/messaging.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { RedisService } from "../redis/redis.service";
import type {
  CompleteOnboardingDto,
  RequestEmailVerificationDto,
  RequestPhoneVerificationDto,
  UpdateProfileDto,
  VerifyEmailDto,
  VerifyPhoneDto,
} from "./users.dto";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[\s-]/g, "");
  if (!digits) return "";
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

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private config: ConfigService,
    private mail: MailService,
    private messaging: MessagingService,
  ) {}

  private phoneLinkOtpKey(userId: string) {
    return `otp:phone-link:${userId}`;
  }

  private phoneLinkPendingKey(userId: string) {
    return `phone:link:${userId}`;
  }

  private phoneLinkRateKey(userId: string) {
    return `otp:rate:phone-link:${userId}`;
  }

  private emailLinkOtpKey(userId: string) {
    return `otp:email-link:${userId}`;
  }

  private emailLinkPendingKey(userId: string) {
    return `email:link:${userId}`;
  }

  private emailLinkRateKey(userId: string) {
    return `otp:rate:email-link:${userId}`;
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        phone: true,
        phoneVerifiedAt: true,
        emailVerifiedAt: true,
        name: true,
      },
    });
    if (!before) throw new NotFoundException("User not found");

    const phone = dto.phone?.trim() ? normalizePhone(dto.phone) : undefined;
    const email = dto.email?.trim() ? normalizeEmail(dto.email) : undefined;

    // Contacts must already be OTP-linked on this account (verify endpoints).
    if (phone && (before.phone !== phone || !before.phoneVerifiedAt)) {
      throw new BadRequestException(
        "Verify your phone number with a one-time code before completing setup.",
      );
    }
    if (email && (before.email !== email || !before.emailVerifiedAt)) {
      throw new BadRequestException(
        "Verify your email with a one-time code before completing setup.",
      );
    }
    if (!before.phone || !before.phoneVerifiedAt) {
      throw new BadRequestException(
        "Add and verify a phone number before completing setup.",
      );
    }
    if (!before.email || !before.emailVerifiedAt) {
      throw new BadRequestException(
        "Add and verify an email before completing setup.",
      );
    }

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: dto.name,
          onboardingComplete: true,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          phoneVerifiedAt: true,
          emailVerifiedAt: true,
          onboardingComplete: true,
          roles: true,
        },
      });

      return user;
    } catch (err) {
      this.rethrowUniqueConflict(err);
    }
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true },
    });

    // Phone/email changes require dedicated OTP verification endpoints.
    if (dto.phone?.trim()) {
      const incoming = normalizePhone(dto.phone);
      if (incoming && incoming !== current?.phone) {
        throw new BadRequestException(
          "Phone number must be verified with a one-time code before it is saved.",
        );
      }
    }
    if (dto.email?.trim()) {
      const incoming = normalizeEmail(dto.email);
      if (incoming && incoming !== current?.email) {
        throw new BadRequestException(
          "Email must be verified with a one-time code before it is saved.",
        );
      }
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl } : {}),
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          photoUrl: true,
          phoneVerifiedAt: true,
          emailVerifiedAt: true,
          onboardingComplete: true,
          roles: true,
        },
      });
    } catch (err) {
      this.rethrowUniqueConflict(err);
    }
  }

  /**
   * Send OTP to a new (or unverified) phone so it can be attached to this user.
   * Prevents a later phone-only sign-in from creating a second account.
   */
  async requestPhoneVerification(
    userId: string,
    dto: RequestPhoneVerificationDto,
  ) {
    const phone = normalizePhone(dto.phone || "");
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      throw new BadRequestException("Enter a valid mobile number");
    }

    await this.assertPhoneClaimable(userId, phone);

    const rate = await this.redis.incr(this.phoneLinkRateKey(userId));
    if (rate === 1) await this.redis.expire(this.phoneLinkRateKey(userId), 60);
    if (rate > 3) {
      throw new BadRequestException(
        "Too many verification requests. Try again in a minute.",
      );
    }

    const length = Number(this.config.get("OTP_LENGTH") || 6);
    const code = String(randomInt(0, 10 ** length)).padStart(length, "0");
    const ttl = Number(this.config.get("OTP_TTL_SECONDS") || 300);

    await this.redis.set(this.phoneLinkOtpKey(userId), code, ttl);
    await this.redis.set(this.phoneLinkPendingKey(userId), phone, ttl);

    const sent = await this.messaging.sendOtpPhone(phone, code, ttl);
    const previewOnly = sent.previewOnly;

    return {
      ok: true,
      phone,
      expiresIn: ttl,
      delivery: previewOnly ? "preview" : "sent",
      channels: {
        sms: Boolean(
          sent.sms &&
            sent.sms.messageId !== "failed" &&
            sent.sms.provider !== "off",
        ),
        whatsapp:
          this.messaging.isWhatsAppEnabled() &&
          Boolean(
            sent.whatsapp &&
              sent.whatsapp.provider !== "off" &&
              sent.whatsapp.messageId !== "failed",
          ),
      },
      ...(previewOnly ? { devCode: code } : {}),
    };
  }

  async verifyPhone(userId: string, dto: VerifyPhoneDto) {
    const phone = normalizePhone(dto.phone || "");
    if (!phone) {
      throw new BadRequestException("Phone is required");
    }

    const pending = await this.redis.get(this.phoneLinkPendingKey(userId));
    const stored = await this.redis.get(this.phoneLinkOtpKey(userId));

    if (!pending || !stored || pending !== phone || stored !== dto.code) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    await this.assertPhoneClaimable(userId, phone);
    await this.attachVerifiedPhone(userId, phone);

    await this.redis.del(this.phoneLinkOtpKey(userId));
    await this.redis.del(this.phoneLinkPendingKey(userId));

    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        photoUrl: true,
        phoneVerifiedAt: true,
        emailVerifiedAt: true,
        onboardingComplete: true,
        roles: true,
      },
    });
  }

  async requestEmailVerification(
    userId: string,
    dto: RequestEmailVerificationDto,
  ) {
    const email = normalizeEmail(dto.email || "");
    if (!email) {
      throw new BadRequestException("Enter a valid email address");
    }

    await this.assertEmailClaimable(userId, email);

    const rate = await this.redis.incr(this.emailLinkRateKey(userId));
    if (rate === 1) await this.redis.expire(this.emailLinkRateKey(userId), 60);
    if (rate > 3) {
      throw new BadRequestException(
        "Too many verification requests. Try again in a minute.",
      );
    }

    const length = Number(this.config.get("OTP_LENGTH") || 6);
    const code = String(randomInt(0, 10 ** length)).padStart(length, "0");
    const ttl = Number(this.config.get("OTP_TTL_SECONDS") || 300);

    await this.redis.set(this.emailLinkOtpKey(userId), code, ttl);
    await this.redis.set(this.emailLinkPendingKey(userId), email, ttl);

    const sent = await this.mail.sendOtpEmail(email, code, ttl);

    return {
      ok: true,
      email,
      expiresIn: ttl,
      delivery: sent.previewOnly ? "preview" : "sent",
      ...(sent.previewOnly ? { devCode: code } : {}),
    };
  }

  async verifyEmail(userId: string, dto: VerifyEmailDto) {
    const email = normalizeEmail(dto.email || "");
    if (!email) {
      throw new BadRequestException("Email is required");
    }

    const pending = await this.redis.get(this.emailLinkPendingKey(userId));
    const stored = await this.redis.get(this.emailLinkOtpKey(userId));

    if (!pending || !stored || pending !== email || stored !== dto.code) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    await this.assertEmailClaimable(userId, email);
    await this.attachVerifiedEmail(userId, email);

    await this.redis.del(this.emailLinkOtpKey(userId));
    await this.redis.del(this.emailLinkPendingKey(userId));

    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        photoUrl: true,
        phoneVerifiedAt: true,
        emailVerifiedAt: true,
        onboardingComplete: true,
        roles: true,
      },
    });
  }

  /**
   * Phone is free, already ours, or only held by a phone-only stub we can reclaim.
   */
  private async assertPhoneClaimable(userId: string, phone: string) {
    const existing = await this.prisma.user.findUnique({
      where: { phone },
      include: { agent: { select: { id: true } } },
    });
    if (!existing || existing.id === userId) return;

    const isPhoneOnlyStub =
      !existing.email && !existing.passwordHash && !existing.agent;

    if (!isPhoneOnlyStub) {
      throw new ConflictException(
        existing.onboardingComplete
          ? "This phone number already belongs to another account. Sign in with that number instead."
          : "This phone number is already registered. Please use a different number.",
      );
    }
  }

  private async attachVerifiedPhone(userId: string, phone: string) {
    const existing = await this.prisma.user.findUnique({
      where: { phone },
      include: { agent: { select: { id: true } } },
    });

    if (existing && existing.id !== userId) {
      const isPhoneOnlyStub =
        !existing.email && !existing.passwordHash && !existing.agent;
      if (!isPhoneOnlyStub) {
        throw new ConflictException(
          existing.onboardingComplete
            ? "This phone number already belongs to another account. Sign in with that number instead."
            : "This phone number is already registered. Please use a different number.",
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (existing && existing.id !== userId) {
        await tx.user.update({
          where: { id: existing.id },
          data: { phone: null, phoneVerifiedAt: null },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          phone,
          phoneVerifiedAt: new Date(),
        },
      });
    });

    await this.maybeCompleteOnboarding(userId);
  }

  private async assertEmailClaimable(userId: string, email: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      include: { agent: { select: { id: true } } },
    });
    if (!existing || existing.id === userId) return;

    const isEmailOnlyStub =
      !existing.phone && !existing.passwordHash && !existing.agent;

    if (!isEmailOnlyStub) {
      throw new ConflictException(
        existing.onboardingComplete
          ? "This email already belongs to another account. Sign in with that email instead."
          : "This email is already registered. Please use a different email.",
      );
    }
  }

  private async attachVerifiedEmail(userId: string, email: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      include: { agent: { select: { id: true } } },
    });

    if (existing && existing.id !== userId) {
      const isEmailOnlyStub =
        !existing.phone && !existing.passwordHash && !existing.agent;
      if (!isEmailOnlyStub) {
        throw new ConflictException(
          existing.onboardingComplete
            ? "This email already belongs to another account. Sign in with that email instead."
            : "This email is already registered. Please use a different email.",
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (existing && existing.id !== userId) {
        await tx.user.update({
          where: { id: existing.id },
          data: { email: null, emailVerifiedAt: null },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          email,
          emailVerifiedAt: new Date(),
        },
      });
    });

    await this.maybeCompleteOnboarding(userId);
  }

  /** If name + verified phone + verified email are all present, finish onboarding. */
  private async maybeCompleteOnboarding(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        phone: true,
        email: true,
        phoneVerifiedAt: true,
        emailVerifiedAt: true,
        onboardingComplete: true,
      },
    });
    if (!user || user.onboardingComplete) return;
    if (
      user.name?.trim() &&
      user.phone &&
      user.phoneVerifiedAt &&
      user.email &&
      user.emailVerifiedAt
    ) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { onboardingComplete: true },
      });
    }
  }

  private rethrowUniqueConflict(err: unknown): never {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const target = (err.meta?.target as string[] | undefined) || [];
      if (target.includes("email")) {
        throw new ConflictException(
          "This email is already registered. Please use a different email.",
        );
      }
      if (target.includes("phone")) {
        throw new ConflictException(
          "This phone number is already registered. Please use a different number.",
        );
      }
    }
    if (
      err instanceof ConflictException ||
      err instanceof BadRequestException ||
      err instanceof NotFoundException
    ) {
      throw err;
    }
    throw err;
  }

  async listSaved(userId: string, page?: number, limit?: number) {
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(100, Math.max(1, limit || 20));
    const skip = (safePage - 1) * safeLimit;
    const where = { userId };
    const [items, total] = await Promise.all([
      this.prisma.savedListing.findMany({
        where,
        include: { property: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
      this.prisma.savedListing.count({ where }),
    ]);
    return {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async saveListing(userId: string, propertyId: string) {
    let property =
      (await this.prisma.propertyMirror.findUnique({
        where: { id: propertyId },
      })) ||
      (await this.prisma.propertyMirror.findUnique({
        where: { sanityId: propertyId },
      }));

    if (!property) {
      property = await this.prisma.propertyMirror.create({
        data: {
          sanityId: propertyId,
          title: "Saved listing",
          listingCategory: "rent",
          propertyType: "house",
          status: "active",
        },
      });
    }

    return this.prisma.savedListing.upsert({
      where: {
        userId_propertyId: { userId, propertyId: property.id },
      },
      create: { userId, propertyId: property.id },
      update: {},
    });
  }

  async unsaveListing(userId: string, propertyId: string) {
    const property =
      (await this.prisma.propertyMirror.findUnique({
        where: { id: propertyId },
      })) ||
      (await this.prisma.propertyMirror.findUnique({
        where: { sanityId: propertyId },
      }));
    if (!property) throw new NotFoundException("Property not found");

    try {
      await this.prisma.savedListing.delete({
        where: {
          userId_propertyId: { userId, propertyId: property.id },
        },
      });
    } catch {
      throw new BadRequestException("Listing was not saved");
    }
    return { ok: true };
  }
}
