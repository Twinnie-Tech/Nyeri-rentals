import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { LeadsService } from "./leads.service";
import { CreateLeadDto, UpdateLeadStatusDto } from "./leads.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { AgentPlanGuard } from "../common/guards/agent-plan.guard";

@Controller("leads")
export class LeadsController {
  constructor(private leads: LeadsService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateLeadDto, @CurrentUser() user?: AuthUser) {
    return this.leads.create(user?.id, dto);
  }

  @Get("mine")
  @UseGuards(AgentPlanGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.leads.listForAgent(user.id);
  }

  @Patch(":id/status")
  @UseGuards(AgentPlanGuard)
  status(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leads.updateStatus(user.id, id, dto);
  }
}
