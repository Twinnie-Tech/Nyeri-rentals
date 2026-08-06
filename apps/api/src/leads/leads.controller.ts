import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { LeadsService } from "./leads.service";
import { CreateLeadDto, UpdateLeadStatusDto } from "./leads.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { AgentPlanGuard } from "../common/guards/agent-plan.guard";

@ApiTags("leads")
@Controller("leads")
export class LeadsController {
  constructor(private leads: LeadsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: "Create a lead / inquiry" })
  create(@Body() dto: CreateLeadDto, @CurrentUser() user?: AuthUser) {
    return this.leads.create(user?.id, dto);
  }

  @Get("mine")
  @ApiBearerAuth("JWT")
  @UseGuards(AgentPlanGuard)
  @ApiOperation({ summary: "List leads for my agent profile (paginated)" })
  mine(
    @CurrentUser() user: AuthUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.leads.listForAgent(
      user.id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Patch(":id/status")
  @ApiBearerAuth("JWT")
  @UseGuards(AgentPlanGuard)
  @ApiOperation({ summary: "Update lead status" })
  status(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leads.updateStatus(user.id, id, dto);
  }
}
