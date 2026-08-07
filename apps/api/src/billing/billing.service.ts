import { createHash } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import {
  PaymentMethod,
  PaymentStatus,
  Role,
  SubscriptionStatus,
} from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import type { RedisService } from "../redis/redis.service";
import type { BankTransferDto, StkPushDto } from "./billing.dto";

function normalizeMpesaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("+254")) return digits.slice(1);
  return digits;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private config: ConfigService,
  ) {}

  getPlan() {
    return {
      code: "agent",
      name: "Agent Plan",
      amountKes: Number(this.config.get("AGENT_PLAN_AMOUNT_KES") || 2500),
      periodDays: Number(this.config.get("AGENT_PLAN_DAYS") || 30),
      currency: "KES",
      bank: {
        name: this.config.get("BANK_NAME") || "Equity Bank",
        accountName: this.config.get("BANK_ACCOUNT_NAME") || "GreenKey Realty",
        accountNumber: this.config.get("BANK_ACCOUNT_NUMBER") || "",
        branch: this.config.get("BANK_BRANCH") || "",
      },
    };
  }

  async getSubscription(userId: string) {
    return this.prisma.subscription.findUnique({ where: { userId } });
  }

  async listPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async initiateStk(userId: string, dto: StkPushDto) {
    const amount = Number(this.config.get("AGENT_PLAN_AMOUNT_KES") || 2500);
    const phone = normalizeMpesaPhone(dto.phone);
    const idem =
      dto.idempotencyKey ||
      createHash("sha256")
        .update(`${userId}:${phone}:${Date.now()}`)
        .digest("hex")
        .slice(0, 32);

    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: idem },
    });
    if (existing) return existing;

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        method: PaymentMethod.MPESA,
        status: PaymentStatus.PENDING,
        amountKes: amount,
        phone,
        idempotencyKey: idem,
        planCode: "agent",
      },
    });

    await this.prisma.subscription.update({
      where: { userId },
      data: { status: SubscriptionStatus.PENDING },
    });

    const consumerKey = this.config.get<string>("MPESA_CONSUMER_KEY");
    const consumerSecret = this.config.get<string>("MPESA_CONSUMER_SECRET");
    const passkey = this.config.get<string>("MPESA_PASSKEY");

    // Sandbox/dev without credentials: simulate pending STK
    if (!consumerKey || !consumerSecret || !passkey) {
      this.logger.warn(
        `M-Pesa credentials missing — payment ${payment.id} left PENDING (dev mode)`,
      );
      return {
        payment,
        message:
          "STK Push simulated (set MPESA_* env vars for real Daraja). Complete via admin or callback simulator.",
        simulated: true,
      };
    }

    try {
      const token = await this.getMpesaToken();
      const shortcode = this.config.get("MPESA_SHORTCODE") || "174379";
      const timestamp = this.timestamp();
      const password = Buffer.from(
        `${shortcode}${passkey}${timestamp}`,
      ).toString("base64");
      const callbackUrl =
        this.config.get("MPESA_CALLBACK_URL") ||
        "http://localhost:4000/v1/billing/mpesa/callback";

      const env = this.config.get("MPESA_ENV") || "sandbox";
      const base =
        env === "production"
          ? "https://api.safaricom.co.ke"
          : "https://sandbox.safaricom.co.ke";

      const res = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: phone,
          PartyB: shortcode,
          PhoneNumber: phone,
          CallBackURL: callbackUrl,
          AccountReference:
            this.config.get("MPESA_ACCOUNT_REFERENCE") || "GreenKeyAgent",
          TransactionDesc: "GreenKey Agent Plan",
        }),
      });

      const data = (await res.json()) as {
        CheckoutRequestID?: string;
        MerchantRequestID?: string;
        ResponseCode?: string;
        ResponseDescription?: string;
        errorMessage?: string;
      };

      if (!res.ok || data.ResponseCode !== "0") {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: data.errorMessage || data.ResponseDescription,
            metadata: data as object,
          },
        });
        throw new BadRequestException(
          data.errorMessage || data.ResponseDescription || "STK Push failed",
        );
      }

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PROCESSING,
          mpesaCheckoutId: data.CheckoutRequestID,
          mpesaMerchantReq: data.MerchantRequestID,
          metadata: data as object,
        },
      });

      return { payment: updated, simulated: false };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(err);
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: "STK request error",
        },
      });
      throw new BadRequestException("Could not initiate M-Pesa payment");
    }
  }

  async handleMpesaCallback(body: unknown) {
    const payload = body as {
      Body?: {
        stkCallback?: {
          CheckoutRequestID?: string;
          ResultCode?: number;
          ResultDesc?: string;
          CallbackMetadata?: {
            Item?: Array<{ Name: string; Value?: string | number }>;
          };
        };
      };
    };

    const cb = payload?.Body?.stkCallback;
    if (!cb?.CheckoutRequestID) {
      return { ResultCode: 0, ResultDesc: "Accepted" };
    }

    const lockKey = `mpesa:cb:${cb.CheckoutRequestID}`;
    const locked = await this.redis.client.set(lockKey, "1", "EX", 60, "NX");
    if (locked !== "OK") {
      return { ResultCode: 0, ResultDesc: "Duplicate ignored" };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { mpesaCheckoutId: cb.CheckoutRequestID },
    });
    if (!payment) {
      this.logger.warn(`Unknown CheckoutRequestID ${cb.CheckoutRequestID}`);
      return { ResultCode: 0, ResultDesc: "Accepted" };
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return { ResultCode: 0, ResultDesc: "Already completed" };
    }

    if (cb.ResultCode !== 0) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: cb.ResultDesc,
          metadata: payload as object,
        },
      });
      return { ResultCode: 0, ResultDesc: "Accepted" };
    }

    const items = cb.CallbackMetadata?.Item || [];
    const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;

    await this.activateSubscription(payment.userId, payment.id, {
      mpesaReceipt: receipt ? String(receipt) : undefined,
      metadata: payload as object,
    });

    return { ResultCode: 0, ResultDesc: "Accepted" };
  }

  async submitBankTransfer(userId: string, dto: BankTransferDto) {
    const amount = Number(this.config.get("AGENT_PLAN_AMOUNT_KES") || 2500);
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        method: PaymentMethod.BANK,
        status: PaymentStatus.PENDING,
        amountKes: amount,
        bankReference: dto.bankReference,
        bankProofUrl: dto.bankProofUrl,
        phone: dto.phone,
        planCode: "agent",
      },
    });

    await this.prisma.subscription.update({
      where: { userId },
      data: { status: SubscriptionStatus.PENDING },
    });

    return {
      payment,
      message: "Bank transfer submitted. An admin will verify payment.",
    };
  }

  async verifyBankPayment(
    adminId: string,
    paymentId: string,
    approve: boolean,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.method !== PaymentMethod.BANK) {
      throw new BadRequestException("Not a bank payment");
    }

    if (!approve) {
      return this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CANCELLED,
          verifiedByAdminId: adminId,
          verifiedAt: new Date(),
          failureReason: "Rejected by admin",
        },
      });
    }

    await this.activateSubscription(payment.userId, payment.id, {
      verifiedByAdminId: adminId,
    });
    return this.prisma.payment.findUnique({ where: { id: paymentId } });
  }

  /** Dev helper: mark simulated M-Pesa as paid */
  async simulateComplete(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    await this.activateSubscription(userId, paymentId, {
      mpesaReceipt: `DEV${Date.now()}`,
    });
    return this.getSubscription(userId);
  }

  private async activateSubscription(
    userId: string,
    paymentId: string,
    extras: {
      mpesaReceipt?: string;
      verifiedByAdminId?: string;
      metadata?: object;
    } = {},
  ) {
    const days = Number(this.config.get("AGENT_PLAN_DAYS") || 30);
    const start = new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          mpesaReceipt: extras.mpesaReceipt,
          verifiedByAdminId: extras.verifiedByAdminId,
          verifiedAt: extras.verifiedByAdminId ? new Date() : undefined,
          metadata: extras.metadata as object | undefined,
        },
      }),
      this.prisma.subscription.update({
        where: { userId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          planCode: "agent",
          currentPeriodStart: start,
          currentPeriodEnd: end,
        },
      }),
    ]);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!user.roles.includes(Role.AGENT)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { roles: { set: [...user.roles, Role.AGENT] } },
      });
    }
  }

  private timestamp() {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return (
      `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
      `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
    );
  }

  private async getMpesaToken(): Promise<string> {
    const cacheKey = "mpesa:token";
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const key = this.config.get<string>("MPESA_CONSUMER_KEY");
    const secret = this.config.get<string>("MPESA_CONSUMER_SECRET");
    const env = this.config.get("MPESA_ENV") || "sandbox";
    const base =
      env === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";

    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    const res = await fetch(
      `${base}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` } },
    );
    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: string;
    };
    if (!data.access_token) {
      throw new BadRequestException("Could not obtain M-Pesa token");
    }
    const ttl = Math.max(60, Number(data.expires_in || 3599) - 60);
    await this.redis.set(cacheKey, data.access_token, ttl);
    return data.access_token;
  }
}
