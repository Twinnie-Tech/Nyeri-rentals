import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import type { SanityService } from "./sanity.service";

@ApiTags("sanity")
@Controller("sanity")
export class SanityController {
  constructor(private sanity: SanityService) {}

  @Public()
  @Get("status")
  @ApiOperation({ summary: "Whether Sanity write token is configured" })
  status() {
    return { writeConfigured: this.sanity.isConfigured() };
  }
}
