export type InvoicePayment = {
  id: string;
  method: "MPESA" | "BANK";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  amountKes: number;
  currency: string;
  planCode: string;
  phone: string | null;
  mpesaReceipt: string | null;
  mpesaCheckoutId: string | null;
  bankReference: string | null;
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
};

export function invoiceTypeLabel(method: InvoicePayment["method"]) {
  return method === "MPESA" ? "M-Pesa payment" : "Bank transfer";
}

export function invoiceNumber(payment: InvoicePayment) {
  if (payment.mpesaReceipt) return payment.mpesaReceipt;
  if (payment.bankReference) return payment.bankReference;
  return payment.id.slice(0, 10).toUpperCase();
}

export function invoiceStatusLabel(status: InvoicePayment["status"]) {
  switch (status) {
    case "COMPLETED":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}
