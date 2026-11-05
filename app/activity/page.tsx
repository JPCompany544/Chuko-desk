import { ActivityFeed } from "@/components/ActivityFeed";
import { PageHeader } from "@/components/PageHeader";

export default function ActivityPage() {
  return (
    <>
      <PageHeader
        kicker="Activity"
        title="Deposits and withdrawals."
        lede="Sells are crypto deposits. Buys are stablecoin withdrawals. Fiat payouts stay in the same list."
      />
      <ActivityFeed />
    </>
  );
}
