import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { BankTransferDto, StkPushDto } from "./billing.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";

@Controller("billing")
export class BillingController {
  constructor(private billing: BillingService) {}

  @Public()
  @Get("plan")
  plan() {
    return this.billing.getPlan();
  }

  @Get("subscription")
  subscription(@CurrentUser() user: AuthUser) {
    return this.billing.getSubscription(user.id);
  }

  @Get("payments")
  payments(@CurrentUser() user: AuthUser) {
    return this.billing.listPayments(user.id);
  }

  @Post("mpesa/stk")
  stk(@CurrentUser() user: AuthUser, @Body() dto: StkPushDto) {
    return this.billing.initiateStk(user.id, dto);
  }

  @Public()
  @Post("mpesa/callback")
  callback(@Body() body: unknown) {
    return this.billing.handleMpesaCallback(body);
  }

  @Post("bank")
  bank(@CurrentUser() user: AuthUser, @Body() dto: BankTransferDto) {
    return this.billing.submitBankTransfer(user.id, dto);
  }

  @Post("mpesa/simulate-complete/:paymentId")
  simulate(
    @CurrentUser() user: AuthUser,
    @Param("paymentId") paymentId: string,
  ) {
    return this.billing.simulateComplete(user.id, paymentId);
  }
}
