import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  type AuthUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { AgentPlanGuard } from "../common/guards/agent-plan.guard";
import type { AgentOnboardingDto, UpdateAgentDto } from "./agents.dto";
import type { AgentsService } from "./agents.service";

@ApiTags("agents")
@ApiBearerAuth("JWT")
@Controller("agents")
export class AgentsController {
  constructor(private agents: AgentsService) {}

  @Post("ensure")
  @UseGuards(AgentPlanGuard)
  @ApiOperation({
    summary: "Ensure agent record exists (active plan required)",
  })
  ensure(@CurrentUser() user: AuthUser) {
    return this.agents.ensureAgent(user.id);
  }

  @Post("onboarding")
  @UseGuards(AgentPlanGuard)
  @ApiOperation({ summary: "Complete agent onboarding" })
  onboarding(@CurrentUser() user: AuthUser, @Body() dto: AgentOnboardingDto) {
    return this.agents.completeOnboarding(user.id, dto);
  }

  @Get("me")
  @ApiOperation({ summary: "Get my agent profile" })
  me(@CurrentUser() user: AuthUser) {
    return this.agents.getMine(user.id);
  }

  @Patch("me")
  @ApiOperation({ summary: "Update my agent profile" })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateAgentDto) {
    return this.agents.updateMine(user.id, dto);
  }
}
