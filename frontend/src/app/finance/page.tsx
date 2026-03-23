import { MainLayout } from "@/components/layout/main-layout";
import { FinanceOverview } from "@/components/finance/finance-overview";

export default function FinancePage() {
  return (
    <MainLayout>
      <FinanceOverview />
    </MainLayout>
  );
}

