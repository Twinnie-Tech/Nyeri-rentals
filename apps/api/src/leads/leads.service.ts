import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { LeadStatus } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import type { SanityService } from "../sanity/sanity.service";
import type { CreateLeadDto, UpdateLeadStatusDto } from "./leads.dto";

function paginate(page?: number, limit?: number) {
  const safePage = Math.max(1, page || 1);
  const safeLimit = Math.min(100, Math.max(1, limit || 20));
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private sanity: SanityService,
  ) {}

  async create(buyerUserId: string | undefined, dto: CreateLeadDto) {
    let propertyId: string | undefined;
    let agentId: string | undefined;
    let sanityAgentId: string | undefined;
    let propertySanityRef = dto.propertyId;

    if (dto.propertyId) {
      const property =
        (await this.prisma.propertyMirror.findUnique({
          where: { id: dto.propertyId },
        })) ||
        (await this.prisma.propertyMirror.findUnique({
          where: { sanityId: dto.propertyId },
        }));

      if (property) {
        propertyId = property.id;
        propertySanityRef = property.sanityId;
        agentId = property.agentId || undefined;
        if (agentId) {
          const agent = await this.prisma.agent.findUnique({
            where: { id: agentId },
          });
          sanityAgentId = agent?.sanityId || undefined;
        }
      }

      if (!sanityAgentId) {
        sanityAgentId =
          (await this.sanity.query<string | null>(
            `*[_type == "property" && _id == $id][0].agent._ref`,
            { id: propertySanityRef },
          )) || undefined;
      }

      if (!sanityAgentId) {
        throw new NotFoundException("Property or agent not found");
      }

      if (!agentId && sanityAgentId) {
        const linked = await this.prisma.agent.findFirst({
          where: { sanityId: sanityAgentId },
        });
        agentId = linked?.id;
      }
    }

    let sanityId = dto.sanityId;
    if (!sanityId && propertySanityRef && sanityAgentId) {
      const created = await this.sanity.createDocument({
        _type: "lead",
        property: {
          _type: "reference",
          _ref: propertySanityRef,
        },
        agent: { _type: "reference", _ref: sanityAgentId },
        buyerName: dto.name,
        buyerEmail: dto.email || "",
        buyerPhone: dto.phone,
        message: dto.message || "Interested in this property",
        status: "new",
        createdAt: new Date().toISOString(),
      });
      sanityId = created._id as string;
    }

    return this.prisma.lead.create({
      data: {
        propertyId,
        agentId,
        buyerUserId,
        sanityId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
      },
    });
  }

  async listForAgent(userId: string, page?: number, limit?: number) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new ForbiddenException("Not an agent");
    const p = paginate(page, limit);
    const where = { agentId: agent.id };
    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: { property: true },
        orderBy: { createdAt: "desc" },
        skip: p.skip,
        take: p.limit,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return {
      items,
      page: p.page,
      limit: p.limit,
      total,
      totalPages: Math.ceil(total / p.limit) || 1,
    };
  }

  async updateStatus(userId: string, leadId: string, dto: UpdateLeadStatusDto) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new ForbiddenException("Not an agent");

    const lead =
      (await this.prisma.lead.findUnique({ where: { id: leadId } })) ||
      (await this.prisma.lead.findUnique({ where: { sanityId: leadId } }));

    const sanityStatus =
      dto.status === LeadStatus.closed
        ? "closed"
        : dto.status === LeadStatus.contacted
          ? "contacted"
          : "new";

    if (lead) {
      if (lead.agentId !== agent.id) {
        throw new NotFoundException("Lead not found");
      }
      if (lead.sanityId) {
        await this.sanity
          .patchDocument(lead.sanityId, { status: sanityStatus })
          .catch(() => null);
      }
      return this.prisma.lead.update({
        where: { id: lead.id },
        data: { status: dto.status },
      });
    }

    // Sanity-only lead (e.g. Studio/seed) — verify agent ownership then patch
    const sanityAgentId =
      agent.sanityId ||
      (await this.sanity.query<string | null>(
        `*[_type == "agent" && userId == $userId][0]._id`,
        { userId },
      ));
    const ref = await this.sanity.query<string | null>(
      `*[_type == "lead" && _id == $id][0].agent._ref`,
      { id: leadId },
    );
    if (!sanityAgentId || ref !== sanityAgentId) {
      throw new NotFoundException("Lead not found");
    }
    await this.sanity.patchDocument(leadId, { status: sanityStatus });
    return { id: leadId, status: dto.status, sanityOnly: true };
  }
}
