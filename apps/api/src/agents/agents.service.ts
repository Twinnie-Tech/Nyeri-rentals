import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role, SubscriptionStatus } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import type { SanityService } from "../sanity/sanity.service";
import type { AgentOnboardingDto, UpdateAgentDto } from "./agents.dto";

@Injectable()
export class AgentsService {
  constructor(
    private prisma: PrismaService,
    private sanity: SanityService,
  ) {}

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

  private async ensureSanityAgent(agent: {
    id: string;
    userId: string;
    name: string;
    email: string;
    phone: string | null;
    bio: string | null;
    licenseNumber: string | null;
    agency: string | null;
    onboardingComplete: boolean;
    sanityId: string | null;
  }) {
    if (agent.sanityId) {
      const exists = await this.sanity.query<string | null>(
        `*[_type == "agent" && _id == $id][0]._id`,
        { id: agent.sanityId },
      );
      if (exists) return agent.sanityId;
    }

    const byUser = await this.sanity.query<string | null>(
      `*[_type == "agent" && userId == $userId][0]._id`,
      { userId: agent.userId },
    );
    if (byUser) {
      await this.prisma.agent.update({
        where: { id: agent.id },
        data: { sanityId: byUser },
      });
      return byUser;
    }

    const created = await this.sanity.createDocument({
      _type: "agent",
      userId: agent.userId,
      name: agent.name,
      email: agent.email,
      phone: agent.phone || "",
      bio: agent.bio || "",
      licenseNumber: agent.licenseNumber || "",
      agency: agent.agency || "",
      onboardingComplete: agent.onboardingComplete,
      createdAt: new Date().toISOString(),
    });

    await this.prisma.agent.update({
      where: { id: agent.id },
      data: { sanityId: created._id as string },
    });

    return created._id as string;
  }

  async ensureAgent(userId: string) {
    await this.assertActivePlan(userId);
    let agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      agent = await this.prisma.agent.create({
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
    }

    const sanityId = await this.ensureSanityAgent(agent);
    return { ...agent, sanityId };
  }

  async completeOnboarding(userId: string, dto: AgentOnboardingDto) {
    await this.assertActivePlan(userId);
    let agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) {
      agent = await this.ensureAgent(userId);
    }

    agent = await this.prisma.agent.update({
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

    const sanityId = await this.ensureSanityAgent(agent);
    await this.sanity.patchDocument(sanityId, {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      bio: dto.bio,
      licenseNumber: dto.licenseNumber,
      agency: dto.agency || "",
      onboardingComplete: true,
    });

    return { ...agent, sanityId };
  }

  async getMine(userId: string) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new NotFoundException("Agent profile not found");
    return agent;
  }

  async updateMine(userId: string, dto: UpdateAgentDto) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new NotFoundException("Agent profile not found");
    const updated = await this.prisma.agent.update({
      where: { id: agent.id },
      data: dto,
    });

    const sanityId = await this.ensureSanityAgent(updated);
    await this.sanity.patchDocument(sanityId, {
      phone: dto.phone,
      bio: dto.bio,
      licenseNumber: dto.licenseNumber,
      agency: dto.agency || "",
    });

    return { ...updated, sanityId };
  }
}
