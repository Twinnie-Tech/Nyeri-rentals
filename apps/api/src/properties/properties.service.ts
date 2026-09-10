import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ListingStatus, type Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SanityService } from "../sanity/sanity.service";
import {
  CreatePropertyDto,
  PropertyQueryDto,
  UpdatePropertyDto,
  UpsertPropertyMirrorDto,
} from "./properties.dto";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

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
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private sanity: SanityService,
  ) {}

  async list(query: PropertyQueryDto) {
    const { page, limit, skip } = paginate(query.page, query.limit);
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

    const [items, total] = await Promise.all([
      this.prisma.propertyMirror.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.propertyMirror.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getByIdOrSanity(id: string) {
    const property =
      (await this.prisma.propertyMirror.findUnique({ where: { id } })) ||
      (await this.prisma.propertyMirror.findUnique({
        where: { sanityId: id },
      }));
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

  async listMine(userId: string, page?: number, limit?: number) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    const where: Prisma.PropertyMirrorWhereInput = {
      OR: [{ ownerUserId: userId }, ...(agent ? [{ agentId: agent.id }] : [])],
    };
    const p = paginate(page, limit);
    const [items, total] = await Promise.all([
      this.prisma.propertyMirror.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: p.skip,
        take: p.limit,
      }),
      this.prisma.propertyMirror.count({ where }),
    ]);
    return {
      items,
      page: p.page,
      limit: p.limit,
      total,
      totalPages: Math.ceil(total / p.limit) || 1,
    };
  }

  async deleteMirror(userId: string, sanityId: string) {
    const property = await this.prisma.propertyMirror.findUnique({
      where: { sanityId },
    });
    if (!property) throw new NotFoundException("Property mirror not found");

    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    const owns =
      property.ownerUserId === userId ||
      (agent && property.agentId === agent.id);
    if (!owns) throw new ForbiddenException("Not your property");

    await this.prisma.propertyMirror.delete({ where: { sanityId } });
    return { deleted: true, sanityId };
  }

  private async requireSanityAgentId(userId: string) {
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (!agent) throw new ForbiddenException("Agent profile required");

    if (agent.sanityId) return { agent, sanityAgentId: agent.sanityId };

    const found = await this.sanity.query<string | null>(
      `*[_type == "agent" && userId == $userId][0]._id`,
      { userId },
    );
    if (found) {
      await this.prisma.agent.update({
        where: { id: agent.id },
        data: { sanityId: found },
      });
      return { agent, sanityAgentId: found };
    }

    throw new ForbiddenException(
      "Sanity agent document missing. Complete agent ensure/onboarding first.",
    );
  }

  private toSanityImages(images?: CreatePropertyDto["images"]) {
    return (images || []).map((img) => ({
      _type: "image",
      _key: img._key,
      asset: {
        _type: "reference",
        _ref: img.assetRef,
      },
    }));
  }

  /** Category-specific + extra fields kept in Postgres for mobile/BFF reads. */
  private toMirrorDetails(dto: CreatePropertyDto | UpdatePropertyDto) {
    return {
      landSize: dto.landSize ?? null,
      landSizeAcres: dto.landSizeAcres ?? null,
      landPurpose: dto.landPurpose ?? null,
      furnished: dto.furnished ?? null,
      depositAmount: dto.depositAmount ?? null,
      availableFrom: dto.availableFrom ?? null,
      petsAllowed: dto.petsAllowed ?? null,
      titleDeedReady: dto.titleDeedReady ?? null,
      serviceCharge: dto.serviceCharge ?? null,
      originalPrice: dto.originalPrice ?? null,
      openHouseDate: dto.openHouseDate ?? null,
      maxGuests: dto.maxGuests ?? null,
      minNights: dto.minNights ?? null,
      cleaningFee: dto.cleaningFee ?? null,
      checkInTime: dto.checkInTime ?? null,
      checkOutTime: dto.checkOutTime ?? null,
      hasPool: dto.hasPool ?? null,
      hasStaffQuarters: dto.hasStaffQuarters ?? null,
      hasGarden: dto.hasGarden ?? null,
      hasBackupPower: dto.hasBackupPower ?? null,
      roadAccess: dto.roadAccess ?? null,
      fenced: dto.fenced ?? null,
      waterSource: dto.waterSource ?? null,
      cropsSuitable: dto.cropsSuitable ?? null,
      parkingSpaces: dto.parkingSpaces ?? null,
    };
  }

  private toMirrorData(
    userId: string,
    agentId: string | undefined,
    sanityId: string,
    dto: CreatePropertyDto | UpdatePropertyDto,
    status: ListingStatus,
  ) {
    return {
      sanityId,
      title: dto.title,
      slug: slugify(dto.title),
      description: dto.description,
      listingCategory: dto.listingCategory,
      propertyType: dto.propertyType,
      status,
      price: dto.price,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      squareFeet: dto.squareFeet,
      yearBuilt: dto.yearBuilt ?? null,
      street: dto.address.street,
      city: dto.address.city,
      county: dto.address.state,
      zipCode: dto.address.zipCode || null,
      latitude: dto.location?.lat ?? null,
      longitude: dto.location?.lng ?? null,
      amenities: dto.amenities || [],
      images: (dto.images || []) as unknown as Prisma.InputJsonValue,
      details: this.toMirrorDetails(dto) as unknown as Prisma.InputJsonValue,
      ownerUserId: userId,
      agentId,
    };
  }

  private toSanityDoc(
    dto: CreatePropertyDto | UpdatePropertyDto,
    sanityAgentId: string,
    status: string,
  ) {
    const now = new Date().toISOString();
    return {
      _type: "property",
      title: dto.title,
      slug: { _type: "slug", current: slugify(dto.title) },
      description: dto.description,
      price: dto.price,
      listingCategory: dto.listingCategory,
      propertyType: dto.propertyType,
      landSize: dto.landSize,
      landSizeAcres: dto.landSizeAcres,
      landPurpose: dto.landPurpose,
      furnished: dto.furnished,
      depositAmount: dto.depositAmount,
      availableFrom: dto.availableFrom,
      petsAllowed: dto.petsAllowed,
      titleDeedReady: dto.titleDeedReady,
      serviceCharge: dto.serviceCharge,
      originalPrice: dto.originalPrice,
      openHouseDate: dto.openHouseDate,
      maxGuests: dto.maxGuests,
      minNights: dto.minNights,
      cleaningFee: dto.cleaningFee,
      checkInTime: dto.checkInTime,
      checkOutTime: dto.checkOutTime,
      hasPool: dto.hasPool,
      hasStaffQuarters: dto.hasStaffQuarters,
      hasGarden: dto.hasGarden,
      hasBackupPower: dto.hasBackupPower,
      roadAccess: dto.roadAccess,
      fenced: dto.fenced,
      waterSource: dto.waterSource,
      cropsSuitable: dto.cropsSuitable,
      parkingSpaces: dto.parkingSpaces,
      status,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      squareFeet: dto.squareFeet,
      yearBuilt: dto.yearBuilt,
      address: {
        street: dto.address.street,
        city: dto.address.city,
        state: dto.address.state,
        zipCode: dto.address.zipCode || "",
      },
      location: dto.location
        ? {
            _type: "geopoint",
            lat: dto.location.lat,
            lng: dto.location.lng,
          }
        : undefined,
      amenities: dto.amenities || [],
      images: this.toSanityImages(dto.images),
      agent: { _type: "reference", _ref: sanityAgentId },
      featured: false,
      updatedAt: now,
    };
  }

  async createListing(userId: string, dto: CreatePropertyDto) {
    const { agent, sanityAgentId } = await this.requireSanityAgentId(userId);
    const status = dto.status || ListingStatus.active;
    const doc = {
      ...this.toSanityDoc(dto, sanityAgentId, status),
      createdAt: new Date().toISOString(),
    };
    const created = await this.sanity.createDocument(doc);
    const sanityId = created._id as string;

    const mirrorData = this.toMirrorData(
      userId,
      agent.id,
      sanityId,
      dto,
      status,
    );

    const mirror = await this.prisma.propertyMirror.upsert({
      where: { sanityId },
      create: {
        ...mirrorData,
        publishedAt: status === ListingStatus.active ? new Date() : null,
      },
      update: {
        ...mirrorData,
        ...(status === ListingStatus.active ? { publishedAt: new Date() } : {}),
      },
    });

    return { id: sanityId, mirror };
  }

  private async assertOwnsSanityListing(userId: string, sanityId: string) {
    const mirror = await this.prisma.propertyMirror.findUnique({
      where: { sanityId },
    });
    const agent = await this.prisma.agent.findUnique({ where: { userId } });
    if (
      mirror &&
      (mirror.ownerUserId === userId || (agent && mirror.agentId === agent.id))
    ) {
      return { mirror, agent };
    }

    // Fallback: verify agent ref in Sanity when mirror missing
    const { sanityAgentId } = await this.requireSanityAgentId(userId);
    const ref = await this.sanity.query<string | null>(
      `*[_type == "property" && _id == $id][0].agent._ref`,
      { id: sanityId },
    );
    if (ref !== sanityAgentId) {
      throw new ForbiddenException("Unauthorized");
    }
    return { mirror, agent };
  }

  async updateListing(
    userId: string,
    sanityId: string,
    dto: UpdatePropertyDto,
  ) {
    const { agent } = await this.assertOwnsSanityListing(userId, sanityId);
    const { sanityAgentId } = await this.requireSanityAgentId(userId);
    const status = dto.status || ListingStatus.active;
    const set = this.toSanityDoc(dto, sanityAgentId, status);
    await this.sanity.patchDocument(sanityId, set);

    const mirrorData = this.toMirrorData(
      userId,
      agent?.id,
      sanityId,
      dto,
      status,
    );

    const mirror = await this.prisma.propertyMirror.upsert({
      where: { sanityId },
      create: mirrorData,
      update: mirrorData,
    });

    return { id: sanityId, mirror };
  }

  async updateStatus(userId: string, sanityId: string, status: ListingStatus) {
    await this.assertOwnsSanityListing(userId, sanityId);
    await this.sanity.patchDocument(sanityId, {
      status,
      updatedAt: new Date().toISOString(),
    });

    const existing = await this.prisma.propertyMirror.findUnique({
      where: { sanityId },
    });
    if (existing) {
      return this.prisma.propertyMirror.update({
        where: { sanityId },
        data: { status },
      });
    }
    return { sanityId, status };
  }

  async deleteListing(userId: string, sanityId: string) {
    await this.assertOwnsSanityListing(userId, sanityId);
    await this.sanity.deleteDocument(sanityId);
    await this.prisma.propertyMirror
      .delete({ where: { sanityId } })
      .catch(() => null);
    return { deleted: true, sanityId };
  }
}
