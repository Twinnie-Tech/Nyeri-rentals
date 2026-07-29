import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { MessagingService } from "../messaging/messaging.service";
import { CompleteOnboardingDto, UpdateProfileDto } from "./users.dto";

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
    private mail: MailService,
    private messaging: MessagingService,
  ) {}

  private async assertPhoneAvailable(userId: string, phone: string) {
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing && existing.id !== userId) {
      throw new ConflictException(
        "This phone number is already registered. Please use a different number.",
      );
    }
  }

  private async assertEmailAvailable(userId: string, email: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      throw new ConflictException(
        "This email is already registered. Please use a different email.",
      );
    }
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const phone = dto.phone?.trim() ? normalizePhone(dto.phone) : undefined;
    const email = dto.email?.trim() ? normalizeEmail(dto.email) : undefined;

    if (phone) await this.assertPhoneAvailable(userId, phone);
    if (email) await this.assertEmailAvailable(userId, email);

    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: dto.name,
          ...(phone ? { phone } : {}),
          ...(email ? { email } : {}),
          onboardingComplete: true,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          onboardingComplete: true,
          roles: true,
        },
      });

      // First time this contact channel is added during onboarding
      if (email && !before?.email) {
        void this.mail.sendWelcomeEmail(email, user.name).catch((err) => {
          // eslint-disable-next-line no-console
          console.error(
            `[welcome email] failed for ${email}`,
            err instanceof Error ? err.message : err,
          );
        });
      }
      if (phone && !before?.phone) {
        void this.messaging.sendWelcomePhone(phone, user.name).catch((err) => {
          // eslint-disable-next-line no-console
          console.error(
            `[welcome sms/whatsapp] failed for ${phone}`,
            err instanceof Error ? err.message : err,
          );
        });
      }

      return user;
    } catch (err) {
      this.rethrowUniqueConflict(err);
    }
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const phone =
      dto.phone !== undefined
        ? dto.phone.trim()
          ? normalizePhone(dto.phone)
          : null
        : undefined;
    const email =
      dto.email !== undefined
        ? dto.email.trim()
          ? normalizeEmail(dto.email)
          : null
        : undefined;

    if (phone) await this.assertPhoneAvailable(userId, phone);
    if (email) await this.assertEmailAvailable(userId, email);

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl } : {}),
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          photoUrl: true,
          onboardingComplete: true,
          roles: true,
        },
      });
    } catch (err) {
      this.rethrowUniqueConflict(err);
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

  async listSaved(userId: string) {
    return this.prisma.savedListing.findMany({
      where: { userId },
      include: { property: true },
      orderBy: { createdAt: "desc" },
    });
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
