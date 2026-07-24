import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLeadDto, UpdateLeadStatusDto } from "./leads.dto";

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async create(buyerUserId: string | undefined, dto: CreateLeadDto) {
    let propertyId: string | undefined;
    let agentId: string | undefined;

    if (dto.propertyId) {
      const property =
        (await this.prisma.propertyMirror.findUnique({
          where: { id: dto.propertyId },
        })) ||
        (await this.prisma.propertyMirror.findUnique({
          where: { sanityId: dto.propertyId },
        }));
      if (!property) throw new NotFoundException("Property not found");
      propertyId = property.id;
      agentId = property.agentId || undefined;
    }

    return this.prisma.lead.create({
      data: {
        propertyId,
        agentId,
        buyerUserId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
      },
    });
  }

  async listForAgent(userId: string) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new ForbiddenException("Not an agent");
    return this.prisma.lead.findMany({
      where: { agentId: agent.id },
      include: { property: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(userId: string, leadId: string, dto: UpdateLeadStatusDto) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new ForbiddenException("Not an agent");

    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.agentId !== agent.id) {
      throw new NotFoundException("Lead not found");
    }

    return this.prisma.lead.update({
      where: { id: leadId },
      data: { status: dto.status },
    });
  }
}
