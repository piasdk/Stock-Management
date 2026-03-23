import { MainLayout } from "@/components/layout/main-layout";
import { TransactionsOverview } from "@/components/transactions/transactions-overview";

export default function TransactionsPage() {
  return (
    <MainLayout>
      <TransactionsOverview />
    </MainLayout>
  );
}

