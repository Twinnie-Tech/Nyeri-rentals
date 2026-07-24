import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Role, PaymentStatus, PaymentMethod } from "@prisma/client";
import { IsBoolean } from "class-validator";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { BillingService } from "../billing/billing.service";

class VerifyBankDto {
  @IsBoolean()
  approve!: boolean;
}

@Controller("admin")
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private billing: BillingService,
  ) {}

  @Get("payments/pending")
  pendingPayments() {
    return this.prisma.payment.findMany({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
        method: PaymentMethod.BANK,
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });
  }

  @Post("payments/:id/verify")
  verify(
    @CurrentUser() admin: AuthUser,
    @Param("id") id: string,
    @Body() dto: VerifyBankDto,
  ) {
    return this.billing.verifyBankPayment(admin.id, id, dto.approve);
  }

  @Get("users")
  users() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        roles: true,
        onboardingComplete: true,
        createdAt: true,
        subscription: true,
      },
    });
  }
}
