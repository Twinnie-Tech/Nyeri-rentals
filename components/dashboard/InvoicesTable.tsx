"use client";

import {
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type InvoicePayment,
  invoiceNumber,
  invoiceStatusLabel,
  invoiceTypeLabel,
} from "@/lib/billing/invoices";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [10, 25, 50, 100] as const;

type SortKey = "date" | "total" | "status" | "type" | "number";

function formatKes(amount: number) {
  return `${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} KES`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function typeBadgeClass(method: InvoicePayment["method"]) {
  return method === "MPESA"
    ? "bg-primary text-primary-foreground border-transparent"
    : "bg-emerald-700 text-white border-transparent";
}

function statusBadgeVariant(
  status: InvoicePayment["status"],
): "success" | "secondary" | "destructive" | "muted" | "outline" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "PENDING":
    case "PROCESSING":
      return "secondary";
    case "FAILED":
    case "CANCELLED":
      return "destructive";
    default:
      return "muted";
  }
}

function downloadCsv(rows: InvoicePayment[]) {
  const header = [
    "Type",
    "Number",
    "Date",
    "Total (KES)",
    "Payment date",
    "Status",
    "Method",
    "Plan",
  ];
  const lines = rows.map((p) =>
    [
      invoiceTypeLabel(p.method),
      invoiceNumber(p),
      formatDate(p.createdAt),
      p.amountKes,
      formatDate(
        p.verifiedAt || (p.status === "COMPLETED" ? p.updatedAt : null),
      ),
      invoiceStatusLabel(p.status),
      p.method,
      p.planCode,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `greenkey-invoices-${formatDate(new Date().toISOString())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type InvoicesTableProps = {
  initialPayments: InvoicePayment[];
};

export function InvoicesTable({ initialPayments }: InvoicesTableProps) {
  const [payments, setPayments] = useState(initialPayments);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "MPESA" | "BANK">("all");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(100);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<InvoicePayment | null>(null);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/billing/payments");
      if (res.ok) {
        const data = (await res.json()) as InvoicePayment[];
        setPayments(data);
      }
    } finally {
      setRefreshing(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" || key === "total" ? "desc" : "asc");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = payments.filter((p) => {
      if (typeFilter !== "all" && p.method !== typeFilter) return false;
      if (!q) return true;
      const hay = [
        invoiceTypeLabel(p.method),
        invoiceNumber(p),
        invoiceStatusLabel(p.status),
        p.phone || "",
        p.planCode,
        String(p.amountKes),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    rows = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "total":
          return (a.amountKes - b.amountKes) * dir;
        case "status":
          return (
            invoiceStatusLabel(a.status).localeCompare(
              invoiceStatusLabel(b.status),
            ) * dir
          );
        case "type":
          return (
            invoiceTypeLabel(a.method).localeCompare(
              invoiceTypeLabel(b.method),
            ) * dir
          );
        case "number":
          return invoiceNumber(a).localeCompare(invoiceNumber(b)) * dir;
        default:
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            dir
          );
      }
    });

    return rows.slice(0, pageSize);
  }, [payments, query, typeFilter, pageSize, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) =>
              setPageSize(Number(v) as (typeof PAGE_SIZES)[number])
            }
          >
            <SelectTrigger className="w-[90px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">entries</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="h-9 pl-9"
              aria-label="Search invoices"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as "all" | "MPESA" | "BANK")}
          >
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="MPESA">M-Pesa</SelectItem>
              <SelectItem value="BANK">Bank transfer</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => refresh()}
            disabled={refreshing}
            aria-label="Refresh invoices"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => downloadCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Export
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {(
                [
                  ["type", "Type"],
                  ["number", "Number"],
                  ["date", "Date"],
                  ["total", "Total"],
                  ["status", "Status"],
                ] as const
              ).map(([key, label]) => (
                <TableHead key={key}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium"
                    onClick={() => toggleSort(key)}
                  >
                    {label}
                    <span className="text-[10px] text-muted-foreground">
                      {sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </TableHead>
              ))}
              <TableHead>Payment date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-28 text-center text-muted-foreground"
                >
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((payment) => {
                const paidAt =
                  payment.verifiedAt ||
                  (payment.status === "COMPLETED" ? payment.updatedAt : null);
                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Badge
                        className={cn(
                          "rounded-md px-2.5 py-1 font-medium",
                          typeBadgeClass(payment.method),
                        )}
                      >
                        {invoiceTypeLabel(payment.method)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {invoiceNumber(payment)}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {formatDate(payment.createdAt)}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">
                      {formatKes(payment.amountKes)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(payment.status)}>
                        {invoiceStatusLabel(payment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-sm text-muted-foreground">
                      {formatDate(paidAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          aria-label="View invoice details"
                          onClick={() => setSelected(payment)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          aria-label="Invoice summary"
                          onClick={() => setSelected(payment)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          aria-label="Download this invoice row"
                          onClick={() => downloadCsv([payment])}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {payments.length} record
        {payments.length === 1 ? "" : "s"}
      </p>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-detail-title"
          onClick={() => setSelected(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelected(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-warm-md"
            role="document"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h2
              id="invoice-detail-title"
              className="text-xl font-heading font-semibold mb-4"
            >
              Invoice detail
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium">
                  {invoiceTypeLabel(selected.method)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Number</dt>
                <dd className="font-mono">{invoiceNumber(selected)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-medium">{formatKes(selected.amountKes)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Status</dt>
                <dd>{invoiceStatusLabel(selected.status)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="capitalize">{selected.planCode}</dd>
              </div>
              {selected.phone ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{selected.phone}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatDate(selected.createdAt)}</dd>
              </div>
            </dl>
            <div className="mt-6 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setSelected(null)}
              >
                Close
              </Button>
              <Button type="button" className="flex-1" asChild>
                <Link href="/dashboard/billing">Manage billing</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
