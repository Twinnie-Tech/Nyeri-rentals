import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role, SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AgentOnboardingDto, UpdateAgentDto } from "./agents.dto";

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) {}

  private async assertActivePlan(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.roles.includes(Role.ADMIN)) return;

    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    const active =
      sub?.status === SubscriptionStatus.ACTIVE &&
      (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());
    if (!active) {
      throw new ForbiddenException("Active agent subscription required");
    }
  }

  async ensureAgent(userId: string) {
    await this.assertActivePlan(userId);
    const existing = await this.prisma.agent.findUnique({ where: { userId } });
    if (existing) return existing;

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const agent = await this.prisma.agent.create({
      data: {
        userId,
        name: user.name || "Agent",
        email: user.email || `${user.phone || user.id}@agents.greenkey.local`,
        phone: user.phone || undefined,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: { set: Array.from(new Set([...user.roles, Role.AGENT])) },
      },
    });

    return agent;
  }

  async completeOnboarding(userId: string, dto: AgentOnboardingDto) {
    await this.assertActivePlan(userId);
    let agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) {
      agent = await this.ensureAgent(userId);
    }

    return this.prisma.agent.update({
      where: { id: agent.id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        bio: dto.bio,
        licenseNumber: dto.licenseNumber,
        agency: dto.agency,
        onboardingComplete: true,
      },
    });
  }

  async getMine(userId: string) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new NotFoundException("Agent profile not found");
    return agent;
  }

  async updateMine(userId: string, dto: UpdateAgentDto) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new NotFoundException("Agent profile not found");
    return this.prisma.agent.update({
      where: { id: agent.id },
      data: dto,
    });
  }
}
