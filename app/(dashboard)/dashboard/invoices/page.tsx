import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InvoicesTable } from "@/components/dashboard/InvoicesTable";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api/client";
import { getAccessToken, getSessionUser } from "@/lib/api/session";
import type { InvoicePayment } from "@/lib/billing/invoices";

export const metadata = {
  title: "Invoices",
  description: "View agent plan payments and invoices.",
};

export default async function InvoicesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const accessToken = await getAccessToken();
  let payments: InvoicePayment[] = [];

  if (accessToken) {
    try {
      payments = await apiFetch<InvoicePayment[]>("/billing/payments", {
        accessToken,
      });
    } catch {
      payments = [];
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            Billing / <span className="text-foreground">Invoices</span>
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-heading">Invoices</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Payments and receipts for your agent subscription
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/billing">Generate statement</Link>
        </Button>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No invoices yet"
          description="When you pay for the agent plan via M-Pesa or bank transfer, receipts will appear here."
          action={
            <Button asChild>
              <Link href="/dashboard/billing">Go to billing</Link>
            </Button>
          }
        />
      ) : (
        <InvoicesTable initialPayments={payments} />
      )}
    </div>
  );
}
