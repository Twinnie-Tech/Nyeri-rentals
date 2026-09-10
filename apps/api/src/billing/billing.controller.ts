import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  type AuthUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { BankTransferDto, StkPushDto } from "./billing.dto";
import { BillingService } from "./billing.service";

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  constructor(private billing: BillingService) {}

  @Public()
  @Get("plan")
  @ApiOperation({ summary: "Get agent plan pricing & bank details" })
  plan() {
    return this.billing.getPlan();
  }

  @Get("subscription")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Get my subscription status" })
  subscription(@CurrentUser() user: AuthUser) {
    return this.billing.getSubscription(user.id);
  }

  @Get("payments")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "List my payments / invoices" })
  payments(@CurrentUser() user: AuthUser) {
    return this.billing.listPayments(user.id);
  }

  @Post("mpesa/stk")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Initiate M-Pesa STK Push" })
  stk(@CurrentUser() user: AuthUser, @Body() dto: StkPushDto) {
    return this.billing.initiateStk(user.id, dto);
  }

  @Public()
  @Post("mpesa/callback")
  @ApiOperation({ summary: "Daraja STK callback (Safaricom)" })
  callback(@Body() body: unknown) {
    return this.billing.handleMpesaCallback(body);
  }

  @Post("bank")
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Submit bank transfer for verification" })
  bank(@CurrentUser() user: AuthUser, @Body() dto: BankTransferDto) {
    return this.billing.submitBankTransfer(user.id, dto);
  }

  @Post("mpesa/simulate-complete/:paymentId")
  @ApiBearerAuth("JWT")
  @ApiOperation({
    summary:
      "Mark simulated M-Pesa payment as completed (staging/dev; blocked in production unless ALLOW_PAYMENT_SIMULATE=true)",
  })
  simulate(
    @CurrentUser() user: AuthUser,
    @Param("paymentId") paymentId: string,
  ) {
    return this.billing.simulateComplete(user.id, paymentId);
  }
}
