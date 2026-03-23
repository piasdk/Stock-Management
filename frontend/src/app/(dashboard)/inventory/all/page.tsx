"use client";

import AllInventory from "@/components/operations/AllInventory";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export default function AllInventoryPage() {
  return (
    <ErrorBoundary>
      <AllInventory />
    </ErrorBoundary>
  );
}

