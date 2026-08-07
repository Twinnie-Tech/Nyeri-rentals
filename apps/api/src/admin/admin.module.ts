import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { AdminController } from "./admin.controller";

@Module({
  imports: [BillingModule],
  controllers: [AdminController],
})
export class AdminModule {}
