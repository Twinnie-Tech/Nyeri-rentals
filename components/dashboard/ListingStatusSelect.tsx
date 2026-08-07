"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateListingStatus } from "@/actions/properties";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ListingStatusSelectProps {
  listingId: string;
  currentStatus: string;
}

const statusColors = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  sold: "bg-red-100 text-red-800",
  rented: "bg-blue-100 text-blue-800",
};

export function ListingStatusSelect({
  listingId,
  currentStatus,
}: ListingStatusSelectProps) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (
    newStatus: "active" | "pending" | "sold" | "rented",
  ) => {
    startTransition(async () => {
      try {
        await updateListingStatus(listingId, newStatus);
        toast.success("Status updated");
      } catch {
        toast.error("Failed to update status");
      }
    });
  };

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-[120px]">
        <SelectValue>
          <Badge
            variant="outline"
            className={statusColors[currentStatus as keyof typeof statusColors]}
          >
            {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">
          <Badge variant="outline" className={statusColors.active}>
            Active
          </Badge>
        </SelectItem>
        <SelectItem value="pending">
          <Badge variant="outline" className={statusColors.pending}>
            Pending
          </Badge>
        </SelectItem>
        <SelectItem value="sold">
          <Badge variant="outline" className={statusColors.sold}>
            Sold
          </Badge>
        </SelectItem>
        <SelectItem value="rented">
          <Badge variant="outline" className={statusColors.rented}>
            Rented
          </Badge>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
