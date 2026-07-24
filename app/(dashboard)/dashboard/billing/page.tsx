import Link from "next/link";
import { AgentCheckout } from "@/components/billing/AgentCheckout";
import { getSessionUser, hasActiveAgentPlan } from "@/lib/api/session";

export default async function BillingPage() {
  const user = await getSessionUser();
  const active = hasActiveAgentPlan(user);

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-3xl font-bold font-heading">
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground mt-1">
          {active
            ? "Your agent plan is active. Manage renewals with M-Pesa or bank transfer."
            : "Upgrade to Agent to list properties and connect with buyers."}
        </p>
      </div>

      {active && user?.subscription ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm space-y-2">
          <p>
            Status:{" "}
            <strong className="text-foreground">{user.subscription.status}</strong>
          </p>
          {user.subscription.currentPeriodEnd ? (
            <p>
              Renews / ends:{" "}
              {new Date(user.subscription.currentPeriodEnd).toLocaleDateString(
                "en-KE",
              )}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/dashboard/invoices" className="text-primary underline">
              View invoices
            </Link>
            <Link href="/dashboard" className="text-muted-foreground underline">
              Back to dashboard
            </Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-6">
        <AgentCheckout />
      </div>
    </div>
  );
}
