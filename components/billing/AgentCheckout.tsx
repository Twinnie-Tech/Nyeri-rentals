"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Plan = {
  code: string;
  name: string;
  amountKes: number;
  periodDays: number;
  bank: {
    name: string;
    accountName: string;
    accountNumber: string;
    branch: string;
  };
};

export function AgentCheckout() {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [phone, setPhone] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"mpesa" | "bank">("mpesa");

  useEffect(() => {
    fetch("/api/billing/plan")
      .then((r) => r.json())
      .then(setPlan)
      .catch(() => setError("Could not load plan"));
  }, []);

  function payMpesa(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/billing/mpesa/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/sign-in?redirect_url=/pricing");
        return;
      }
      if (!res.ok) {
        setError(data.message || "Payment failed");
        return;
      }
      if (data.simulated && data.payment?.id) {
        const done = await fetch(
          `/api/billing/mpesa/simulate-complete/${data.payment.id}`,
          { method: "POST" },
        );
        if (done.ok) {
          setMessage("Dev payment completed. Opening dashboard…");
          router.push("/dashboard");
          router.refresh();
          return;
        }
      }
      setMessage(
        data.message ||
          "STK Push sent. Complete payment on your phone, then open the dashboard.",
      );
    });
  }

  function payBank(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/billing/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankReference: bankRef, phone }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/sign-in?redirect_url=/pricing");
        return;
      }
      if (!res.ok) {
        setError(data.message || "Could not submit transfer");
        return;
      }
      setMessage(data.message || "Submitted for verification.");
    });
  }

  if (!plan) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Loading plan…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-3xl font-heading font-semibold">
          KES {plan.amountKes.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground">
          {plan.name} · every {plan.periodDays} days
        </p>
      </div>

      <div className="flex gap-2 rounded-lg bg-muted p-1">
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "mpesa" ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
          onClick={() => setTab("mpesa")}
        >
          M-Pesa
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "bank" ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
          onClick={() => setTab("bank")}
        >
          Bank transfer
        </button>
      </div>

      {tab === "mpesa" ? (
        <form onSubmit={payMpesa} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mpesa-phone">M-Pesa phone</Label>
            <Input
              id="mpesa-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending STK…" : "Pay with M-Pesa"}
          </Button>
        </form>
      ) : (
        <form onSubmit={payBank} className="space-y-4">
          <div className="rounded-lg bg-secondary/30 p-4 text-sm space-y-1">
            <p>
              <strong>{plan.bank.accountName}</strong>
            </p>
            <p>
              {plan.bank.name}
              {plan.bank.branch ? ` · ${plan.bank.branch}` : ""}
            </p>
            <p className="font-mono">{plan.bank.accountNumber || "Set BANK_ACCOUNT_NUMBER"}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-ref">Transfer reference</Label>
            <Input
              id="bank-ref"
              value={bankRef}
              onChange={(e) => setBankRef(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-phone">Your phone</Label>
            <Input
              id="bank-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Submitting…" : "Submit for verification"}
          </Button>
        </form>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-primary">{message}</p> : null}
    </div>
  );
}
