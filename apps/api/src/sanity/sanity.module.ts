import { Module } from "@nestjs/common";
import { SanityService } from "./sanity.service";
import { SanityController } from "./sanity.controller";

@Module({
  controllers: [SanityController],
  providers: [SanityService],
  exports: [SanityService],
})
export class SanityModule {}
