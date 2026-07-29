import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PropertiesService } from "./properties.service";
import { PropertyQueryDto, UpsertPropertyMirrorDto } from "./properties.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { AgentPlanGuard } from "../common/guards/agent-plan.guard";

@ApiTags("properties")
@Controller("properties")
export class PropertiesController {
  constructor(private properties: PropertiesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List property mirrors (filters)" })
  list(@Query() query: PropertyQueryDto) {
    return this.properties.list(query);
  }

  @Get("mine/list")
  @ApiBearerAuth("JWT")
  @UseGuards(AgentPlanGuard)
  @ApiOperation({ summary: "List my property mirrors" })
  mine(@CurrentUser() user: AuthUser) {
    return this.properties.listMine(user.id);
  }

  @Post("mirror")
  @ApiBearerAuth("JWT")
  @UseGuards(AgentPlanGuard)
  @ApiOperation({ summary: "Upsert property mirror from Sanity id" })
  upsert(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertPropertyMirrorDto,
  ) {
    return this.properties.upsertMirror(user.id, dto);
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Get property by id or Sanity id" })
  get(@Param("id") id: string) {
    return this.properties.getByIdOrSanity(id);
  }
}
