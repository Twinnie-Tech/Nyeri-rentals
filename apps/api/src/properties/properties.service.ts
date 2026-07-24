import { Injectable, NotFoundException } from "@nestjs/common";
import { ListingStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PropertyQueryDto, UpsertPropertyMirrorDto } from "./properties.dto";

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async list(query: PropertyQueryDto) {
    const where: Prisma.PropertyMirrorWhereInput = {
      status: query.status || ListingStatus.active,
      ...(query.listingCategory
        ? { listingCategory: query.listingCategory }
        : {}),
      ...(query.propertyType ? { propertyType: query.propertyType } : {}),
      ...(query.city
        ? { city: { contains: query.city, mode: "insensitive" } }
        : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { city: { contains: query.q, mode: "insensitive" } },
              { county: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return this.prisma.propertyMirror.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  }

  async getByIdOrSanity(id: string) {
    const property =
      (await this.prisma.propertyMirror.findUnique({ where: { id } })) ||
      (await this.prisma.propertyMirror.findUnique({ where: { sanityId: id } }));
    if (!property) throw new NotFoundException("Property not found");
    return property;
  }

  async upsertMirror(userId: string, dto: UpsertPropertyMirrorDto) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    return this.prisma.propertyMirror.upsert({
      where: { sanityId: dto.sanityId },
      create: {
        ...dto,
        ownerUserId: userId,
        agentId: agent?.id,
        status: dto.status || ListingStatus.draft,
      },
      update: {
        ...dto,
        ownerUserId: userId,
        agentId: agent?.id,
      },
    });
  }

  async listMine(userId: string) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    return this.prisma.propertyMirror.findMany({
      where: {
        OR: [{ ownerUserId: userId }, ...(agent ? [{ agentId: agent.id }] : [])],
      },
      orderBy: { updatedAt: "desc" },
    });
  }
}
