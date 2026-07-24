import { Controller, Get } from "@nestjs/common";
import { SanityService } from "./sanity.service";
import { Public } from "../common/decorators/public.decorator";

@Controller("sanity")
export class SanityController {
  constructor(private sanity: SanityService) {}

  @Public()
  @Get("status")
  status() {
    return { writeConfigured: this.sanity.isConfigured() };
  }
}
