import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { join } from "path";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { MailModule } from "./mail/mail.module";
import { MessagingModule } from "./messaging/messaging.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { AgentsModule } from "./agents/agents.module";
import { PropertiesModule } from "./properties/properties.module";
import { LeadsModule } from "./leads/leads.module";
import { BillingModule } from "./billing/billing.module";
import { SanityModule } from "./sanity/sanity.module";
import { AdminModule } from "./admin/admin.module";
import { HealthModule } from "./health/health.module";

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
