import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import { PaymentMethod, PaymentStatus, Role } from "@prisma/client";
import { IsBoolean } from "class-validator";
import type { BillingService } from "../billing/billing.service";
import {
  type AuthUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import type { PrismaService } from "../prisma/prisma.service";

class VerifyBankDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  approve!: boolean;
}

@ApiTags("admin")
@ApiBearerAuth("JWT")
@Controller("admin")
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private billing: BillingService,
  ) {}

  @Get("payments/pending")
  @ApiOperation({ summary: "List pending bank payments" })
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
  @ApiOperation({ summary: "Approve or reject a bank payment" })
  verify(
    @CurrentUser() admin: AuthUser,
    @Param("id") id: string,
    @Body() dto: VerifyBankDto,
  ) {
    return this.billing.verifyBankPayment(admin.id, id, dto.approve);
  }

  @Get("users")
  @ApiOperation({ summary: "List recent users (paginated)" })
  async users(@Query("page") page?: string, @Query("limit") limit?: string) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
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
      }),
      this.prisma.user.count(),
    ]);
    return {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }
}
