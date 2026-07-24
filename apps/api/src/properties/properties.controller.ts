import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PropertiesService } from "./properties.service";
import { PropertyQueryDto, UpsertPropertyMirrorDto } from "./properties.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { AgentPlanGuard } from "../common/guards/agent-plan.guard";

@Controller("properties")
export class PropertiesController {
  constructor(private properties: PropertiesService) {}

  @Public()
  @Get()
  list(@Query() query: PropertyQueryDto) {
    return this.properties.list(query);
  }

  @Get("mine/list")
  @UseGuards(AgentPlanGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.properties.listMine(user.id);
  }

  @Post("mirror")
  @UseGuards(AgentPlanGuard)
  upsert(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertPropertyMirrorDto,
  ) {
    return this.properties.upsertMirror(user.id, dto);
  }

  @Public()
  @Get(":id")
  get(@Param("id") id: string) {
    return this.properties.getByIdOrSanity(id);
  }
}
