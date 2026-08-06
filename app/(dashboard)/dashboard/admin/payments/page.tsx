import { redirect } from "next/navigation";
import { AdminPendingPayments } from "@/components/admin/AdminPendingPayments";
import { SectionHeader } from "@/components/ui/section-header";
import { apiFetch } from "@/lib/api/client";
import { getAccessToken, getSessionUser } from "@/lib/api/session";

type PendingPayment = {
  id: string;
  amount: number;
  currency: string;
  bankReference: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  };
};

export default async function AdminPaymentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!user.roles?.includes("ADMIN")) redirect("/dashboard");

  const accessToken = await getAccessToken();
  if (!accessToken) redirect("/sign-in");

  const payments = await apiFetch<PendingPayment[]>(
    "/admin/payments/pending",
    { accessToken },
  ).catch(() => []);

  return (
    <div>
      <SectionHeader
        title="Bank payments"
        subtitle="Approve or reject pending bank transfer subscriptions"
      />
      <AdminPendingPayments initialPayments={payments} />
    </div>
  );
}
