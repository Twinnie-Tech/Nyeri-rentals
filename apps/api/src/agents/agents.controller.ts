import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { AgentsService } from "./agents.service";
import { AgentOnboardingDto, UpdateAgentDto } from "./agents.dto";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { AgentPlanGuard } from "../common/guards/agent-plan.guard";

@Controller("agents")
export class AgentsController {
  constructor(private agents: AgentsService) {}

  @Post("ensure")
  @UseGuards(AgentPlanGuard)
  ensure(@CurrentUser() user: AuthUser) {
    return this.agents.ensureAgent(user.id);
  }

  @Post("onboarding")
  @UseGuards(AgentPlanGuard)
  onboarding(@CurrentUser() user: AuthUser, @Body() dto: AgentOnboardingDto) {
    return this.agents.completeOnboarding(user.id, dto);
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.agents.getMine(user.id);
  }

  @Patch("me")
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateAgentDto) {
    return this.agents.updateMine(user.id, dto);
  }
}
