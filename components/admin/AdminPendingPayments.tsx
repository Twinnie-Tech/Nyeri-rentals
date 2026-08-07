"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export function AdminPendingPayments({
  initialPayments,
}: {
  initialPayments: PendingPayment[];
}) {
  const router = useRouter();
  const [payments, setPayments] = useState(initialPayments);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const formatKes = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(amount);

  const verify = (id: string, approve: boolean) => {
    setBusyId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/payments/${id}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approve }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Verification failed");
        }
        setPayments((prev) => prev.filter((p) => p.id !== id));
        toast.success(approve ? "Payment approved" : "Payment rejected");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Verification failed",
        );
      } finally {
        setBusyId(null);
      }
    });
  };

  if (payments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No pending bank payments.</p>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="w-[200px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                <div className="font-medium">
                  {payment.user.name || "Unnamed"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {payment.user.phone || payment.user.email}
                </div>
              </TableCell>
              <TableCell>{formatKes(payment.amount)}</TableCell>
              <TableCell className="font-mono text-sm">
                {payment.bankReference || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(payment.createdAt).toLocaleString()}
              </TableCell>
              <TableCell className="space-x-2">
                <Button
                  size="sm"
                  disabled={isPending && busyId === payment.id}
                  onClick={() => verify(payment.id, true)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending && busyId === payment.id}
                  onClick={() => verify(payment.id, false)}
                >
                  Reject
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
