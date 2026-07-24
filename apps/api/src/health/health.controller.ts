import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Public()
  @Get()
  async check() {
    let db = false;
    let redis = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    try {
      const pong = await this.redis.client.ping();
      redis = pong === "PONG";
    } catch {
      redis = false;
    }
    return {
      ok: db && redis,
      db,
      redis,
      service: "greenkey-api",
      ts: new Date().toISOString(),
    };
  }
}
