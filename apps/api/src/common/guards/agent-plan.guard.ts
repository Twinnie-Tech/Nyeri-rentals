import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/** Requires USER to have an ACTIVE agent subscription (or ADMIN role). */
@Injectable()
export class AgentPlanGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();
    if (!user?.id) {
      throw new ForbiddenException("Authentication required");
    }

    if (user.roles?.includes("ADMIN")) return true;

    const sub = await this.prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    const active =
      sub?.status === SubscriptionStatus.ACTIVE &&
      (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());

    if (!active) {
      throw new ForbiddenException("Active agent subscription required");
    }
    return true;
  }
}
