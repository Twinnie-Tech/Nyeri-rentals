import { join } from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AgentsModule } from "./agents/agents.module";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { HealthModule } from "./health/health.module";
import { LeadsModule } from "./leads/leads.module";
import { MailModule } from "./mail/mail.module";
import { MessagingModule } from "./messaging/messaging.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PropertiesModule } from "./properties/properties.module";
import { RedisModule } from "./redis/redis.module";
import { SanityModule } from "./sanity/sanity.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Prefer apps/api/.env whether cwd is monorepo root or apps/api
      envFilePath: [
        join(__dirname, "..", ".env"),
        join(process.cwd(), ".env"),
        join(process.cwd(), "apps", "api", ".env"),
      ],
    }),
    PrismaModule,
    RedisModule,
    MailModule,
    MessagingModule,
    AuthModule,
    UsersModule,
    AgentsModule,
    PropertiesModule,
    LeadsModule,
    BillingModule,
    SanityModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
